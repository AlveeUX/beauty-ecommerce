import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { FlashSale } from "@/components/home/FlashSale";
import { HeroSlider } from "@/components/home/HeroSlider";
import {
  CategoryCards,
  EditorialBanner,
  FeatureStrip,
  FreshDrops,
  InstagramStrip,
  Journal,
  Marquee,
  MostLoved,
  PersonalBand,
  TrendingNow,
} from "@/components/home/HomeSections";
import {
  getCategoryTree,
  getCollectionProducts,
  getProductsBySlugs,
} from "@/server/catalog/service";
import type { ProductBadge } from "@/lib/catalog-types";
import { getBanners } from "@/server/content/banners";
import { getBundles } from "@/server/content/bundles";

export const metadata: Metadata = { title: { absolute: "Cosmia | Skincare & Cosmetics" } };
export const dynamic = "force-dynamic";

export default function Home() {
  const db = getDb();

  // Product counts for the category cards (shown on hover).
  const counts: Record<string, number> = {};
  const walk = (nodes: ReturnType<typeof getCategoryTree>) =>
    nodes.forEach((n) => {
      counts[n.slug] = n.count;
      walk(n.children);
    });
  walk(getCategoryTree(db));

  // Designed cards first (banner data overrides price/rating/badge), then the live collection.
  const designed = getBanners(db, "home-trending").flatMap((b) => {
    const base = getProductsBySlugs(db, [String(b.data.productSlug)])[0];
    if (!base) return [];
    return [
      {
        ...base,
        priceCents: Number(b.data.priceCents),
        compareAtCents: Number(b.data.compareAtCents),
        rating: Number(b.data.rating),
        reviewCount: Number(b.data.reviewCount),
        badge: b.data.badge as ProductBadge,
        inStock: true,
      },
    ];
  });
  const taken = new Set(designed.map((p) => p.slug));
  const trending = [
    ...designed,
    ...getCollectionProducts(db, "trending-now", 12).filter((p) => !taken.has(p.slug)),
  ].slice(0, 8);

  const loved = getBanners(db, "home-loved").flatMap((b) => {
    const base = getProductsBySlugs(db, [String(b.data.productSlug)])[0];
    if (!base) return [];
    return [
      {
        product: {
          ...base,
          priceCents: Number(b.data.priceCents),
          compareAtCents: null,
          inStock: true, // the design shows every card purchasable
          rating: Number(b.data.rating),
          reviewCount: Number(b.data.reviewCount),
        },
        badgeLabel: String(b.data.badgeLabel),
      },
    ];
  });

  return (
    <>
      <HeroSlider slides={getBanners(db, "home-hero")} />
      <CategoryCards cards={getBanners(db, "home-categories")} counts={counts} />
      <Marquee items={getBanners(db, "home-marquee")} />
      <TrendingNow products={trending} />
      <FreshDrops
        banner={getBanners(db, "home-fresh-drops")[0]}
        items={getBanners(db, "home-fresh-items")}
      />
      <FeatureStrip items={getBanners(db, "home-features")} />
      <EditorialBanner banner={getBanners(db, "home-editorial")[0]} />
      <MostLoved items={loved} />
      <FlashSale banner={getBanners(db, "home-flash")[0]} />
      <PersonalBand stories={getBanners(db, "home-testimonials")} bundles={getBundles(db)} />
      <Journal posts={getBanners(db, "home-journal")} />
      <InstagramStrip items={getBanners(db, "home-instagram")} />
    </>
  );
}
