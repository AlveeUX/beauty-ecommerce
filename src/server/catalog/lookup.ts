import type { Db } from "@/db/client";
import { getProductBySlug } from "./service";

/** What the wishlist and compare pages need about a product (default variant). */
export type ListProduct = {
  slug: string;
  name: string;
  label: string;
  image: string | null;
  priceCents: number;
  compareAtCents: number | null;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  sku: string;
  sizeLabel: string;
};

/** Published products by slug, in the order asked; unknown or unpublished slugs are skipped. */
export function lookupProducts(db: Db, slugs: string[]): ListProduct[] {
  return slugs.flatMap((slug) => {
    const p = getProductBySlug(db, slug);
    if (!p) return [];
    const v = p.defaultVariant;
    return [
      {
        slug: p.slug,
        name: p.name,
        label: `${p.productType} · ${v.sizeLabel}`,
        image: p.images[0]?.url ?? null,
        priceCents: v.priceCents,
        compareAtCents: v.compareAtCents,
        rating: p.ratingAvg,
        reviewCount: p.reviewCount,
        inStock: v.inStock,
        sku: v.sku,
        sizeLabel: v.sizeLabel,
      },
    ];
  });
}
