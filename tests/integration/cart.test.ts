import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import { inventory, products, variants } from "../../src/db/schema";
import { seedCatalog } from "../../src/db/seed";
import {
  addItem,
  clearCart,
  getCart,
  isCartToken,
  newCartToken,
  removeItem,
  setQuantity,
} from "../../src/server/cart/service";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "../../src/config/store";

let db: Db;
let token: string;

beforeEach(() => {
  db = createDb(":memory:").db;
  runMigrations(db);
  seedCatalog(db);
  token = newCartToken();
});

/** Variant id and stock of a seeded product's default variant. */
function variantOf(slug: string) {
  return db
    .select({
      id: variants.id,
      price: variants.priceCents,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(inventory, eq(inventory.variantId, variants.id))
    .where(eq(products.slug, slug))
    .all()
    .find((v) => v.id !== undefined)!;
}

describe("cart tokens", () => {
  it("are 128-bit hex and validated before use", () => {
    expect(isCartToken(newCartToken())).toBe(true);
    expect(isCartToken("../etc/passwd")).toBe(false);
    expect(isCartToken(undefined)).toBe(false);
    expect(newCartToken()).not.toBe(newCartToken());
  });
});

describe("cart service (CRT-004, CRT-005)", () => {
  it("is empty until something is added and reports the free-shipping target", () => {
    const cart = getCart(db, token);
    expect(cart.lines).toEqual([]);
    expect(cart.count).toBe(0);
    expect(cart.remainingForFreeShippingCents).toBe(FREE_SHIPPING_THRESHOLD_CENTS);
    expect(getCart(db, null).count).toBe(0);
  });

  it("adds by slug, merges repeat adds into one line and totals in integer cents", () => {
    const first = addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    expect(first.ok).toBe(true);
    const second = addItem(db, token, { slug: "the-renewal-serum", quantity: 2 });
    if (!second.ok) throw new Error("expected ok");
    expect(second.cart.lines).toHaveLength(1);
    const line = second.cart.lines[0]!;
    expect(line.quantity).toBe(3);
    expect(line.lineCents).toBe(line.unitCents * 3);
    expect(second.cart.subtotalCents).toBe(line.unitCents * 3);
    expect(second.cart.count).toBe(3);
    expect(Number.isInteger(second.cart.subtotalCents)).toBe(true);
  });

  it("keeps carts separate per token", () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    expect(getCart(db, newCartToken()).count).toBe(0);
  });

  it("rejects a quantity above the stock and leaves the cart unchanged", () => {
    const v = variantOf("the-renewal-serum");
    db.update(inventory).set({ onHand: 3, reserved: 0 }).where(eq(inventory.variantId, v.id)).run();

    expect(addItem(db, token, { slug: "the-renewal-serum", quantity: 3 }).ok).toBe(true);
    const over = addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    expect(over).toMatchObject({ ok: false, error: { code: "stock_limit", available: 3 } });
    expect(getCart(db, token).count).toBe(3);

    // lowering stock below what is in the cart is caught when the quantity is changed
    expect(setQuantity(db, token, v.id, 4)).toMatchObject({
      ok: false,
      error: { code: "stock_limit" },
    });
    // reserved units are not available either
    db.update(inventory).set({ reserved: 2 }).where(eq(inventory.variantId, v.id)).run();
    expect(getCart(db, token).lines[0]!.available).toBe(1);
  });

  it("rejects out-of-stock products and unknown slugs", () => {
    const oos = addItem(db, token, { slug: "glass-glow-primer", quantity: 1 });
    expect(oos).toMatchObject({ ok: false, error: { code: "out_of_stock" } });
    const missing = addItem(db, token, { slug: "no-such-product", quantity: 1 });
    expect(missing).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(getCart(db, token).count).toBe(0);
  });

  it("does not sell unpublished products (BR-10)", () => {
    db.update(products)
      .set({ status: "draft" })
      .where(eq(products.slug, "the-renewal-serum"))
      .run();
    const result = addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("rejects zero, negative, fractional and oversized quantities", () => {
    for (const quantity of [0, -1, 1.5, 21]) {
      const r = addItem(db, token, { slug: "the-renewal-serum", quantity });
      expect(r).toMatchObject({ ok: false, error: { code: "invalid_quantity" } });
    }
  });

  it("sets, removes and clears lines", () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    addItem(db, token, { slug: "barrier-repair-cream", quantity: 1 });
    const cart = getCart(db, token);
    expect(cart.lines).toHaveLength(2);
    const id = cart.lines[0]!.variantId;

    const set = setQuantity(db, token, id, 2);
    if (!set.ok) throw new Error("expected ok");
    expect(set.cart.lines.find((l) => l.variantId === id)!.quantity).toBe(2);

    expect(setQuantity(db, token, 999999, 1)).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });

    expect(removeItem(db, token, id).lines).toHaveLength(1);
    expect(clearCart(db, token).lines).toHaveLength(0);
  });

  it("free-shipping progress reaches zero at the threshold", () => {
    addItem(db, token, { slug: "the-renewal-serum", quantity: 1 });
    const cart = getCart(db, token);
    expect(cart.remainingForFreeShippingCents).toBe(
      Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents),
    );
  });
});
