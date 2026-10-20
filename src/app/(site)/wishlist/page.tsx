import type { Metadata } from "next";
import { WishlistPage } from "@/components/lists/WishlistPage";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistRoute() {
  return (
    <>
      <PageHero title="Wishlist" />
      <WishlistPage />
      <BenefitStrip />
    </>
  );
}
