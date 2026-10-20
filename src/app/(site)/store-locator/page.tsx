import type { Metadata } from "next";
import { StoreLocator } from "@/components/content/StoreLocator";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { currentTimeMs } from "@/lib/time";

export const metadata: Metadata = { title: "Store location" };

/** Figma 3:24455. Opening status is worked out from the server clock on each request. */
export default function StoreLocatorRoute() {
  return (
    <>
      <PageHero title="Store location" />
      <StoreLocator now={new Date(currentTimeMs())} />
      <BenefitStrip />
    </>
  );
}
