import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cartItems, carts, inventory, variants, wishlistItems } from "@/db/schema";
import { MAX_LINE_QUANTITY } from "@/config/store";
import { newCartToken } from "./service";

/**
 * Attach the visitor's guest cart to their account at login and return the token the browser should use
 * from now on (OQ-20: merge, summing quantities). Quantities are capped by stock and the line maximum, so
 * a merge never produces a cart the shopper could not have built by hand. The guest cart is removed.
 */
export function mergeGuestCart(db: Db, guestToken: string | null, userId: number): string {
  return db.transaction((tx) => {
    let account = tx.select().from(carts).where(eq(carts.userId, userId)).get();
    if (!account) {
      // the guest cart itself becomes the account cart when the account has none
      const guest = guestToken
        ? tx.select().from(carts).where(eq(carts.token, guestToken)).get()
        : undefined;
      if (guest && guest.userId === null) {
        tx.update(carts).set({ userId }).where(eq(carts.id, guest.id)).run();
        return guest.token;
      }
      account = tx.insert(carts).values({ token: newCartToken(), userId }).returning().get();
      return account.token;
    }
    const guest = guestToken
      ? tx.select().from(carts).where(eq(carts.token, guestToken)).get()
      : undefined;
    if (!guest || guest.id === account.id || guest.userId !== null) return account.token;

    const guestLines = tx.select().from(cartItems).where(eq(cartItems.cartId, guest.id)).all();
    for (const line of guestLines) {
      const stock = tx
        .select({ onHand: inventory.onHand, reserved: inventory.reserved })
        .from(inventory)
        .innerJoin(variants, eq(variants.id, inventory.variantId))
        .where(eq(inventory.variantId, line.variantId))
        .get();
      const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;
      const existing = tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, account.id))
        .all()
        .find((l) => l.variantId === line.variantId);
      const wanted = (existing?.quantity ?? 0) + line.quantity;
      const quantity = Math.min(wanted, MAX_LINE_QUANTITY, available);
      if (quantity <= 0) continue;
      if (existing) {
        tx.update(cartItems)
          .set({ quantity })
          .where(and(eq(cartItems.cartId, account.id), eq(cartItems.variantId, line.variantId)))
          .run();
      } else {
        tx.insert(cartItems)
          .values({ cartId: account.id, variantId: line.variantId, quantity })
          .run();
      }
    }
    tx.delete(carts).where(eq(carts.id, guest.id)).run();
    return account.token;
  });
}

/** Add the browser wishlist to the account list and return the merged list of product slugs (WSH-003). */
export function mergeWishlist(db: Db, userId: number, browserSlugs: string[]): string[] {
  const clean = [...new Set(browserSlugs.filter((s) => /^[a-z0-9-]{1,200}$/.test(s)))].slice(
    0,
    100,
  );
  for (const productSlug of clean) {
    db.insert(wishlistItems).values({ userId, productSlug }).onConflictDoNothing().run();
  }
  return db
    .select({ slug: wishlistItems.productSlug })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .all()
    .map((r) => r.slug);
}

export function setAccountWishlist(db: Db, userId: number, slugs: string[]): void {
  const clean = [...new Set(slugs.filter((s) => /^[a-z0-9-]{1,200}$/.test(s)))].slice(0, 100);
  db.transaction((tx) => {
    tx.delete(wishlistItems).where(eq(wishlistItems.userId, userId)).run();
    for (const productSlug of clean) {
      tx.insert(wishlistItems).values({ userId, productSlug }).run();
    }
  });
}
