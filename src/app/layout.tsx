import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource/prata/latin-400.css";
import "@fontsource/allura/latin-400.css";
import { StoreProviders } from "@/components/cart/StoreProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cosmia | Skincare & Cosmetics", template: "%s | Cosmia" },
  description: "Skincare and cosmetics, thoughtfully formulated.",
};

/**
 * Root layout: document shell only. The visible chrome (header/footer) lives in the route-group
 * layouts: (site) for standard pages and (home) for the Home variant.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body id="top">
        <StoreProviders>{children}</StoreProviders>
      </body>
    </html>
  );
}
