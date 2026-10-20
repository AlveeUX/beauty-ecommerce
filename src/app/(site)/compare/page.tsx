import type { Metadata } from "next";
import { ComparePage } from "@/components/lists/ComparePage";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Compare" };

export default function CompareRoute() {
  return (
    <>
      <PageHero title="Compare" />
      <ComparePage />
      <BenefitStrip />
    </>
  );
}
