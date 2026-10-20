import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import {
  emailOutbox,
  inventory,
  orderEvents,
  orderItems,
  orders,
  payments,
  products,
  variants,
} from "../../src/db/schema";
import { seedCatalog } from "../../src/db/seed";
import { SHIPPING_FLAT_RATE_CENTS } from "../../src/config/store";
import type { CheckoutInput } from "../../src/lib/validation/checkout";
import { addItem, getCart, newCartToken } from "../../src/server/cart/service";
import {
  getOrderByNumber,
  getOrderForUser,
  isOrderNumber,
  listOrdersForUser,
  markPaid,
  newOrderNumber,
  placeOrder,
  transitionOrder,
} from "../../src/server/orders/service";
import { canTransition } from "../../src/server/orders/state";
import { shippingFor, totalsFor } from "../../src/server/orders/totals";
import { trackOrder } from "../../src/server/orders/tracking";
import { registerUser } from "../../src/server/auth/service";
import { LocalGateway, type PaymentGateway } from "../../src/server/payments/gateway";

let db: Db;
let token: string;
let seq = 0;

beforeEach(() => {
  db = createDb(":memory:").db;
  runMigrations(db);
  seedCatalog(db);
  token = newCartToken();
});

const input = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  firstName: "Ana",
  lastName: "Lopez",
  country: "United Kingdom (UK)",
  address1: "1 High Street",
  city: "London",
  postcode: "N1 1AA",
  phone: "+44 20 7946 0000",
  email: "ana@example.com",
  paymentMethod: "bank_transfer",
  acceptTerms: true,
  idempotencyKey: `test-key-${String(++seq).padStart(16, "0")}`,
  company: undefined,
  address2: undefined,
  notes: undefined,
  ...over,
});

const gateway = new LocalGateway();
const place = (
  over: Partial<CheckoutInput> = {},
  extra: { userId?: number | null; simulate?: "approve" | "decline"; gw?: PaymentGateway } = {},
) =>
  placeOrder(db, {
    token,
    userId: extra.userId ?? null,
    input: input(over),
    simulate: extra.simulate,
    gateway: extra.gw ?? gateway,
  });

function stock(slug: string) {
  return db
    .select({ onHand: inventory.onHand, reserved: inventory.reserved, id: variants.id })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(inventory, eq(inventory.variantId, variants.id))
    .where(eq(products.slug, slug))
    .all()[0]!;
}

describe("totals (BR-03)", () => {
  it("charges the flat rate below the free-shipping threshold and nothing above it", () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(4800)).toBe(SHIPPING_FLAT_RATE_CENTS);
    expect(shippingFor(10_000)).toBe(0);
    expect(totalsFor(4800)).toEqual({
      subtotalCents: 4800,
      discountCents: 0,
      shippingCents: SHIPPING_FLAT_RATE_CENTS,
      totalCents: 4800 + SHIPPING_FLAT_RATE_CENTS,
    });
    expect(totalsFor(500, 900).totalCents).toBeGreaterThanOrEqual(0);
  });
});

describe("order numbers (OQ-21)", () => {
  it("are CSM- plus 8 unambiguous characters", () => {
    for (let i = 0; i < 50; i++) expect(isOrderNumber(newOrderNumber())).toBe(true);
    expect(newOrderNumber()).not.toMatch(/[01OIL]/);
    expect(isOrderNumber("csm-12345678")).toBe(false);
  });
});

describe("state machine (ORD-001)", () => {
  it("allows only the documented transitions", () => {
    expect(canTransition("pending", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("pending", "delivered")).toBe(false);
    expect(canTransition("delivered", "pending")).toBe(false);
    expect(canTransition("cancelled", "processing")).toBe(false);
    expect(canTransition("failed", "pending")).toBe(false);
  });
});

describe("placing an order (CHK-006)", () => {
  it("creates the order, items, payment and event, reserves stock and empties the cart", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 2 });
    const before = stock("the-renewal-serum");
    const result = await place();
    if (!result.ok) throw new Error(result.error.message);

    const { order } = result;
    expect(isOrderNumber(order.number)).toBe(true);
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ slug: "the-renewal-serum", quantity: 2 });
    expect(order.totalCents).toBe(order.subtotalCents + order.shippingCents);
    expect(order.events.map((e) => e.status)).toEqual(["pending"]);

    const after = stock("the-renewal-serum");
    expect(after.reserved).toBe(before.reserved + 2);
    expect(after.onHand).toBe(before.onHand);
    expect(getCart(db, token).count).toBe(0);
    expect(db.select().from(payments).all()).toHaveLength(1);
    expect(db.select().from(emailOutbox).all()[0]!.subject).toContain(order.number);
  });

  it("uses live prices, not anything sent by the browser", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const v = stock("the-renewal-serum");
    db.update(variants).set({ priceCents: 5100 }).where(eq(variants.id, v.id)).run();
    const result = await place();
    if (!result.ok) throw new Error("expected ok");
    expect(result.order.subtotalCents).toBe(5100);
    expect(result.order.items[0]!.unitCents).toBe(5100);
  });

  it("copies product details so later catalog edits do not rewrite the order", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const result = await place();
    if (!result.ok) throw new Error("expected ok");
    db.update(products)
      .set({ name: "Renamed" })
      .where(eq(products.slug, "the-renewal-serum"))
      .run();
    expect(getOrderByNumber(db, result.order.number)!.items[0]!.name).toBe("The renewal serum");
  });

  it("is idempotent: the same key returns the first order and reserves stock only once", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const before = stock("the-renewal-serum");
    const key = "idem-key-0123456789abcdef";
    const [a, b] = await Promise.all([
      place({ idempotencyKey: key }),
      place({ idempotencyKey: key }),
    ]);
    const c = await place({ idempotencyKey: key });
    if (!a.ok || !b.ok || !c.ok) throw new Error("expected ok");
    expect(new Set([a.order.number, b.order.number, c.order.number]).size).toBe(1);
    expect(db.select().from(orders).all()).toHaveLength(1);
    expect(stock("the-renewal-serum").reserved).toBe(before.reserved + 1);
  });

  it("rejects an empty cart", async () => {
    expect(await place()).toMatchObject({ ok: false, error: { code: "empty_cart" } });
    expect(db.select().from(orders).all()).toHaveLength(0);
  });

  it("re-validates stock at checkout and creates nothing when it no longer covers the cart", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 3 });
    const v = stock("the-renewal-serum");
    db.update(inventory).set({ onHand: 2, reserved: 0 }).where(eq(inventory.variantId, v.id)).run();
    const result = await place();
    expect(result).toMatchObject({
      ok: false,
      error: { code: "stock_changed", items: ["The renewal serum"] },
    });
    expect(db.select().from(orders).all()).toHaveLength(0);
    expect(db.select().from(orderItems).all()).toHaveLength(0);
    expect(stock("the-renewal-serum").reserved).toBe(0);
    expect(getCart(db, token).count).toBe(3);
  });

  it("rolls back everything when one line cannot be reserved (no partial order)", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    addItem(db, token, { slug: "barrier-repair-cream", quantity: 1 });
    const cream = stock("barrier-repair-cream");
    // stock disappears between the cart check and the reservation
    db.update(inventory).set({ onHand: 0 }).where(eq(inventory.variantId, cream.id)).run();
    const result = await place();
    expect(result.ok).toBe(false);
    expect(db.select().from(orders).all()).toHaveLength(0);
    expect(stock("the-renewal-serum").reserved).toBe(0);
  });

  it("links the order to the signed-in account", async () => {
    const user = registerUser(db, {
      username: "ana",
      email: "ana@example.com",
      password: "a long unusual phrase",
    });
    if (!user.ok) throw new Error("register");
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const result = await place({}, { userId: user.value.id });
    if (!result.ok) throw new Error("expected ok");
    expect(listOrdersForUser(db, user.value.id)).toHaveLength(1);
    expect(getOrderForUser(db, user.value.id, result.order.number)).not.toBeNull();
    expect(getOrderForUser(db, user.value.id + 1, result.order.number)).toBeNull();
  });
});

describe("payments (BR-07)", () => {
  it("offline methods stay pending until staff confirm them", async () => {
    for (const method of ["bank_transfer", "cod", "check"] as const) {
      addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
      const r = await place({ paymentMethod: method });
      if (!r.ok) throw new Error("expected ok");
      expect(r.order).toMatchObject({ status: "pending", paymentStatus: "pending" });
    }
    const first = db.select().from(orders).get()!;
    const paid = markPaid(db, first.number, "staff:1");
    if (!paid.ok) throw new Error("expected ok");
    expect(paid.order).toMatchObject({ status: "processing", paymentStatus: "paid" });
    expect(db.select().from(payments).where(eq(payments.orderId, first.id)).get()!.status).toBe(
      "paid",
    );
  });

  it("the test card approves immediately and starts processing", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const r = await place({ paymentMethod: "card_test" });
    if (!r.ok) throw new Error("expected ok");
    expect(r.order).toMatchObject({ status: "processing", paymentStatus: "paid" });
    expect(r.order.events.map((e) => e.status)).toEqual(["pending", "processing"]);
  });

  it("a declined payment leaves a consistent state: failed order, stock released, cart kept", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 2 });
    const before = stock("the-renewal-serum");
    const declining: PaymentGateway = {
      charge: async () => ({ status: "failed", provider: "mock-card", reference: "card_declined" }),
    };
    const r = await place({ paymentMethod: "card_test" }, { gw: declining });
    expect(r).toMatchObject({ ok: false, error: { code: "payment_failed" } });

    const order = db.select().from(orders).get()!;
    expect(order).toMatchObject({ status: "failed", paymentStatus: "failed" });
    expect(db.select().from(payments).get()).toMatchObject({
      status: "failed",
      reference: "card_declined",
    });
    expect(stock("the-renewal-serum")).toMatchObject({
      onHand: before.onHand,
      reserved: before.reserved,
    });
    expect(getCart(db, token).count).toBe(2);
    expect(
      db
        .select()
        .from(orderEvents)
        .all()
        .map((e) => e.toStatus),
    ).toEqual(["pending", "failed"]);
    // no confirmation email for an order that was not paid for
    expect(db.select().from(emailOutbox).all()).toHaveLength(0);
  });

  it("a gateway that throws is treated as a failure, not a half-created order", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const broken: PaymentGateway = {
      charge: async () => {
        throw new Error("network down");
      },
    };
    const r = await place({ paymentMethod: "card_test" }, { gw: broken });
    expect(r).toMatchObject({ ok: false, error: { code: "payment_failed" } });
    expect(db.select().from(orders).get()!.status).toBe("failed");
    expect(stock("the-renewal-serum").reserved).toBe(0);
  });

  it("the local gateway declines only when simulation is explicitly enabled", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const off = await place({ paymentMethod: "card_test" }, { simulate: "decline" });
    expect(off.ok).toBe(true);
    process.env.ALLOW_PAYMENT_SIMULATION = "1";
    try {
      addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
      const on = await place({ paymentMethod: "card_test" }, { simulate: "decline" });
      expect(on.ok).toBe(false);
    } finally {
      delete process.env.ALLOW_PAYMENT_SIMULATION;
    }
  });
});

describe("status changes keep stock consistent (BR-05, BR-06)", () => {
  async function placed(qty = 2) {
    addItem(db, token, { slug: "the-renewal-serum", quantity: qty });
    const r = await place();
    if (!r.ok) throw new Error("expected ok");
    return r.order.number;
  }

  it("cancelling gives the reservation back", async () => {
    const before = stock("the-renewal-serum");
    const number = await placed();
    const r = transitionOrder(db, number, "cancelled", "staff:1", "Customer request");
    expect(r.ok).toBe(true);
    expect(stock("the-renewal-serum")).toMatchObject({
      onHand: before.onHand,
      reserved: before.reserved,
    });
  });

  it("shipping commits the reservation to on-hand stock", async () => {
    const before = stock("the-renewal-serum");
    const number = await placed(2);
    expect(markPaid(db, number, "staff:1").ok).toBe(true);
    expect(transitionOrder(db, number, "shipped", "staff:1").ok).toBe(true);
    expect(stock("the-renewal-serum")).toMatchObject({
      onHand: before.onHand - 2,
      reserved: before.reserved,
    });
    expect(transitionOrder(db, number, "delivered", "staff:1").ok).toBe(true);
  });

  it("rejects illegal transitions and unknown orders, and logs actor and time for legal ones", async () => {
    const number = await placed(1);
    expect(transitionOrder(db, number, "delivered", "staff:1")).toMatchObject({
      ok: false,
      error: { code: "invalid_transition" },
    });
    expect(transitionOrder(db, "CSM-ZZZZZZZZ", "processing", "staff:1")).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });
    transitionOrder(db, number, "processing", "staff:7", "Packing");
    const log = db.select().from(orderEvents).all();
    expect(log.at(-1)).toMatchObject({
      fromStatus: "pending",
      toStatus: "processing",
      actor: "staff:7",
      note: "Packing",
    });
    expect(log.at(-1)!.createdAt).toBeInstanceOf(Date);
  });
});

describe("order tracking (TRK-001, BR-12)", () => {
  it("needs the order ID and the billing email; any mismatch is a generic not-found", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const r = await place();
    if (!r.ok) throw new Error("expected ok");
    const ok = trackOrder(db, r.order.number, "ANA@example.com ", "1.2.3.4");
    expect(ok).toMatchObject({ ok: true, order: { number: r.order.number } });
    const wrongEmail = trackOrder(db, r.order.number, "someone@else.com", "1.2.3.4");
    const wrongId = trackOrder(db, "CSM-ABCDEFGH", "ana@example.com", "1.2.3.4");
    const junk = trackOrder(db, "not an id", "ana@example.com", "1.2.3.4");
    expect(wrongEmail).toEqual({ ok: false, reason: "not_found" });
    expect(wrongId).toEqual(wrongEmail);
    expect(junk).toEqual(wrongEmail);
  });

  it("blocks brute force per client and per order ID", async () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const r = await place();
    if (!r.ok) throw new Error("expected ok");
    for (let i = 0; i < 10; i++) trackOrder(db, r.order.number, `guess${i}@x.com`, "9.9.9.9");
    expect(trackOrder(db, r.order.number, "ana@example.com", "9.9.9.9")).toMatchObject({
      ok: false,
      reason: "rate_limited",
    });
    // another client is blocked too, because the order itself is under attack
    expect(trackOrder(db, r.order.number, "ana@example.com", "8.8.8.8")).toMatchObject({
      ok: false,
      reason: "rate_limited",
    });
  });
});
