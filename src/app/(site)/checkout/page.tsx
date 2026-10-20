import type { Metadata } from "next";
import { CheckoutPage, type CheckoutPrefill } from "@/components/checkout/CheckoutPage";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { SHIPPING_COUNTRIES, enabledPaymentMethods } from "@/config/store";
import { getDb } from "@/db/client";
import { defaultAddress } from "@/server/account/addresses";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Checkout" };

/** Figma 3:22268. Guests and signed-in customers both check out (OQ-09); accounts get their default address pre-filled. */
export default async function CheckoutRoute() {
  const user = await getCurrentUser();
  const saved = user ? defaultAddress(getDb(), user.id) : null;
  const prefill: CheckoutPrefill = {
    email: user?.email ?? "",
    firstName: saved?.firstName ?? "",
    lastName: saved?.lastName ?? "",
    company: saved?.company ?? "",
    country: saved?.country ?? SHIPPING_COUNTRIES[0],
    address1: saved?.address1 ?? "",
    address2: saved?.address2 ?? "",
    city: saved?.city ?? "",
    postcode: saved?.postcode ?? "",
    phone: saved?.phone ?? "",
  };
  return (
    <>
      <PageHero title="Checkout" />
      <CheckoutPage methods={enabledPaymentMethods()} prefill={prefill} />
      <BenefitStrip />
    </>
  );
}
