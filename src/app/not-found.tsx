import { NotFoundPage } from "@/components/content/NotFoundPage";
import { SiteChrome } from "@/components/layout/SiteChrome";

export const metadata = { title: "Page not found" };

/** 404, Figma 3:28374 (listed in the file as "FAQs, second frame"): big 404, headline, one line, one button. */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundPage />
    </SiteChrome>
  );
}
