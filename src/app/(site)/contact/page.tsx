import type { Metadata } from "next";
import { ContactPage } from "@/components/content/ContactPage";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Contact us" };

/** Figma 3:27227. This page has no benefit strip: the footer follows the questions. */
export default function ContactRoute() {
  return (
    <>
      <PageHero title="Contact us" />
      <ContactPage />
    </>
  );
}
