import type { Metadata } from "next";
import { CartPage } from "@/components/cart/CartPage";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Cart" };

export default function CartRoute() {
  return (
    <>
      <PageHero title="Cart" />
      <CartPage />
      <BenefitStrip />
    </>
  );
}
