import { SiteChrome } from "@/components/layout/SiteChrome";

// The header reads live categories, so pages render per request (decision-log D-009).
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteChrome>{children}</SiteChrome>;
}
