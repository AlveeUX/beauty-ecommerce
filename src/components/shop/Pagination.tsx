import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { toSearchParams, type CatalogQuery } from "@/server/catalog/query";
import styles from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  pageCount: number;
} & (
  | { query: CatalogQuery; basePath: string; hrefFor?: undefined }
  | { hrefFor: (page: number) => string; query?: undefined; basePath?: undefined }
);

/** Numbered pagination (01 02 03) with previous/next. Figma 3:4989. */
export function Pagination({ query, basePath, hrefFor, page, pageCount }: PaginationProps) {
  if (pageCount <= 1) return null;
  const href =
    hrefFor ??
    ((p: number) => {
      const qs = toSearchParams({ ...query, page: p }).toString();
      return qs ? `${basePath}?${qs}` : basePath;
    });
  const items = windowed(page, pageCount);

  return (
    <nav aria-label="Pagination" className={styles.nav}>
      <ul>
        <li>
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              className={styles.box}
              aria-label="Previous page"
              scroll={false}
            >
              <Icon name="chevron-left" size={18} />
            </Link>
          ) : (
            <span className={`${styles.box} ${styles.disabled}`} aria-hidden="true">
              <Icon name="chevron-left" size={18} />
            </span>
          )}
        </li>
        {items.map((item, i) => (
          <li key={`${item}-${i}`}>
            {item === "…" ? (
              <span className={`${styles.box} ${styles.gap}`} aria-hidden="true">
                …
              </span>
            ) : (
              <Link
                href={href(item)}
                className={`${styles.box} ${item === page ? styles.current : ""}`}
                aria-current={item === page ? "page" : undefined}
                scroll={false}
              >
                <span className="visually-hidden">Page </span>
                {String(item).padStart(2, "0")}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < pageCount ? (
            <Link
              href={href(page + 1)}
              className={styles.box}
              aria-label="Next page"
              scroll={false}
            >
              <Icon name="chevron-right" size={18} />
            </Link>
          ) : (
            <span className={`${styles.box} ${styles.disabled}`} aria-hidden="true">
              <Icon name="chevron-right" size={18} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/** 1 … 4 5 [6] 7 8 … 20 */
function windowed(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}
