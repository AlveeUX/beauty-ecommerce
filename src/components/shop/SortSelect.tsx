"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { SORT_LABELS, SORT_OPTIONS, type SortOption } from "@/lib/catalog-types";
import styles from "./SortSelect.module.css";

/** "Sort by: Best Seller" control (Figma 3:4932, 203 x 44, dashed border). */
export function SortSelect({ value, basePath }: { value: SortOption; basePath: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [, startTransition] = useTransition();

  function onChange(next: string) {
    const params = new URLSearchParams(search.toString());
    params.delete("page");
    if (next === "best-seller") params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  }

  return (
    <div className={styles.wrap}>
      <label className="visually-hidden" htmlFor="shop-sort">
        Sort products
      </label>
      <select id="shop-sort" value={value} onChange={(e) => onChange(e.target.value)}>
        {SORT_OPTIONS.map((o) => (
          <option key={o} value={o}>
            Sort by: {SORT_LABELS[o]}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={16} />
    </div>
  );
}
