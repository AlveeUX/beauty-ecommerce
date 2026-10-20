import { randomInt } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  cartItems,
  carts,
  inventory,
  orderEvents,
  orderItems,
  orders,
  payments,
  variants,
} from "@/db/schema";
import { CURRENCY } from "@/config/store";
import type { CheckoutInput } from "@/lib/validation/checkout";
import { getCart } from "@/server/cart/service";
import { queueEmail } from "@/server/email/outbox";
import { METHOD_LABEL, type PaymentGateway } from "@/server/payments/gateway";
import { canTransition, RELEASES_STOCK, STATUS_LABEL, type OrderStatus } from "./state";
import { totalsFor } from "./totals";

export type OrderView = {
  number: string;
  status: OrderStatus;
  paymentMethod: CheckoutInput["paymentMethod"];
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  currency: string;
  email: string;
  createdAt: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  billing: {
    firstName: string;
    lastName: string;
    company: string | null;
    country: string;
    address1: string;
    address2: string | null;
    city: string;
    postcode: string;
    phone: string;
  };
  notes: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  items: {
    slug: string;
    name: string;
    variantLabel: string;
    sku: string;
    image: string | null;
    unitCents: number;
    quantity: number;
    lineCents: number;
  }[];
  events: { status: OrderStatus; at: string; note: string | null }[];
};

export type OrderError = {
  code: "empty_cart" | "stock_changed" | "payment_failed" | "not_found" | "invalid_transition";
  message: string;
  /** Names of the items whose stock no longer covers the cart. */
  items?: string[];
};

export const ORDER_ERROR_STATUS: Record<OrderError["code"], number> = {
  empty_cart: 409,
  stock_changed: 409,
  payment_failed: 402,
  not_found: 404,
  invalid_transition: 409,
};

export type PlaceOrderResult =
  { ok: true; order: OrderView; created: boolean } | { ok: false; error: OrderError };

// OQ-21: "CSM-" plus 8 characters. The alphabet drops look-alikes (0/O, 1/I/L) so the ID can be read aloud.
const ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newOrderNumber(): string {
  let id = "";
  for (let i = 0; i < 8; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return `CSM-${id}`;
}
export const isOrderNumber = (value: unknown): value is string =>
  typeof value === "string" && /^CSM-[A-Z0-9]{8}$/.test(value);

/** Drizzle's transaction object and `Db` share the query API; the cast lets services take either. */
const asDb = (tx: unknown) => tx as Db;

function loadView(db: Db, row: typeof orders.$inferSelect): OrderView {
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, row.id)).all();
  const events = db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, row.id))
    .orderBy(orderEvents.createdAt, orderEvents.id)
    .all();
  return {
    number: row.number,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    currency: row.currency,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    discountCents: row.discountCents,
    totalCents: row.totalCents,
    billing: {
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      country: row.country,
      address1: row.address1,
      address2: row.address2,
      city: row.city,
      postcode: row.postcode,
      phone: row.phone,
    },
    notes: row.notes,
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    items: items.map((i) => ({
      slug: i.productSlug,
      name: i.name,
      variantLabel: i.variantLabel,
      sku: i.sku,
      image: i.image,
      unitCents: i.unitCents,
      quantity: i.quantity,
      lineCents: i.lineCents,
    })),
    events: events.map((e) => ({
      status: e.toStatus as OrderStatus,
      at: e.createdAt.toISOString(),
      note: e.note,
    })),
  };
}

type Attempt =
  | { ok: true; orderId: number; number: string; totalCents: number }
  | { ok: false; error: OrderError };

/** First phase: check the cart against live stock, then record the order and reserve the stock atomically. */
function createPendingOrder(
  db: Db,
  args: { token: string | null; userId: number | null; input: CheckoutInput },
): Attempt {
  const { input } = args;
  try {
    return db.transaction((tx) => {
      const t = asDb(tx);
      const cart = getCart(t, args.token);
      if (cart.lines.length === 0) {
        return {
          ok: false as const,
          error: { code: "empty_cart" as const, message: "Your cart is empty." },
        };
      }
      const short = cart.lines.filter((l) => l.available < l.quantity);
      if (short.length > 0) {
        return {
          ok: false as const,
          error: {
            code: "stock_changed" as const,
            message: "Some items in your cart are no longer available in the quantity you chose.",
            items: short.map((l) => l.name),
          },
        };
      }

      const totals = totalsFor(cart.subtotalCents);
      let number = newOrderNumber();
      while (t.select({ id: orders.id }).from(orders).where(eq(orders.number, number)).get()) {
        number = newOrderNumber();
      }
      const order = t
        .insert(orders)
        .values({
          number,
          userId: args.userId,
          email: input.email,
          paymentMethod: input.paymentMethod,
          currency: CURRENCY,
          ...totals,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company ?? null,
          country: input.country,
          address1: input.address1,
          address2: input.address2 ?? null,
          city: input.city,
          postcode: input.postcode,
          phone: input.phone,
          notes: input.notes ?? null,
          idempotencyKey: input.idempotencyKey,
        })
        .returning({ id: orders.id })
        .get();

      for (const line of cart.lines) {
        t.insert(orderItems)
          .values({
            orderId: order.id,
            variantId: line.variantId,
            productSlug: line.slug,
            name: line.name,
            variantLabel: line.label,
            sku: skuOf(t, line.variantId),
            image: line.image,
            unitCents: line.unitCents,
            quantity: line.quantity,
            lineCents: line.lineCents,
          })
          .run();
        // conditional update: succeeds only while enough unreserved stock remains (race-safe)
        const reserved = t
          .update(inventory)
          .set({ reserved: sql`${inventory.reserved} + ${line.quantity}` })
          .where(
            and(
              eq(inventory.variantId, line.variantId),
              sql`${inventory.onHand} - ${inventory.reserved} >= ${line.quantity}`,
            ),
          )
          .run();
        if (reserved.changes !== 1) throw new StockChanged(line.name);
      }

      t.insert(payments)
        .values({
          orderId: order.id,
          method: input.paymentMethod,
          provider: "pending",
          status: "pending",
          amountCents: totals.totalCents,
        })
        .run();
      t.insert(orderEvents)
        .values({
          orderId: order.id,
          fromStatus: null,
          toStatus: "pending",
          actor: args.userId ? `customer:${args.userId}` : "guest",
          note: "Order placed",
        })
        .run();
      return { ok: true as const, orderId: order.id, number, totalCents: totals.totalCents };
    });
  } catch (error) {
    if (error instanceof StockChanged) {
      return {
        ok: false,
        error: {
          code: "stock_changed",
          message: "Some items in your cart are no longer available in the quantity you chose.",
          items: [error.item],
        },
      };
    }
    throw error;
  }
}

class StockChanged extends Error {
  constructor(public item: string) {
    super(`stock changed for ${item}`);
  }
}

function skuOf(db: Db, variantId: number): string {
  return (
    db.select({ sku: variants.sku }).from(variants).where(eq(variants.id, variantId)).get()?.sku ??
    ""
  );
}

function releaseOrCommitStock(db: Db, orderId: number, mode: "release" | "commit") {
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  for (const item of items) {
    if (item.variantId === null) continue;
    db.update(inventory)
      .set(
        mode === "release"
          ? { reserved: sql`max(0, ${inventory.reserved} - ${item.quantity})` }
          : {
              reserved: sql`max(0, ${inventory.reserved} - ${item.quantity})`,
              onHand: sql`max(0, ${inventory.onHand} - ${item.quantity})`,
            },
      )
      .where(eq(inventory.variantId, item.variantId))
      .run();
  }
}

/**
 * Move an order to a new status if the state machine allows it, record who did it, and keep stock
 * consistent: cancelled/failed orders give their reservation back, shipping commits it (ORD-001, BR-05/06).
 */
export function transitionOrder(
  db: Db,
  number: string,
  to: OrderStatus,
  actor: string,
  note?: string,
): { ok: true; order: OrderView } | { ok: false; error: OrderError } {
  return db.transaction((tx) => {
    const t = asDb(tx);
    const row = t.select().from(orders).where(eq(orders.number, number)).get();
    if (!row) {
      return {
        ok: false as const,
        error: { code: "not_found" as const, message: "Order not found." },
      };
    }
    if (!canTransition(row.status, to)) {
      return {
        ok: false as const,
        error: {
          code: "invalid_transition" as const,
          message: `An order that is ${STATUS_LABEL[row.status].toLowerCase()} cannot become ${STATUS_LABEL[to].toLowerCase()}.`,
        },
      };
    }
    t.update(orders).set({ status: to, updatedAt: new Date() }).where(eq(orders.id, row.id)).run();
    t.insert(orderEvents)
      .values({ orderId: row.id, fromStatus: row.status, toStatus: to, actor, note: note ?? null })
      .run();
    if (RELEASES_STOCK.includes(to)) releaseOrCommitStock(t, row.id, "release");
    if (to === "shipped") releaseOrCommitStock(t, row.id, "commit");
    const fresh = t.select().from(orders).where(eq(orders.id, row.id)).get()!;
    return { ok: true as const, order: loadView(t, fresh) };
  });
}

/** Staff confirm an offline payment (bank transfer, COD, check): payment paid, order starts processing. */
export function markPaid(db: Db, number: string, actor: string) {
  return db.transaction((tx) => {
    const t = asDb(tx);
    const row = t.select().from(orders).where(eq(orders.number, number)).get();
    if (!row) {
      return {
        ok: false as const,
        error: { code: "not_found" as const, message: "Order not found." },
      };
    }
    t.update(orders)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(orders.id, row.id))
      .run();
    t.update(payments)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(payments.orderId, row.id))
      .run();
    return transitionOrder(t, number, "processing", actor, "Payment confirmed");
  });
}

/**
 * Place an order (CHK-006). Phase one records the order and reserves stock in one transaction; the payment
 * gateway is then called; phase two settles the outcome. A declined payment marks the order failed, gives
 * the stock back and keeps the cart so the shopper can try again. Sending the same idempotency key twice
 * returns the first result instead of creating a second order.
 */
export async function placeOrder(
  db: Db,
  args: {
    token: string | null;
    userId: number | null;
    input: CheckoutInput;
    simulate?: "approve" | "decline";
    gateway: PaymentGateway;
  },
): Promise<PlaceOrderResult> {
  const existing = db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, args.input.idempotencyKey))
    .get();
  if (existing) {
    if (existing.status === "failed") {
      return { ok: false, error: PAYMENT_FAILED };
    }
    return { ok: true, order: loadView(db, existing), created: false };
  }

  const attempt = createPendingOrder(db, args);
  if (!attempt.ok) return { ok: false, error: attempt.error };

  let charge;
  try {
    charge = await args.gateway.charge({
      orderNumber: attempt.number,
      method: args.input.paymentMethod,
      amountCents: attempt.totalCents,
      simulate: args.simulate,
    });
  } catch (error) {
    console.error("Payment gateway error:", error instanceof Error ? error.message : "unknown");
    charge = { status: "failed" as const, provider: "gateway", reference: "gateway_error" };
  }

  db.transaction((tx) => {
    const t = asDb(tx);
    t.update(payments)
      .set({
        status: charge.status,
        provider: charge.provider,
        reference: charge.reference,
        updatedAt: new Date(),
      })
      .where(eq(payments.orderId, attempt.orderId))
      .run();
    if (charge.status === "failed") {
      t.update(orders).set({ paymentStatus: "failed" }).where(eq(orders.id, attempt.orderId)).run();
      transitionOrder(t, attempt.number, "failed", "system", "Payment declined");
      return;
    }
    if (charge.status === "paid") {
      t.update(orders).set({ paymentStatus: "paid" }).where(eq(orders.id, attempt.orderId)).run();
      transitionOrder(t, attempt.number, "processing", "system", "Payment received");
    }
    // the order is real from here on: empty the cart that produced it
    if (args.token) clearCartLines(t, args.token);
    const placed = t.select().from(orders).where(eq(orders.id, attempt.orderId)).get()!;
    queueEmail(t, {
      kind: "order-confirmation",
      to: placed.email,
      subject: `Your Cosmia order ${placed.number}`,
      body: confirmationBody(placed),
    });
  });

  const row = db.select().from(orders).where(eq(orders.id, attempt.orderId)).get()!;
  if (row.status === "failed") return { ok: false, error: PAYMENT_FAILED };
  return { ok: true, order: loadView(db, row), created: true };
}

const PAYMENT_FAILED: OrderError = {
  code: "payment_failed",
  message: "Your payment was declined and you have not been charged. Please try another method.",
};

function clearCartLines(db: Db, token: string) {
  const cart = db.select({ id: carts.id }).from(carts).where(eq(carts.token, token)).get();
  if (cart) db.delete(cartItems).where(eq(cartItems.cartId, cart.id)).run();
}

function confirmationBody(o: typeof orders.$inferSelect): string {
  const total = (o.totalCents / 100).toFixed(2);
  const how =
    o.paymentMethod === "bank_transfer"
      ? `Please pay by bank transfer and use ${o.number} as the payment reference. We ship once the funds have cleared.`
      : o.paymentMethod === "cod"
        ? "You will pay in cash when the order is delivered."
        : o.paymentMethod === "check"
          ? `Please send a check made out to Cosmia and write ${o.number} on the back.`
          : "Your payment was received.";
  return `Hello ${o.firstName},\n\nThank you for your order ${o.number}.\nPayment method: ${METHOD_LABEL[o.paymentMethod]}\nTotal: $${total}\n\n${how}\n\nYou can follow the order at /track-order with your order ID and this email address.`;
}

export function getOrderByNumber(db: Db, number: string): OrderView | null {
  const row = db.select().from(orders).where(eq(orders.number, number)).get();
  return row ? loadView(db, row) : null;
}

/** An account sees only its own orders (USR-004). */
export function getOrderForUser(db: Db, userId: number, number: string): OrderView | null {
  const row = db
    .select()
    .from(orders)
    .where(and(eq(orders.number, number), eq(orders.userId, userId)))
    .get();
  return row ? loadView(db, row) : null;
}

export function listOrdersForUser(db: Db, userId: number): OrderView[] {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .all()
    .map((row) => loadView(db, row));
}
