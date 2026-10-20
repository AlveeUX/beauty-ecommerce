import { notFound } from "next/navigation";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { ProductCard, type ProductCardData } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Component catalog (dev)", robots: { index: false } };

const SAMPLES: ProductCardData[] = [
  {
    slug: "glow-veil-highlighter",
    name: "Glow veil highlighter",
    label: "Highlighter · 8g",
    priceCents: 9600,
    compareAtCents: 11000,
    rating: 5,
    reviewCount: 30,
    badge: "new",
    image: "/images/products/glow-veil-highlighter.png",
  },
  {
    slug: "the-renewal-serum",
    name: "The renewal serum",
    label: "Serum · 30ml",
    priceCents: 4800,
    rating: 5,
    reviewCount: 184,
    badge: "best-seller",
    image: "/images/products/the-renewal-serum.png",
  },
  {
    slug: "luxe-matte-lipstick",
    name: "Luxe matte lipstick",
    label: "Lipstick · 3.5g",
    priceCents: 2100,
    compareAtCents: 2600,
    rating: 4,
    reviewCount: 97,
    badge: "hot",
    image: "/images/products/luxe-matte-lipstick.png",
    inStock: false,
  },
];

/** Dev-only catalog of shared components for visual checks. Not available in production builds. */
export default function ComponentCatalog() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PageHero title="Shop" crumbs={[{ label: "Shop" }]} />
      <div className="container" style={{ paddingBlock: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 308px)", gap: 30 }}>
          {SAMPLES.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={i === 0} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          <Button icon="bell">Subscribe</Button>
          <Button variant="dark" icon="arrow-up-right">
            Apply coupon
          </Button>
          <Button variant="outline">Outline</Button>
        </div>
      </div>
      <BenefitStrip />
    </>
  );
}
