/**
 * Header menus (Figma 3:1452 "Mega menu", 3:1749 "Menu dropdown").
 *
 * The Shop mega menu in the design lists theme layout variants (grid left sidebar, list right sidebar,
 * gallery 2 column, ...). Entries without a page of their own point at the nearest working page and
 * are flagged `built: false`; the shop listing layouts and the product layouts are all built (D-038, D-045). They keep the
 * design's labels so the client can decide which variants to ship. See docs/decision-log.md D-034.
 */
export type NavBadge = "hot" | "new";

export type MenuLink = {
  label: string;
  href: string;
  badge?: NavBadge;
  /** False for design variants that have no page of their own yet. */
  built?: boolean;
  /** Highlight as the current page only when the path equals `href` (false for duplicate targets). */
  match?: boolean;
};

export type MegaColumn = { title: string; links: MenuLink[] };
export type MegaPromo = { label: string; href: string; image: string; alt: string };

const SHOP = "/shop";
const PRODUCT = "/product/the-renewal-serum";
const variant = (label: string, href: string, badge?: NavBadge): MenuLink => ({
  label,
  href,
  badge,
  built: false,
  match: false,
});

const built = (label: string, href: string, badge?: NavBadge): MenuLink => ({
  label,
  href,
  badge,
  built: true,
  match: false,
});

export const SHOP_MEGA: { columns: MegaColumn[]; promos: MegaPromo[] } = {
  columns: [
    {
      title: "Shop pages",
      links: [
        { label: "Shop default", href: SHOP, built: true },
        built("Grid left sidebar", `${SHOP}?layout=left`),
        built("Grid right sidebar", `${SHOP}?layout=right`),
        built("List left sidebar", `${SHOP}?layout=list-left`),
        built("List right sidebar", `${SHOP}?layout=list-right`),
        built("Load more", `${SHOP}?layout=load-more`),
        built("Top filter", `${SHOP}?layout=top-filter`, "new"),
        built("Horizontal filter", `${SHOP}?layout=horizontal`),
        built("Filter drawer", `${SHOP}?layout=filter-drawer`),
        variant("Grid 3 columns", SHOP),
        variant("Grid 4 columns", SHOP),
      ],
    },
    {
      title: "Shop details",
      links: [
        { label: "Detail default", href: PRODUCT, built: true, match: false },
        {
          label: "Subscribe & save",
          href: `${PRODUCT}?layout=subscribe-and-save`,
          built: true,
          match: false,
          badge: "hot",
        },
        {
          label: "On sale countdown",
          href: `${PRODUCT}?layout=on-sale-countdown`,
          built: true,
          match: false,
        },
        {
          label: "Thumbnail left",
          href: `${PRODUCT}?layout=thumbnail-left`,
          built: true,
          match: false,
        },
        {
          label: "Thumbnail right",
          href: `${PRODUCT}?layout=thumbnail-right`,
          built: true,
          match: false,
        },
        {
          label: "Gallery 1 column",
          href: `${PRODUCT}?layout=gallery-1-column`,
          built: true,
          match: false,
        },
        {
          label: "Gallery 2 column",
          href: `${PRODUCT}?layout=gallery-2-column`,
          built: true,
          match: false,
        },
        { label: "Out of stock", href: "/product/glass-glow-primer", built: true },
        variant("Sticky add to card", PRODUCT),
        {
          label: "Inner zoom",
          href: `${PRODUCT}?layout=inner-zoom`,
          built: true,
          match: false,
          badge: "hot",
        },
        {
          label: "External zoom",
          href: `${PRODUCT}?layout=external-zoom`,
          built: true,
          match: false,
        },
      ],
    },
    {
      title: "Shop essentials",
      links: [
        { label: "Cart", href: "/cart" },
        { label: "Wishlist", href: "/wishlist" },
        { label: "Checkout", href: "/checkout" },
        { label: "My account", href: "/login" },
        { label: "Order track", href: "/track-order", badge: "hot" },
        { label: "Compare", href: "/compare", badge: "new" },
        { label: "Store locator", href: "/store-locator" },
        { label: "Privacy policy", href: "/policy/privacy" },
      ],
    },
  ],
  promos: [
    {
      label: "Best seller",
      href: "/shop?badge=best-seller",
      image: "/images/menu/best-seller.jpg",
      alt: "Cosmia cream, lotion and jar on a stone",
    },
    {
      label: "New arrival",
      href: "/shop?badge=new",
      image: "/images/menu/new-arrival.jpg",
      alt: "Model applying Cosmia face cream",
    },
  ],
};

export const PAGES_LINKS: MenuLink[] = [
  { label: "About us", href: "/about" },
  { label: "Contact us", href: "/contact" },
  { label: "FAQs", href: "/faqs" },
  { label: "Store locator", href: "/store-locator" },
  { label: "Track order", href: "/track-order" },
  { label: "Privacy policy", href: "/policy/privacy" },
  { label: "Login", href: "/login" },
];

export const JOURNAL_LINKS: MenuLink[] = [
  { label: "Blog grid", href: "/blog" },
  { label: "Blog list", href: "/blog?layout=list" },
  { label: "Blog standard", href: "/blog?layout=standard" },
  { label: "Blog left sidebar", href: "/blog?layout=sidebar-left" },
  { label: "Blog right sidebar", href: "/blog?layout=sidebar-right" },
  { label: "Blog details", href: "/blog/inside-the-formula-behind-beautiful-skin" },
];
