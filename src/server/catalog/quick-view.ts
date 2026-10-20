import type { Db } from "@/db/client";
import type { ProductBadge } from "@/lib/catalog-types";
import { getProductBySlug } from "./service";

/** What the quick-view popup (Figma 3:1366) shows about a product and its default variant. */
export type QuickViewData = {
  slug: string;
  name: string;
  badge: ProductBadge | null;
  shortDescription: string | null;
  rating: number;
  reviewCount: number;
  images: { url: string; alt: string }[];
  variantId: number;
  sizeLabel: string;
  priceCents: number;
  compareAtCents: number | null;
  inStock: boolean;
  available: number;
};

/** A published product's default variant for the popup, or null for an unknown or unpublished slug. */
export function getQuickView(db: Db, slug: string): QuickViewData | null {
  const p = getProductBySlug(db, slug);
  if (!p) return null;
  const v = p.defaultVariant;
  return {
    slug: p.slug,
    name: p.name,
    badge: p.badge,
    shortDescription: p.shortDescription,
    rating: p.ratingAvg,
    reviewCount: p.reviewCount,
    images: p.images,
    variantId: v.id,
    sizeLabel: v.sizeLabel,
    priceCents: v.priceCents,
    compareAtCents: v.compareAtCents,
    inStock: v.inStock,
    available: v.available,
  };
}
