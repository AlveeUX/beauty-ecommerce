/**
 * The ten Shop listing layouts of the design (PRD OQ-06). The chosen one travels in the URL as `?layout=`
 * so every filter, sort and page link keeps it; `left` is the default (Figma 3:4833).
 */
export const SHOP_LAYOUTS = [
  "left",
  "right",
  "list-left",
  "list-right",
  "load-more",
  "top-filter",
  "list-top-filter",
  "horizontal",
  "list-horizontal",
  "filter-drawer",
] as const;
export type ShopLayout = (typeof SHOP_LAYOUTS)[number];
export const DEFAULT_SHOP_LAYOUT: ShopLayout = "left";

export type ShopLayoutTraits = {
  /** Products as cards in a grid, or as wide rows with a description. */
  view: "grid" | "list";
  /** Where the filters live. */
  filters: "sidebar-left" | "sidebar-right" | "panel" | "dropdowns" | "drawer";
  columns: 3 | 4;
  /** A "Load more" button instead of numbered pages. */
  loadMore: boolean;
  /** The layout the grid/list switch leads to. */
  swap: ShopLayout;
  /** Figma frame, for the docs and the tests. */
  figma: string;
};

export const SHOP_LAYOUT_TRAITS: Record<ShopLayout, ShopLayoutTraits> = {
  left: {
    view: "grid",
    filters: "sidebar-left",
    columns: 3,
    loadMore: false,
    swap: "list-left",
    figma: "3:4833",
  },
  right: {
    view: "grid",
    filters: "sidebar-right",
    columns: 3,
    loadMore: false,
    swap: "list-right",
    figma: "3:40462",
  },
  "list-left": {
    view: "list",
    filters: "sidebar-left",
    columns: 3,
    loadMore: false,
    swap: "left",
    figma: "3:38190",
  },
  "list-right": {
    view: "list",
    filters: "sidebar-right",
    columns: 3,
    loadMore: false,
    swap: "right",
    figma: "3:39326",
  },
  "load-more": {
    view: "grid",
    filters: "sidebar-left",
    columns: 3,
    loadMore: true,
    swap: "list-left",
    figma: "3:5980",
  },
  "top-filter": {
    view: "grid",
    filters: "panel",
    columns: 4,
    loadMore: false,
    swap: "list-top-filter",
    figma: "3:7112",
  },
  "list-top-filter": {
    view: "list",
    filters: "panel",
    columns: 4,
    loadMore: false,
    swap: "top-filter",
    figma: "3:8330",
  },
  horizontal: {
    view: "grid",
    filters: "dropdowns",
    columns: 4,
    loadMore: false,
    swap: "list-horizontal",
    figma: "3:10357",
  },
  "list-horizontal": {
    view: "list",
    filters: "dropdowns",
    columns: 4,
    loadMore: false,
    swap: "horizontal",
    figma: "3:9418",
  },
  "filter-drawer": {
    view: "grid",
    filters: "drawer",
    columns: 4,
    loadMore: false,
    swap: "list-left",
    figma: "3:11424",
  },
};

export function parseShopLayout(value: string | undefined): ShopLayout | null {
  return (SHOP_LAYOUTS as readonly string[]).includes(value ?? "") ? (value as ShopLayout) : null;
}
