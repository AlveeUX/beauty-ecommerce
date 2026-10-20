import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import { products } from "../../src/db/schema";
import { seedCatalog } from "../../src/db/seed";
import { SUBSCRIBE_DISCOUNT_PERCENT } from "../../src/config/store";
import { GALLERY_FOR, PDP_LAYOUTS, parsePdpLayout } from "../../src/lib/pdp-layouts";
import { subscriptionCents } from "../../src/components/product/PurchaseOptions";
import { getProductBySlug } from "../../src/server/catalog/service";

let db: Db;
beforeEach(() => {
  db = createDb(":memory:").db;
  runMigrations(db);
  seedCatalog(db);
});

describe("product page layouts (PRD-012)", () => {
  it("knows the ten Figma layouts and a gallery setup for each", () => {
    expect(PDP_LAYOUTS).toHaveLength(10);
    for (const layout of PDP_LAYOUTS) expect(GALLERY_FOR[layout]).toBeDefined();
  });

  it("accepts only known layout names", () => {
    expect(parsePdpLayout("inner-zoom")).toBe("inner-zoom");
    expect(parsePdpLayout("Inner Zoom")).toBeNull();
    expect(parsePdpLayout("../etc")).toBeNull();
    expect(parsePdpLayout(undefined)).toBeNull();
  });

  it("returns the stored layout (validated) and sale end with the product", () => {
    expect(getProductBySlug(db, "the-renewal-serum")?.pdpLayout).toBeNull();
    db.update(products)
      .set({ pdpLayout: "gallery-2-column" })
      .where(eq(products.slug, "the-renewal-serum"))
      .run();
    expect(getProductBySlug(db, "the-renewal-serum")?.pdpLayout).toBe("gallery-2-column");
    db.update(products)
      .set({ pdpLayout: "not-a-layout" })
      .where(eq(products.slug, "the-renewal-serum"))
      .run();
    expect(getProductBySlug(db, "the-renewal-serum")?.pdpLayout).toBeNull();
  });

  it("seeds a sale end only for products with a compare-at price", () => {
    const sale = getProductBySlug(db, "barrier-repair-cream")!;
    expect(sale.defaultVariant.compareAtCents).not.toBeNull();
    expect(sale.saleEndsAt!.getTime()).toBeGreaterThan(Date.now());
    expect(getProductBySlug(db, "the-renewal-serum")!.saleEndsAt).toBeNull();
  });

  it("prices the subscription in whole cents", () => {
    expect(subscriptionCents(4800)).toBe(
      Math.round((4800 * (100 - SUBSCRIBE_DISCOUNT_PERCENT)) / 100),
    );
    expect(subscriptionCents(4800)).toBe(4080);
    expect(Number.isInteger(subscriptionCents(3333))).toBe(true);
  });
});
