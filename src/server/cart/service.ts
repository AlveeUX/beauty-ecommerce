import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cartItems, carts, inventory, productImages, products, variants } from "@/db/schema";
import { FREE_SHIPPING_THRESHOLD_CENTS, MAX_LINE_QUANTITY } from "@/config/store";

export type CartLine = {
  variantId: number;
  slug: string;
  name: string;
  /** "Foundation · 30ml" */
  label: string;
  image: string | null;
  unitCents: number;
  compareAtCents: number | null;
  quantity: number;
  /** Units that can still be bought (on hand minus reserved). */
  available: number;
  lineCents: number;
};

export type CartView = {
  lines: CartLine[];
  /** Total units (the header badge). */
  count: number;
  subtotalCents: number;
  freeShippingThresholdCents: number;
  /** 0 once the threshold is reached. */
  remainingForFreeShippingCents: number;
};

export type CartError = {
  code: "not_found" | "out_of_stock" | "stock_limit" | "invalid_quantity";
  message: string;
  available?: number;
};

/** HTTP status for each cart error code. */
export const CART_ERROR_STATUS: Record<CartError["code"], number> = {
  not_found: 404,
  out_of_stock: 409,
  stock_limit: 409,
  invalid_quantity: 422,
};

export type CartResult = { ok: true; cart: CartView } | { ok: false; error: CartError };

/** Cart tokens are 128-bit random values; they are the only credential of a guest cart. */
export const newCartToken = () => randomBytes(16).toString("hex");
export const isCartToken = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{32}$/.test(value);

const EMPTY: CartView = {
  lines: [],
  count: 0,
  subtotalCents: 0,
  freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
  remainingForFreeShippingCents: FREE_SHIPPING_THRESHOLD_CENTS,
};

function cartId(db: Db, token: string): number | null {
  return db.select({ id: carts.id }).from(carts).where(eq(carts.token, token)).get()?.id ?? null;
}

function ensureCart(db: Db, token: string): number {
  const existing = cartId(db, token);
  if (existing !== null) return existing;
  return db.insert(carts).values({ token }).returning({ id: carts.id }).get().id;
}

const touch = (db: Db, id: number) =>
  db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, id)).run();

/** Current cart with live prices and stock; unpublished products and missing variants drop out. */
export function getCart(db: Db, token: string | null): CartView {
  if (!token) return EMPTY;
  const id = cartId(db, token);
  if (id === null) return EMPTY;

  const rows = db
    .select({
      variantId: variants.id,
      quantity: cartItems.quantity,
      slug: products.slug,
      name: products.name,
      productType: products.productType,
      sizeLabel: variants.sizeLabel,
      unitCents: variants.priceCents,
      compareAtCents: variants.compareAtCents,
      available: sql<number>`coalesce(${inventory.onHand} - ${inventory.reserved}, 0)`,
      image: sql<string | null>`(select ${productImages.url} from ${productImages}
        where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder}, ${productImages.id} limit 1)`,
    })
    .from(cartItems)
    .innerJoin(variants, eq(variants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, variants.productId))
    .leftJoin(inventory, eq(inventory.variantId, variants.id))
    .where(and(eq(cartItems.cartId, id), eq(products.status, "published")))
    .orderBy(cartItems.createdAt, cartItems.variantId)
    .all();

  const lines: CartLine[] = rows.map((r) => ({
    variantId: r.variantId,
    slug: r.slug,
    name: r.name,
    label: `${r.productType} · ${r.sizeLabel}`,
    image: r.image,
    unitCents: r.unitCents,
    compareAtCents: r.compareAtCents,
    quantity: r.quantity,
    available: Math.max(0, r.available),
    lineCents: r.unitCents * r.quantity,
  }));
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineCents, 0);
  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents,
    freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
    remainingForFreeShippingCents: Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents),
  };
}

type Target = { variantId: number; available: number } | null;

/** Resolve a published variant by id, or the default variant of a product slug. */
function resolveTarget(db: Db, input: { slug?: string; variantId?: number }): Target {
  const base = db
    .select({
      variantId: variants.id,
      available: sql<number>`coalesce(${inventory.onHand} - ${inventory.reserved}, 0)`,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .leftJoin(inventory, eq(inventory.variantId, variants.id));
  const row =
    input.variantId !== undefined
      ? base.where(and(eq(variants.id, input.variantId), eq(products.status, "published"))).get()
      : input.slug
        ? base
            .where(
              and(
                eq(products.slug, input.slug),
                eq(products.status, "published"),
                eq(variants.isDefault, true),
              ),
            )
            .get()
        : undefined;
  return row ? { variantId: row.variantId, available: Math.max(0, row.available) } : null;
}

function checkQuantity(quantity: number, available: number): CartError | null {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    return {
      code: "invalid_quantity",
      message: `Quantity must be a whole number from 1 to ${MAX_LINE_QUANTITY}.`,
    };
  }
  if (available < 1) {
    return { code: "out_of_stock", message: "This item is out of stock.", available: 0 };
  }
  if (quantity > available) {
    return { code: "stock_limit", message: `Only ${available} left in stock.`, available };
  }
  return null;
}

/** Add units to a line (creating the cart on first use). Rejects anything beyond stock (CRT-005). */
export function addItem(
  db: Db,
  token: string,
  input: { slug?: string; variantId?: number; quantity: number },
): CartResult {
  const target = resolveTarget(db, input);
  if (!target) return { ok: false, error: { code: "not_found", message: "Product not found." } };

  const id = ensureCart(db, token);
  const current =
    db
      .select({ q: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, target.variantId)))
      .get()?.q ?? 0;
  const wanted = current + input.quantity;
  const error = checkQuantity(wanted, target.available);
  if (error) return { ok: false, error };

  db.insert(cartItems)
    .values({ cartId: id, variantId: target.variantId, quantity: wanted })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: { quantity: wanted },
    })
    .run();
  touch(db, id);
  return { ok: true, cart: getCart(db, token) };
}

/** Set the exact quantity of an existing line. */
export function setQuantity(
  db: Db,
  token: string,
  variantId: number,
  quantity: number,
): CartResult {
  const id = cartId(db, token);
  const line =
    id === null
      ? undefined
      : db
          .select({ q: cartItems.quantity })
          .from(cartItems)
          .where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, variantId)))
          .get();
  if (id === null || !line) {
    return { ok: false, error: { code: "not_found", message: "That item is not in your cart." } };
  }
  const target = resolveTarget(db, { variantId });
  const error = checkQuantity(quantity, target?.available ?? 0);
  if (error) return { ok: false, error };

  db.update(cartItems)
    .set({ quantity })
    .where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, variantId)))
    .run();
  touch(db, id);
  return { ok: true, cart: getCart(db, token) };
}

export function removeItem(db: Db, token: string, variantId: number): CartView {
  const id = cartId(db, token);
  if (id !== null) {
    db.delete(cartItems)
      .where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, variantId)))
      .run();
    touch(db, id);
  }
  return getCart(db, token);
}

export function clearCart(db: Db, token: string): CartView {
  const id = cartId(db, token);
  if (id !== null) {
    db.delete(cartItems).where(eq(cartItems.cartId, id)).run();
    touch(db, id);
  }
  return getCart(db, token);
}
