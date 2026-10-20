import type { Metadata } from "next";
import { AboutPage } from "@/components/content/AboutPage";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Cosmia started in a small studio in 2014 with one rule: if we wouldn't put it on our own faces every day, we don't sell it.",
};

/** Figma 3:28603. This page has no banner of its own: the dark hero starts right under the header. */
export default function AboutRoute() {
  return <AboutPage />;
}
