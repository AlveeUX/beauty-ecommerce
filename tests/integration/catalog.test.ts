import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import { seedCatalog } from "../../src/db/seed";
import { inventory, products, variants } from "../../src/db/schema";
import { DEFAULT_QUERY, parseCatalogQuery, toSearchParams } from "../../src/server/catalog/query";
import {
  getApprovedReviews,
  getCategoryTree,
  getCollectionProducts,
  getFacets,
  getProductBySlug,
  getRelatedProducts,
  listProducts,
  searchSuggestions,
} from "../../src/server/catalog/service";

let db: Db;
const query = (params: Record<string, string | string[]>) => parseCatalogQuery(params).query;

beforeAll(() => {
  db = createDb(":memory:").db;
  runMigrations(db);
  seedCatalog(db);
});

describe("seed", () => {
  it("creates the design's 36 products and is repeatable", () => {
    expect(db.select().from(products).all()).toHaveLength(36);
    seedCatalog(db);
    expect(db.select().from(products).all()).toHaveLength(36);
  });

  it("stores money as integer cents", () => {
    for (const v of db.select().from(variants).all()) {
      expect(Number.isInteger(v.priceCents)).toBe(true);
      if (v.compareAtCents !== null) expect(v.compareAtCents).toBeGreaterThan(v.priceCents);
    }
  });
});

describe("parseCatalogQuery (CAT-002/004/005, SEC-003)", () => {
  it("uses defaults for empty input", () => {
    expect(parseCatalogQuery({})).toEqual({ query: DEFAULT_QUERY, issues: [] });
  });

  it("parses filters, accepting repeated and comma-separated values", () => {
    const { query: q, issues } = parseCatalogQuery(
      new URLSearchParams(
        "category=skincare,face&color=peach&color=rose&size=mini&price=20-50&rating=4&availability=in-stock&sort=price-asc&page=2",
      ),
    );
    expect(issues).toEqual([]);
    expect(q).toMatchObject({
      categories: ["skincare", "face"],
      colors: ["peach", "rose"],
      sizes: ["mini"],
      priceMinCents: 2000,
      priceMaxCents: 5000,
      minRating: 4,
      availability: ["in-stock"],
      sort: "price-asc",
      page: 2,
    });
  });

  it("drops invalid values and reports them instead of throwing", () => {
    const { query: q, issues } = parseCatalogQuery({
      sort: "drop table",
      page: "-3",
      price: "abc",
      rating: "9",
      size: "huge",
      category: "Bad Slug!",
    });
    expect(q).toMatchObject({
      sort: "best-seller",
      page: 1,
      priceMinCents: null,
      minRating: null,
      sizes: [],
      categories: [],
    });
    expect(issues).toHaveLength(6);
  });

  it("swaps reversed price bounds and round-trips through toSearchParams", () => {
    const q = query({ price: "50-20", category: "face", sort: "newest", page: "3" });
    expect([q.priceMinCents, q.priceMaxCents]).toEqual([2000, 5000]);
    expect(parseCatalogQuery(toSearchParams(q)).query).toEqual(q);
  });
});

describe("listProducts (CAT-001/003/004/005)", () => {
  it("returns page 1 of 12 with an accurate 'Showing x-y of N'", () => {
    const r = listProducts(db, DEFAULT_QUERY);
    expect(r).toMatchObject({ total: 36, page: 1, pageSize: 12, pageCount: 3, from: 1, to: 12 });
    expect(r.items).toHaveLength(12);
  });

  it("clamps an out-of-range page to the last page", () => {
    const r = listProducts(db, query({ page: "99" }));
    expect(r.page).toBe(3);
    expect(r.items).toHaveLength(12);
  });

  it("expands a parent category to its children", () => {
    expect(listProducts(db, query({ category: "skincare" })).total).toBe(16);
    expect(listProducts(db, query({ category: "face" })).total).toBe(7);
    expect(listProducts(db, query({ category: "cleansers,tools" })).total).toBe(7);
  });

  it("filters by price range inclusive of bounds", () => {
    const r = listProducts(db, query({ price: "20-30", pageSize: "48" }));
    expect(r.total).toBeGreaterThan(0);
    for (const p of r.items) {
      expect(p.priceCents).toBeGreaterThanOrEqual(2000);
      expect(p.priceCents).toBeLessThanOrEqual(3000);
    }
  });

  it("filters by size bucket using any variant (the serum has a 15ml variant)", () => {
    const mini = listProducts(db, query({ size: "mini", pageSize: "48" }));
    expect(mini.items.map((p) => p.slug)).toContain("the-renewal-serum");
    expect(
      listProducts(db, query({ size: "jumbo", pageSize: "48" })).items.map((p) => p.slug),
    ).toContain("skin-rescue-shampoo");
  });

  it("filters by color, rating and badge", () => {
    expect(listProducts(db, query({ color: "crimson" })).total).toBe(4);
    const rated = listProducts(db, query({ rating: "4.5", pageSize: "48" }));
    expect(rated.total).toBeLessThan(36);
    for (const p of rated.items) expect(p.rating).toBeGreaterThanOrEqual(4.5);
    for (const p of listProducts(db, query({ badge: "new", pageSize: "48" })).items)
      expect(p.badge).toBe("new");
  });

  it("handles availability: out-of-stock products are excluded from 'in-stock' and 'on-sale' uses compare-at", () => {
    const inStock = listProducts(db, query({ availability: "in-stock", pageSize: "48" }));
    expect(inStock.total).toBe(35);
    expect(inStock.items.map((p) => p.slug)).not.toContain("glass-glow-primer");
    const onSale = listProducts(db, query({ availability: "on-sale", pageSize: "48" }));
    expect(onSale.total).toBe(8);
    for (const p of onSale.items) expect(p.compareAtCents!).toBeGreaterThan(p.priceCents);
  });

  it("sorts by price both ways with a stable tie-break", () => {
    const asc = listProducts(db, query({ sort: "price-asc", pageSize: "48" })).items.map(
      (p) => p.priceCents,
    );
    const desc = listProducts(db, query({ sort: "price-desc", pageSize: "48" })).items.map(
      (p) => p.priceCents,
    );
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(asc[0]).toBe(1000);
    expect(desc[0]).toBe(14900);
  });

  it("combines filters (AND) and returns an empty result without error", () => {
    expect(
      listProducts(db, query({ category: "face", color: "peach", availability: "in-stock" })).total,
    ).toBe(5);
    const none = listProducts(db, query({ category: "fragrance", color: "crimson" }));
    expect(none).toMatchObject({ total: 0, items: [], page: 1, pageCount: 1, from: 0, to: 0 });
  });

  it("returns nothing for an unknown category rather than ignoring the filter", () => {
    expect(listProducts(db, query({ category: "does-not-exist" })).total).toBe(0);
  });

  it("marks unavailable products as not in stock", () => {
    const primer = listProducts(db, query({ q: "glass glow primer" })).items[0]!;
    expect(primer.inStock).toBe(false);
  });
});

describe("search (SRC-001)", () => {
  it("matches name, type, tag and category, case-insensitively, with all terms required", () => {
    expect(listProducts(db, query({ q: "SERUM" })).items.map((p) => p.slug)).toContain(
      "the-renewal-serum",
    );
    expect(listProducts(db, query({ q: "lip" })).total).toBeGreaterThan(2);
    expect(listProducts(db, query({ q: "renewal serum" })).items.map((p) => p.slug)).toEqual([
      "the-renewal-serum",
    ]);
    expect(listProducts(db, query({ q: "xyzzy" })).total).toBe(0);
  });

  it("treats % and _ literally and is safe against SQL metacharacters", () => {
    // "%" is matched literally: only the serum's ingredient list contains "(5%)", a wildcard would match all 36.
    expect(listProducts(db, query({ q: "%" })).items.map((p) => p.slug)).toEqual([
      "the-renewal-serum",
    ]);
    expect(listProducts(db, query({ q: "_" })).total).toBe(0);
    expect(listProducts(db, query({ q: "'; drop table products; --" })).total).toBe(0);
    expect(db.select().from(products).all()).toHaveLength(36);
  });

  it("suggests products and categories, and ignores one-character input", () => {
    const s = searchSuggestions(db, "face");
    expect(s.categories.map((c) => c.slug)).toContain("face");
    expect(s.products.length).toBeGreaterThan(0);
    expect(searchSuggestions(db, "f")).toEqual({ products: [], categories: [] });
  });
});

describe("facets (CAT-002)", () => {
  it("counts each group while ignoring only its own filter", () => {
    const f = getFacets(db, query({ category: "skincare" }));
    const skincare = f.categories.find((c) => c.slug === "skincare")!;
    const makeup = f.categories.find((c) => c.slug === "makeup")!;
    expect(skincare.count).toBe(16);
    expect(makeup.count).toBe(12); // category filter does not zero the other categories
    expect(skincare.children.map((c) => c.slug)).toEqual([
      "cleansers",
      "essentials",
      "moisturizers",
      "treatments",
      "masks",
    ]);
    // other groups ARE narrowed by the category filter
    expect(f.availability.inStock).toBeLessThanOrEqual(16);
  });

  it("reports the global price range for the slider", () => {
    expect(getFacets(db, DEFAULT_QUERY).price).toEqual({ minCents: 1000, maxCents: 14900 });
  });
});

describe("categories and collections", () => {
  it("builds the tree and hides empty categories (Nails has no products)", () => {
    const tree = getCategoryTree(db);
    expect(tree.map((c) => c.slug)).toEqual([
      "skincare",
      "makeup",
      "haircare",
      "tools",
      "fragrance",
    ]);
    expect(tree.find((c) => c.slug === "makeup")!.children.map((c) => c.slug)).toEqual([
      "eyes",
      "lips",
      "face",
    ]);
    expect(
      getCategoryTree(db, { includeEmpty: true })
        .find((c) => c.slug === "makeup")!
        .children.map((c) => c.slug),
    ).toContain("nails");
  });

  it("serves the Home collections", () => {
    expect(getCollectionProducts(db, "trending-now", 8).length).toBeGreaterThan(0);
    expect(getCollectionProducts(db, "nope")).toEqual([]);
  });
});

describe("product detail (PRD-001/002/007, BR-10, BR-11)", () => {
  it("returns variants with availability and a default", () => {
    const p = getProductBySlug(db, "the-renewal-serum")!;
    expect(p.variants.map((v) => v.sizeLabel)).toEqual(["15ml", "30ml", "50ml"]);
    expect(p.defaultVariant).toMatchObject({
      sizeLabel: "30ml",
      priceCents: 4800,
      isDefault: true,
    });
    expect(p.inStock).toBe(true);
    expect(p.categories.map((c) => c.slug)).toEqual(["essentials"]);
    expect(Object.values(p.ratingBreakdown).reduce((a, b) => a + b, 0)).toBe(p.reviewCount);
  });

  it("reports sold-out products and returns null for unknown slugs", () => {
    expect(getProductBySlug(db, "glass-glow-primer")!.inStock).toBe(false);
    expect(getProductBySlug(db, "nope")).toBeNull();
  });

  it("hides draft and archived products everywhere", () => {
    db.update(products).set({ status: "draft" }).where(eq(products.slug, "facial-roller")).run();
    expect(getProductBySlug(db, "facial-roller")).toBeNull();
    expect(listProducts(db, DEFAULT_QUERY).total).toBe(35);
    expect(listProducts(db, query({ q: "roller" })).total).toBe(0);
    expect(getCategoryTree(db).find((c) => c.slug === "tools")!.count).toBe(3);
    db.update(products).set({ status: "archived" }).where(eq(products.slug, "facial-roller")).run();
    expect(getProductBySlug(db, "facial-roller")).toBeNull();
    db.update(products)
      .set({ status: "published" })
      .where(eq(products.slug, "facial-roller"))
      .run();
    expect(listProducts(db, DEFAULT_QUERY).total).toBe(36);
  });

  it("shows only approved reviews", () => {
    const p = getProductBySlug(db, "the-renewal-serum")!;
    const r = getApprovedReviews(db, p.id);
    expect(r).toHaveLength(3);
    expect(r.some((x) => x.title === "Awaiting moderation")).toBe(false);
    expect(r.find((x) => x.brandReply)?.brandReplyAuthor).toBe("Cosmia Skin Team");
  });

  it("returns related products from the same category first, never the product itself", () => {
    const p = getProductBySlug(db, "the-renewal-serum")!;
    const related = getRelatedProducts(db, p.id, 4);
    expect(related).toHaveLength(4);
    expect(related.map((r) => r.slug)).not.toContain("the-renewal-serum");
    expect(
      related
        .slice(0, 3)
        .every((r) =>
          ["skin-rescue-ampoule", "hydra-mist-toner", "nourishing-face-oil"].includes(r.slug),
        ),
    ).toBe(true);
  });

  it("reflects stock changes immediately (admin -> storefront consistency)", () => {
    const p = getProductBySlug(db, "the-renewal-serum")!;
    for (const v of p.variants)
      db.update(inventory).set({ onHand: 0 }).where(eq(inventory.variantId, v.id)).run();
    expect(getProductBySlug(db, "the-renewal-serum")!.inStock).toBe(false);
    expect(
      listProducts(db, query({ availability: "in-stock", pageSize: "48" })).items.map(
        (i) => i.slug,
      ),
    ).not.toContain("the-renewal-serum");
    for (const v of p.variants)
      db.update(inventory).set({ onHand: 40 }).where(eq(inventory.variantId, v.id)).run();
  });
});
