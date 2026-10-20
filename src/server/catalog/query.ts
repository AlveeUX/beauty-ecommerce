import { z } from "zod";
import {
  DEFAULT_SHOP_LAYOUT,
  SHOP_LAYOUT_TRAITS,
  parseShopLayout,
  type ShopLayout,
} from "@/lib/shop-layouts";
import {
  AVAILABILITY_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PRODUCT_BADGES,
  RATING_THRESHOLDS,
  SIZE_BUCKETS,
  SORT_OPTIONS,
  type Availability,
  type ProductBadge,
  type SizeBucket,
  type SortOption,
} from "@/lib/catalog-types";

export type CatalogQuery = {
  q: string;
  categories: string[];
  /** Price bounds in cents (the URL uses whole dollars: price=20-50). */
  priceMinCents: number | null;
  priceMaxCents: number | null;
  sizes: SizeBucket[];
  colors: string[];
  minRating: number | null;
  availability: Availability[];
  badge: ProductBadge | null;
  collection: string | null;
  sort: SortOption;
  page: number;
  pageSize: number;
  /** How the shop page is laid out (view only; it never changes which products match). */
  layout: ShopLayout;
};

export const DEFAULT_QUERY: CatalogQuery = {
  q: "",
  categories: [],
  priceMinCents: null,
  priceMaxCents: null,
  sizes: [],
  colors: [],
  minRating: null,
  availability: [],
  badge: null,
  collection: null,
  sort: "best-seller",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  layout: DEFAULT_SHOP_LAYOUT,
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,60}$/);
const dollars = z.coerce.number().int().min(0).max(100_000);

/** Collect every value for a key, accepting repeated keys and comma-separated lists. */
function list(params: RawParams, key: string): string[] {
  const raw = params instanceof URLSearchParams ? params.getAll(key) : [params[key] ?? []].flat();
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function single(params: RawParams, key: string): string | undefined {
  const [first] = list(params, key);
  return first;
}

export type ParseResult = { query: CatalogQuery; issues: string[] };

/**
 * Parse catalog filters from URL parameters.
 * Unknown or invalid values are dropped and reported in `issues` so pages can degrade
 * gracefully while the API can answer 400 (CAT-002/004/005, SEC-003).
 */
export function parseCatalogQuery(params: RawParams): ParseResult {
  const issues: string[] = [];
  const query: CatalogQuery = {
    ...DEFAULT_QUERY,
    categories: [],
    sizes: [],
    colors: [],
    availability: [],
  };

  const q = single(params, "q");
  if (q !== undefined) query.q = q.slice(0, 80);

  for (const v of list(params, "category")) {
    if (slug.safeParse(v).success) query.categories.push(v);
    else issues.push(`category: invalid value "${v}"`);
  }
  for (const v of list(params, "color")) {
    if (slug.safeParse(v).success) query.colors.push(v);
    else issues.push(`color: invalid value "${v}"`);
  }
  for (const v of list(params, "size")) {
    if ((SIZE_BUCKETS as readonly string[]).includes(v)) query.sizes.push(v as SizeBucket);
    else issues.push(`size: invalid value "${v}"`);
  }
  for (const v of list(params, "availability")) {
    if ((AVAILABILITY_OPTIONS as readonly string[]).includes(v))
      query.availability.push(v as Availability);
    else issues.push(`availability: invalid value "${v}"`);
  }

  const price = single(params, "price");
  if (price !== undefined) {
    const m = /^(\d*)-(\d*)$/.exec(price);
    const min = m?.[1] ? dollars.safeParse(m[1]) : null;
    const max = m?.[2] ? dollars.safeParse(m[2]) : null;
    if (!m || (min && !min.success) || (max && !max.success) || (!m[1] && !m[2])) {
      issues.push(`price: invalid value "${price}"`);
    } else {
      query.priceMinCents = min?.success ? min.data * 100 : null;
      query.priceMaxCents = max?.success ? max.data * 100 : null;
      if (
        query.priceMinCents !== null &&
        query.priceMaxCents !== null &&
        query.priceMinCents > query.priceMaxCents
      ) {
        [query.priceMinCents, query.priceMaxCents] = [query.priceMaxCents, query.priceMinCents];
      }
    }
  }

  const rating = single(params, "rating");
  if (rating !== undefined) {
    const n = Number(rating);
    if ((RATING_THRESHOLDS as readonly number[]).includes(n)) query.minRating = n;
    else issues.push(`rating: invalid value "${rating}"`);
  }

  const badge = single(params, "badge");
  if (badge !== undefined) {
    if ((PRODUCT_BADGES as readonly string[]).includes(badge)) query.badge = badge as ProductBadge;
    else issues.push(`badge: invalid value "${badge}"`);
  }

  const collection = single(params, "collection");
  if (collection !== undefined) {
    if (slug.safeParse(collection).success) query.collection = collection;
    else issues.push(`collection: invalid value "${collection}"`);
  }

  const sort = single(params, "sort");
  if (sort !== undefined) {
    if ((SORT_OPTIONS as readonly string[]).includes(sort)) query.sort = sort as SortOption;
    else issues.push(`sort: invalid value "${sort}"`);
  }

  const page = single(params, "page");
  if (page !== undefined) {
    const n = Number(page);
    if (Number.isInteger(n) && n >= 1 && n <= 10_000) query.page = n;
    else issues.push(`page: invalid value "${page}"`);
  }

  const layout = single(params, "layout");
  if (layout !== undefined) {
    const parsed = parseShopLayout(layout);
    if (parsed) query.layout = parsed;
    else issues.push(`layout: invalid value "${layout}"`);
  }

  const pageSize = single(params, "pageSize");
  if (pageSize !== undefined) {
    const n = Number(pageSize);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_PAGE_SIZE) query.pageSize = n;
    else issues.push(`pageSize: invalid value "${pageSize}"`);
  }
  // the 4-column grids of the design show four full rows (16 products) unless a size is asked for
  if (pageSize === undefined) query.pageSize = implicitPageSize(query.layout);

  return { query, issues };
}

/** Page size a layout uses when the URL names none: 16 for the 4-column grids, otherwise 12. */
function implicitPageSize(layout: ShopLayout | undefined): number {
  const traits = SHOP_LAYOUT_TRAITS[layout ?? DEFAULT_SHOP_LAYOUT];
  return traits.view === "grid" && traits.columns === 4 ? 16 : DEFAULT_QUERY.pageSize;
}

/** Serialise a query back to URL parameters (omitting defaults) so filters round-trip through links. */
export function toSearchParams(query: Partial<CatalogQuery>): URLSearchParams {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  for (const c of query.categories ?? []) p.append("category", c);
  for (const c of query.colors ?? []) p.append("color", c);
  for (const s of query.sizes ?? []) p.append("size", s);
  for (const a of query.availability ?? []) p.append("availability", a);
  if (query.priceMinCents != null || query.priceMaxCents != null) {
    const min = query.priceMinCents != null ? String(query.priceMinCents / 100) : "";
    const max = query.priceMaxCents != null ? String(query.priceMaxCents / 100) : "";
    p.set("price", `${min}-${max}`);
  }
  if (query.minRating != null) p.set("rating", String(query.minRating));
  if (query.badge) p.set("badge", query.badge);
  if (query.collection) p.set("collection", query.collection);
  if (query.sort && query.sort !== DEFAULT_QUERY.sort) p.set("sort", query.sort);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  if (query.pageSize && query.pageSize !== implicitPageSize(query.layout))
    p.set("pageSize", String(query.pageSize));
  if (query.layout && query.layout !== DEFAULT_QUERY.layout) p.set("layout", query.layout);
  return p;
}
