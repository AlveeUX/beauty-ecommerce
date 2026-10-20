import { parsePdpLayout, type PdpLayout } from "@/lib/pdp-layouts";
import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "@/db/client";
import {
  categories,
  collectionProducts,
  collections,
  colors,
  inventory,
  productCategories,
  productColors,
  productImages,
  productTags,
  products,
  reviews,
  variants,
} from "@/db/schema";
import {
  RATING_THRESHOLDS,
  SIZE_BUCKETS,
  SIZE_BUCKET_RANGES,
  type ProductBadge,
  type ProductSummary,
  type SizeBucket,
} from "@/lib/catalog-types";
import { parseProductContent, type ProductContent } from "@/lib/product-content";
import { DEFAULT_QUERY, type CatalogQuery } from "./query";

/**
 * Catalog read model for the storefront (PRD CAT-*, PRD-*, SRC-*).
 * Rules enforced here: only published products are visible (BR-10); the displayed
 * price is the default variant's price (BR-02); money is integer cents (BR-03).
 */

const dv = alias(variants, "dv"); // the default variant used for display price
type FacetGroup = "categories" | "price" | "size" | "color" | "rating" | "availability";

const list = (values: (string | number)[]) =>
  sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  );

/** Category slugs (parents expand to their children) -> category ids. */
function expandCategoryIds(db: Db, slugs: string[]): number[] {
  if (slugs.length === 0) return [];
  const rows = db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.isActive, true),
        or(
          sql`${categories.slug} in (${list(slugs)})`,
          sql`${categories.parentId} in (select id from ${categories} where ${categories.slug} in (${list(slugs)}))`,
        ),
      ),
    )
    .all();
  return rows.map((r) => r.id);
}

/** Escape LIKE wildcards in user input. */
const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function conditions(db: Db, q: CatalogQuery, omit?: FacetGroup): SQL[] {
  const c: SQL[] = [eq(products.status, "published")];

  for (const term of q.q.split(/\s+/).filter(Boolean)) {
    const pattern = likePattern(term);
    c.push(
      sql`(${like(products.name, pattern)} escape '\\'
        or ${like(products.productType, pattern)} escape '\\'
        or ${like(products.shortDescription, pattern)} escape '\\'
        or ${like(products.ingredients, pattern)} escape '\\'
        or exists (select 1 from ${productTags} where ${productTags.productId} = ${products.id}
                   and ${productTags.tag} like ${pattern} escape '\\')
        or exists (select 1 from ${productCategories}
                   join ${categories} on ${categories.id} = ${productCategories.categoryId}
                   where ${productCategories.productId} = ${products.id}
                   and ${categories.name} like ${pattern} escape '\\'))`,
    );
  }

  if (omit !== "categories" && q.categories.length > 0) {
    const ids = expandCategoryIds(db, q.categories);
    c.push(
      ids.length === 0
        ? sql`0`
        : sql`exists (select 1 from ${productCategories} where ${productCategories.productId} = ${products.id}
                       and ${productCategories.categoryId} in (${list(ids)}))`,
    );
  }

  if (omit !== "price") {
    if (q.priceMinCents !== null) c.push(sql`${dv.priceCents} >= ${q.priceMinCents}`);
    if (q.priceMaxCents !== null) c.push(sql`${dv.priceCents} <= ${q.priceMaxCents}`);
  }

  if (omit !== "size" && q.sizes.length > 0) {
    c.push(or(...q.sizes.map((b) => sizeCondition(b)))!);
  }

  if (omit !== "color" && q.colors.length > 0) {
    c.push(
      sql`exists (select 1 from ${productColors} join ${colors} on ${colors.id} = ${productColors.colorId}
                  where ${productColors.productId} = ${products.id} and ${colors.slug} in (${list(q.colors)}))`,
    );
  }

  if (omit !== "rating" && q.minRating !== null)
    c.push(sql`${products.ratingAvg} >= ${q.minRating}`);

  if (omit !== "availability") {
    if (q.availability.includes("in-stock")) c.push(inStockCondition());
    if (q.availability.includes("on-sale")) c.push(onSaleCondition());
  }

  if (q.badge) c.push(eq(products.badge, q.badge));

  if (q.collection) {
    c.push(
      sql`exists (select 1 from ${collectionProducts} join ${collections} on ${collections.id} = ${collectionProducts.collectionId}
                  where ${collectionProducts.productId} = ${products.id} and ${collections.slug} = ${q.collection})`,
    );
  }
  return c;
}

function sizeCondition(bucket: SizeBucket): SQL {
  const r = SIZE_BUCKET_RANGES[bucket];
  return sql`exists (select 1 from ${variants} where ${variants.productId} = ${products.id}
    and ${variants.sizeMl} is not null and ${variants.sizeMl} >= ${r.min}
    ${r.max === null ? sql`` : sql`and ${variants.sizeMl} <= ${r.max}`})`;
}

const inStockCondition = () =>
  sql`exists (select 1 from ${variants} join ${inventory} on ${inventory.variantId} = ${variants.id}
              where ${variants.productId} = ${products.id} and (${inventory.onHand} - ${inventory.reserved}) > 0)`;

const onSaleCondition = () =>
  sql`(${dv.compareAtCents} is not null and ${dv.compareAtCents} > ${dv.priceCents})`;

const withDefaultVariant = () => and(eq(dv.productId, products.id), eq(dv.isDefault, true));

function countProducts(db: Db, where: SQL[]): number {
  return db
    .select({ n: sql<number>`count(distinct ${products.id})` })
    .from(products)
    .innerJoin(dv, withDefaultVariant())
    .where(and(...where))
    .get()!.n;
}

export type CatalogResult = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** 1-based index range of the items on this page ("Showing 1-12 of 300"). */
  from: number;
  to: number;
};

const imageSql = sql<string | null>`(select ${productImages.url} from ${productImages}
  where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder}, ${productImages.id} limit 1)`;
const inStockSql = sql<number>`${inStockCondition()}`;

const summaryFields = {
  slug: products.slug,
  name: products.name,
  productType: products.productType,
  badge: products.badge,
  ratingAvg: products.ratingAvg,
  reviewCount: products.reviewCount,
  priceCents: dv.priceCents,
  compareAtCents: dv.compareAtCents,
  sizeLabel: dv.sizeLabel,
  image: imageSql,
  inStock: inStockSql,
  shortDescription: products.shortDescription,
};

function toSummary(r: {
  slug: string;
  name: string;
  productType: string;
  badge: ProductBadge | null;
  ratingAvg: number;
  reviewCount: number;
  priceCents: number;
  compareAtCents: number | null;
  sizeLabel: string;
  image: string | null;
  inStock: number;
  shortDescription: string | null;
}): ProductSummary {
  return {
    slug: r.slug,
    name: r.name,
    label: `${r.productType} · ${r.sizeLabel}`,
    priceCents: r.priceCents,
    compareAtCents: r.compareAtCents,
    rating: r.ratingAvg,
    reviewCount: r.reviewCount,
    badge: r.badge,
    image: r.image ?? "/images/ui/page-hero.png",
    inStock: Boolean(r.inStock),
    description: r.shortDescription,
  };
}

const ORDER = {
  "best-seller": () => [desc(products.soldCount), asc(products.id)],
  newest: () => [desc(products.publishedAt), asc(products.id)],
  "price-asc": () => [asc(dv.priceCents), asc(products.id)],
  "price-desc": () => [desc(dv.priceCents), asc(products.id)],
  rating: () => [desc(products.ratingAvg), desc(products.reviewCount), asc(products.id)],
} as const;

/** Filtered, sorted, paginated product list. An out-of-range page is clamped to the last page. */
export function listProducts(db: Db, q: CatalogQuery): CatalogResult {
  const where = conditions(db, q);
  const total = countProducts(db, where);
  const pageCount = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), pageCount);
  const rows = db
    .select(summaryFields)
    .from(products)
    .innerJoin(dv, withDefaultVariant())
    .where(and(...where))
    .orderBy(...ORDER[q.sort]())
    .limit(q.pageSize)
    .offset((page - 1) * q.pageSize)
    .all();
  const from = total === 0 ? 0 : (page - 1) * q.pageSize + 1;
  return {
    items: rows.map(toSummary),
    total,
    page,
    pageSize: q.pageSize,
    pageCount,
    from,
    to: total === 0 ? 0 : from + rows.length - 1,
  };
}

/* ----------------------------- facets ----------------------------- */

export type CategoryNode = { slug: string; name: string; count: number; children: CategoryNode[] };
export type Facets = {
  categories: CategoryNode[];
  sizes: { bucket: SizeBucket; label: string; count: number }[];
  colors: { slug: string; name: string; hex: string; count: number }[];
  ratings: { min: number; count: number }[];
  availability: { inStock: number; onSale: number };
  price: { minCents: number; maxCents: number };
};

/**
 * Counts for the filter sidebar. Each group is counted with every *other* filter applied
 * but not its own, so choosing "Skincare" does not zero out the other categories.
 */
export function getFacets(db: Db, q: CatalogQuery): Facets {
  const count = (omit: FacetGroup, extra: SQL[] = []) =>
    countProducts(db, [...conditions(db, q, omit), ...extra]);

  // Categories: parent counts are distinct products across the parent and its children.
  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder))
    .all();
  const catIdsFor = (slug: string) =>
    cats
      .filter((c) => c.slug === slug || cats.find((p) => p.id === c.parentId)?.slug === slug)
      .map((c) => c.id);
  const countCategory = (ids: number[]) =>
    count("categories", [
      sql`exists (select 1 from ${productCategories} where ${productCategories.productId} = ${products.id}
                  and ${productCategories.categoryId} in (${list(ids)}))`,
    ]);
  const toNode = (c: (typeof cats)[number]): CategoryNode => ({
    slug: c.slug,
    name: c.name,
    count: countCategory(catIdsFor(c.slug)),
    children: cats.filter((k) => k.parentId === c.id).map(toNode),
  });
  const tree = cats.filter((c) => c.parentId === null).map(toNode);

  const colorRows = db
    .select({ slug: colors.slug, name: colors.name, hex: colors.hex })
    .from(colors)
    .orderBy(asc(colors.sortOrder))
    .all();

  const priceRange = db
    .select({
      min: sql<number | null>`min(${dv.priceCents})`,
      max: sql<number | null>`max(${dv.priceCents})`,
    })
    .from(products)
    .innerJoin(dv, withDefaultVariant())
    .where(eq(products.status, "published"))
    .get()!;

  return {
    categories: tree,
    sizes: SIZE_BUCKETS.map((bucket) => ({
      bucket,
      label: SIZE_BUCKET_RANGES[bucket].label,
      count: count("size", [sizeCondition(bucket)]),
    })),
    colors: colorRows.map((c) => ({
      ...c,
      count: count("color", [
        sql`exists (select 1 from ${productColors} join ${colors} on ${colors.id} = ${productColors.colorId}
                    where ${productColors.productId} = ${products.id} and ${colors.slug} = ${c.slug})`,
      ]),
    })),
    ratings: RATING_THRESHOLDS.map((min) => ({
      min,
      count: count("rating", [sql`${products.ratingAvg} >= ${min}`]),
    })),
    availability: {
      inStock: count("availability", [inStockCondition()]),
      onSale: count("availability", [onSaleCondition()]),
    },
    price: { minCents: priceRange.min ?? 0, maxCents: priceRange.max ?? 0 },
  };
}

/* --------------------------- product detail --------------------------- */

export type VariantDetail = {
  id: number;
  sku: string;
  sizeLabel: string;
  sizeMl: number | null;
  priceCents: number;
  compareAtCents: number | null;
  isDefault: boolean;
  available: number;
  inStock: boolean;
};

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  productType: string;
  shortDescription: string | null;
  description: string | null;
  ingredients: string | null;
  content: ProductContent | null;
  badge: ProductBadge | null;
  ratingAvg: number;
  reviewCount: number;
  ratingBreakdown: Record<"5" | "4" | "3" | "2" | "1", number>;
  images: { url: string; alt: string }[];
  variants: VariantDetail[];
  defaultVariant: VariantDetail;
  categories: { slug: string; name: string }[];
  tags: string[];
  colors: { slug: string; name: string; hex: string }[];
  inStock: boolean;
  /** Layout chosen for this product (validated), or null for the default. */
  pdpLayout: PdpLayout | null;
  saleEndsAt: Date | null;
};

/** Published product by slug, or null (drafts and archived products are not publicly reachable: BR-10). */
export function getProductBySlug(db: Db, slugValue: string): ProductDetail | null {
  const p = db
    .select()
    .from(products)
    .where(and(eq(products.slug, slugValue), eq(products.status, "published")))
    .get();
  if (!p) return null;

  const variantRows = db
    .select({
      id: variants.id,
      sku: variants.sku,
      sizeLabel: variants.sizeLabel,
      sizeMl: variants.sizeMl,
      priceCents: variants.priceCents,
      compareAtCents: variants.compareAtCents,
      isDefault: variants.isDefault,
      available: sql<number>`coalesce(${inventory.onHand} - ${inventory.reserved}, 0)`,
    })
    .from(variants)
    .leftJoin(inventory, eq(inventory.variantId, variants.id))
    .where(eq(variants.productId, p.id))
    .orderBy(asc(variants.sortOrder), asc(variants.id))
    .all()
    .map((v) => ({ ...v, available: Math.max(0, v.available), inStock: v.available > 0 }));
  const defaultVariant = variantRows.find((v) => v.isDefault) ?? variantRows[0];
  if (!defaultVariant) return null; // a product without variants cannot be sold

  const images = db
    .select({ url: productImages.url, alt: productImages.alt })
    .from(productImages)
    .where(eq(productImages.productId, p.id))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id))
    .all();
  const cats = db
    .select({ slug: categories.slug, name: categories.name })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(eq(productCategories.productId, p.id))
    .all();
  const tags = db
    .select({ tag: productTags.tag })
    .from(productTags)
    .where(eq(productTags.productId, p.id))
    .all();
  const cols = db
    .select({ slug: colors.slug, name: colors.name, hex: colors.hex })
    .from(productColors)
    .innerJoin(colors, eq(colors.id, productColors.colorId))
    .where(eq(productColors.productId, p.id))
    .orderBy(asc(colors.sortOrder))
    .all();

  const empty = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
  let breakdown = empty;
  try {
    breakdown = { ...empty, ...(JSON.parse(p.ratingBreakdown ?? "{}") as typeof empty) };
  } catch {
    // malformed JSON falls back to an empty distribution
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    productType: p.productType,
    shortDescription: p.shortDescription,
    description: p.description,
    ingredients: p.ingredients,
    content: parseProductContent(p.content),
    badge: p.badge,
    ratingAvg: p.ratingAvg,
    reviewCount: p.reviewCount,
    ratingBreakdown: breakdown,
    images,
    variants: variantRows,
    defaultVariant,
    categories: cats,
    tags: tags.map((t) => t.tag),
    colors: cols,
    inStock: variantRows.some((v) => v.inStock),
    pdpLayout: parsePdpLayout(p.pdpLayout),
    saleEndsAt: p.saleEndsAt,
  };
}

export type ReviewView = {
  id: number;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  isVerified: boolean;
  recommend: boolean;
  createdAt: Date;
  brandReply: string | null;
  brandReplyAuthor: string | null;
};

/** Approved reviews only (BR-11). */
export function getApprovedReviews(db: Db, productId: number, limit = 20): ReviewView[] {
  return db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      isVerified: reviews.isVerified,
      recommend: reviews.recommend,
      createdAt: reviews.createdAt,
      brandReply: reviews.brandReply,
      brandReplyAuthor: reviews.brandReplyAuthor,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(limit)
    .all();
}

/** Same-category products first (best sellers first), topped up from the rest of the catalog. */
export function getRelatedProducts(db: Db, productId: number, limit = 4): ProductSummary[] {
  const others = (extra?: SQL) =>
    db
      .select(summaryFields)
      .from(products)
      .innerJoin(dv, withDefaultVariant())
      .where(and(eq(products.status, "published"), sql`${products.id} <> ${productId}`, extra))
      .orderBy(desc(products.soldCount), asc(products.id));

  const sameCategory = others(
    sql`exists (select 1 from ${productCategories} pc1
                join ${productCategories} pc2 on pc2.category_id = pc1.category_id
                where pc1.product_id = ${productId} and pc2.product_id = ${products.id})`,
  )
    .limit(limit)
    .all();
  if (sameCategory.length >= limit) return sameCategory.map(toSummary);

  const seen = new Set(sameCategory.map((r) => r.slug));
  const rest = others()
    .limit(limit + seen.size)
    .all()
    .filter((r) => !seen.has(r.slug));
  return [...sameCategory, ...rest].slice(0, limit).map(toSummary);
}

/** Published products for the given slugs, in the order requested (unknown/unpublished slugs are skipped). */
export function getProductsBySlugs(db: Db, slugs: string[]): ProductSummary[] {
  if (slugs.length === 0) return [];
  const rows = db
    .select(summaryFields)
    .from(products)
    .innerJoin(dv, withDefaultVariant())
    .where(and(eq(products.status, "published"), sql`${products.slug} in (${list(slugs)})`))
    .all()
    .map(toSummary);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

/* ----------------------------- navigation ----------------------------- */

/** Active categories with published-product counts; empty categories are hidden by default. */
export function getCategoryTree(db: Db, opts: { includeEmpty?: boolean } = {}): CategoryNode[] {
  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder))
    .all();
  const countIds = (ids: number[]) =>
    countProducts(db, [
      eq(products.status, "published"),
      sql`exists (select 1 from ${productCategories} where ${productCategories.productId} = ${products.id}
                  and ${productCategories.categoryId} in (${list(ids)}))`,
    ]);
  const build = (c: (typeof cats)[number]): CategoryNode => {
    const children = cats.filter((k) => k.parentId === c.id).map(build);
    const ids = [c.id, ...cats.filter((k) => k.parentId === c.id).map((k) => k.id)];
    return { slug: c.slug, name: c.name, count: countIds(ids), children };
  };
  const prune = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes
      .filter((n) => opts.includeEmpty || n.count > 0)
      .map((n) => ({ ...n, children: prune(n.children) }));
  return prune(cats.filter((c) => c.parentId === null).map(build));
}

export type CategoryCard = {
  slug: string;
  name: string;
  description: string | null;
  image: string;
  count: number;
};

/** Categories that have both an image and published products, in tree order (parent, then children). */
export function getCategoryCards(db: Db): CategoryCard[] {
  const flat: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) =>
    nodes.forEach((n) => {
      flat.push(n);
      walk(n.children);
    });
  walk(getCategoryTree(db));
  const meta = new Map(
    db
      .select({
        slug: categories.slug,
        description: categories.description,
        image: categories.image,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .all()
      .map((c) => [c.slug, c]),
  );
  return flat.flatMap((n) => {
    const m = meta.get(n.slug);
    return m?.image
      ? [{ slug: n.slug, name: n.name, description: m.description, image: m.image, count: n.count }]
      : [];
  });
}

export function getCollectionProducts(db: Db, collectionSlug: string, limit = 8): ProductSummary[] {
  return db
    .select(summaryFields)
    .from(collectionProducts)
    .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
    .innerJoin(products, eq(products.id, collectionProducts.productId))
    .innerJoin(dv, withDefaultVariant())
    .where(and(eq(collections.slug, collectionSlug), eq(products.status, "published")))
    .orderBy(asc(collectionProducts.sortOrder), asc(products.id))
    .limit(limit)
    .all()
    .map(toSummary);
}

export type SearchSuggestions = {
  products: ProductSummary[];
  categories: { slug: string; name: string }[];
};

/** Typeahead for the search overlay (SRC-001): a few products and matching categories. */
export function searchSuggestions(db: Db, term: string, limit = 6): SearchSuggestions {
  const q = term.trim().slice(0, 80);
  if (q.length < 2) return { products: [], categories: [] };
  const pattern = likePattern(q);
  const found = listProducts(db, {
    ...DEFAULT_QUERY,
    q,
    pageSize: limit,
    sort: "best-seller",
  }).items;
  const cats = db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(and(eq(categories.isActive, true), sql`${categories.name} like ${pattern} escape '\\'`))
    .orderBy(asc(categories.sortOrder))
    .limit(4)
    .all();
  return { products: found, categories: cats };
}
