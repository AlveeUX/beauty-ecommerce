import type { ProductContent } from "../../lib/product-content";

/**
 * Long-form content for the PDP exemplar (Figma frame 3:12708). The copy is the design's placeholder
 * text with the product name adapted; the real copy is authored in the admin (decision-log D-021).
 */
export const SERUM_SHORT =
  "Rich, soothing moisturizer in that helps strengthen the skin barrier delivering lasting hydration. Its nourishing formula helps a calm outer barrier.";

export const SERUM_INCI =
  "AQUA (WATER/EAU), ISODODECANE, NIACINAMIDE (5%), CAPRYLIC/CAPRIC TRIGLYCERIDE, SQUALANE (OLIVE DERIVED), GLYCERIN, POLYGLYCERYL-4 ISOSTEARATE, PALMITOYL TRIPEPTIDE-38, SODIUM HYALURONATE CROSS-POLYMER, CENTELLA ASIATICA LEAF EXTRACT, CAMELLIA SINENSIS SEED OIL, TOCOPHEROL (VITAMIN E), SILICA, DISTEARDIMONIUM HECTORITE, PROPYLENE CARBONATE, PHENOXYETHANOL, ETHYLHEXYLGLYCERIN. [+/- MAY CONTAIN: CI 77891 (TITANIUM DIOXIDE)].";

export const SERUM_CONTENT: ProductContent = {
  formula: {
    title: "The formula & 24h skin health benefits",
    intro:
      "Engineered in our Paris studio, The Renewal Serum delivers a beautifully weightless, medium-buildable radiance that enhances the complexion without settling into micro-expression lines or emphasizing texture. Its innovative formula combine biomimetic pigments with a pure 72% serum matrix, creating a seamless veil of luminous coverage that feels as comfortable as skincare.",
    items: [
      {
        icon: "rotate",
        title: "Zero flashback",
        text: "Designed to maintain a natural-looking, soft-focus complexion under different lighting.",
      },
      {
        icon: "ban",
        title: "Non-Comedogenic",
        text: "Breathable, lightweight formula created to feel comfortable on the skin maintain fresh.",
      },
      {
        icon: "calendar",
        title: "Skincare routine",
        text: "The flexible, buildable texture allows you to customize your coverage from sheer.",
      },
      {
        icon: "sun",
        title: "Skin-Loving formula",
        text: "Powered by a serum-rich base skin-conditioning ingredients, the formula combines.",
      },
    ],
  },
  usage: {
    title: "How to apply backstage",
    intro:
      "For a seamless backstage finish, shake the bottle well before use and apply a small amount of serum to clean, moisturized skin. Blend outward from the center of the face using fingertips, a damp sponge, or a complexion brush, building coverage gradually where needed.",
    prepTitle: "Prep and enhance:",
    prep: [
      "Prep first — start with clean, moisturized skin for smoother application.",
      "Shake well — Mix the serum and pigments evenly before dispensing.",
      "Start small — Apply a thin layer and build coverage gradually.",
      "Target areas — Extra product to areas that need more coverage.",
    ],
    finishTitle: "Perfect and finish:",
    finish: [
      "Build Your Routine — Concentrate coverage on areas uneven tone.",
      "Target areas — Focus additional product on blemishes correction.",
      "Start small — Blend with fingertips, a sponge, or brush for finish.",
      "Natural finish — Let the formula settle for a soft, skin-like radiance.",
    ],
  },
  ingredients: {
    title: "Full ingredient transparency",
    freeOf: "Parabens, Phthalates, Synthetic Sulfates, Mineral Oils, Fragrance, Talc.",
    inci: SERUM_INCI,
  },
  clinical: {
    title: "Clinical trials & consumer testing",
    stats: [
      {
        value: "98%",
        label: "Observed instant glow",
        text: "Verified by an independent clinical panel of skincare experts.",
      },
      {
        value: "94%",
        label: "Smoother skin texture",
        text: "After 14 consecutive days of consistent daily wear and use.",
      },
      {
        value: "100%",
        label: "Weightless feel",
        text: "Zero cakey build-up reported throughout 24-hour test.",
      },
    ],
  },
  highlights: {
    title: "Formulated for renewal",
    items: [
      {
        eyebrow: "Triple molecular",
        title: "Hyaluronic Tri-Complex",
        text: "Permeates multiple epidermis layers hydration inward, continuous plumping lines maintaining natural dewiness surface tackiness.",
        image: "/images/ingredients/hyaluronic-tri-complex.jpg",
      },
      {
        eyebrow: "Firming peptide",
        title: "Palmitoyl Tripeptide-38",
        text: "Stimulates six major structural components of the skin matrix, rebuilding skin elasticity and refining skin canvas texture.",
        image: "/images/ingredients/palmitoyl-tripeptide-38.jpg",
      },
      {
        eyebrow: "Pore balancing",
        title: "5% Pure Niacinamide",
        text: "Regulates sebum secretion, evens discoloration from post-acne marks, and calms surface redness for effortless backstage.",
        image: "/images/ingredients/pure-niacinamide.jpg",
      },
    ],
  },
};

export const SERUM_GALLERY = [
  {
    url: "/images/products/the-renewal-serum/gallery-1.jpg",
    alt: "The renewal serum dropper bottle on a blush backdrop",
  },
  {
    url: "/images/products/the-renewal-serum/gallery-2.jpg",
    alt: "The renewal serum on a dark stone surface with botanicals",
  },
  {
    url: "/images/products/the-renewal-serum/gallery-3.jpg",
    alt: "A hand holding a drop of serum against a crimson backdrop",
  },
  {
    url: "/images/products/the-renewal-serum/gallery-4.jpg",
    alt: "A model applying the serum with a dropper",
  },
  {
    url: "/images/products/the-renewal-serum/gallery-5.jpg",
    alt: "The renewal serum product card with key benefits",
  },
];
