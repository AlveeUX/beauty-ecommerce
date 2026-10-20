import type { Metadata } from "next";
import { FaqPage } from "@/components/content/FaqPage";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "FAQs" };

/** Figma 3:27601. No benefit strip on this page: the footer follows the questions. */
export default function FaqsRoute() {
  return (
    <>
      <PageHero title="FAQs" />
      <FaqPage />
    </>
  );
}
