import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SIZE_BUCKET_RANGES } from "@/lib/catalog-types";
import { priceRangeLabel } from "@/lib/price-format";
import { toSearchParams, type CatalogQuery } from "@/server/catalog/query";
import type { Facets } from "@/server/catalog/service";
import styles from "./ActiveFilters.module.css";

type Chip = { key: string; label: string; dot?: string; patch: Partial<CatalogQuery> };

/** Removable chips for the applied filters, plus "Clear all" (CAT-003). Figma 3:4957. */
export function ActiveFilters({
  query,
  facets,
  basePath,
}: {
  query: CatalogQuery;
  facets: Facets;
  basePath: string;
}) {
  const categoryNames = new Map<string, string>();
  const walk = (nodes: Facets["categories"]) =>
    nodes.forEach((n) => {
      categoryNames.set(n.slug, n.name);
      walk(n.children);
    });
  walk(facets.categories);

  const chips: Chip[] = [];
  if (query.q) chips.push({ key: "q", label: `Search: ${query.q}`, patch: { q: "" } });
  for (const c of query.categories) {
    chips.push({
      key: `category-${c}`,
      label: categoryNames.get(c) ?? c,
      patch: { categories: query.categories.filter((x) => x !== c) },
    });
  }
  if (query.priceMinCents !== null || query.priceMaxCents !== null) {
    chips.push({
      key: "price",
      label: priceRangeLabel(query.priceMinCents, query.priceMaxCents),
      patch: { priceMinCents: null, priceMaxCents: null },
    });
  }
  for (const s of query.sizes) {
    chips.push({
      key: `size-${s}`,
      label: SIZE_BUCKET_RANGES[s].label,
      patch: { sizes: query.sizes.filter((x) => x !== s) },
    });
  }
  for (const c of query.colors) {
    const color = facets.colors.find((f) => f.slug === c);
    chips.push({
      key: `color-${c}`,
      label: color?.name ?? c,
      dot: color?.hex,
      patch: { colors: query.colors.filter((x) => x !== c) },
    });
  }
  if (query.minRating !== null) {
    chips.push({
      key: "rating",
      label: `${query.minRating.toFixed(1)} & up`,
      patch: { minRating: null },
    });
  }
  for (const a of query.availability) {
    chips.push({
      key: `availability-${a}`,
      label: a === "in-stock" ? "In Stock" : "On Sale",
      patch: { availability: query.availability.filter((x) => x !== a) },
    });
  }
  if (query.badge)
    chips.push({ key: "badge", label: query.badge.replace("-", " "), patch: { badge: null } });
  if (query.collection)
    chips.push({ key: "collection", label: query.collection, patch: { collection: null } });

  if (chips.length === 0) return null;

  // clearing filters keeps the chosen layout
  const clearQs = toSearchParams({ layout: query.layout }).toString();
  const clearHref = clearQs ? `${basePath}?${clearQs}` : basePath;
  const href = (patch: Partial<CatalogQuery>) => {
    const qs = toSearchParams({ ...query, ...patch, page: 1 }).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className={styles.bar} aria-label="Applied filters" role="group">
      <ul className={styles.chips}>
        {chips.map((chip, i) => (
          <li key={chip.key}>
            <Link
              href={href(chip.patch)}
              className={`${styles.chip} ${i === 0 ? styles.first : ""}`}
              aria-label={`Remove filter: ${chip.label}`}
              scroll={false}
            >
              <Icon name="x" size={14} />
              {chip.dot ? (
                <span className={styles.dot} style={{ background: chip.dot }} aria-hidden="true" />
              ) : null}
              <span>{chip.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={clearHref} className={styles.clear} scroll={false}>
        Clear all
      </Link>
    </div>
  );
}
