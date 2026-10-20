/**
 * Product page layouts (PRD-012, Figma group "Product details", 11 frames). Every layout is the same
 * route and the same data; only the gallery, a few purchase rows and the zoom differ. "Out of stock"
 * (3:16432) is a state of every layout, not a layout of its own.
 *
 * The names follow the Figma frame names. Note: in the frames, "Thumbnail right" draws the thumbnail
 * column on the LEFT of the main image and "Thumbnail left" draws it on the right; the build copies
 * the drawings (open question for the client, decision-log D-038).
 */
export const PDP_LAYOUTS = [
  "details-default",
  "product-color",
  "subscribe-and-save",
  "on-sale-countdown",
  "thumbnail-right",
  "thumbnail-left",
  "gallery-1-column",
  "gallery-2-column",
  "inner-zoom",
  "external-zoom",
] as const;

export type PdpLayout = (typeof PDP_LAYOUTS)[number];

export const PDP_LAYOUT_LABEL: Record<PdpLayout, string> = {
  "details-default": "Details default",
  "product-color": "Product color",
  "subscribe-and-save": "Subscribe and save",
  "on-sale-countdown": "On sale countdown",
  "thumbnail-right": "Thumbnail right",
  "thumbnail-left": "Thumbnail left",
  "gallery-1-column": "Gallery 1 column",
  "gallery-2-column": "Gallery 2 column",
  "inner-zoom": "Inner zoom",
  "external-zoom": "External zoom",
};

export function parsePdpLayout(value: unknown): PdpLayout | null {
  return typeof value === "string" && (PDP_LAYOUTS as readonly string[]).includes(value)
    ? (value as PdpLayout)
    : null;
}

export type GalleryMode = "below" | "thumbs-start" | "thumbs-end" | "grid-1" | "grid-2";
export type ZoomMode = "none" | "inner" | "external";

/** How the gallery is drawn for each layout. */
export const GALLERY_FOR: Record<PdpLayout, { mode: GalleryMode; zoom: ZoomMode }> = {
  "details-default": { mode: "below", zoom: "none" },
  "product-color": { mode: "below", zoom: "none" },
  "subscribe-and-save": { mode: "below", zoom: "none" },
  "on-sale-countdown": { mode: "below", zoom: "none" },
  "thumbnail-right": { mode: "thumbs-start", zoom: "none" },
  "thumbnail-left": { mode: "thumbs-end", zoom: "none" },
  "gallery-1-column": { mode: "grid-1", zoom: "none" },
  "gallery-2-column": { mode: "grid-2", zoom: "none" },
  "inner-zoom": { mode: "below", zoom: "inner" },
  "external-zoom": { mode: "below", zoom: "external" },
};
