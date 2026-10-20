/**
 * Demo content for the Home page (Figma 3:2290), stored in the `banners` table by slot so the admin
 * can manage it later (ACN-001, P9). Copy and images are the design's placeholder content.
 */
export type BannerSeed = {
  slot: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  image?: string;
  data?: Record<string, unknown>;
};

const img = (name: string) => `/images/home/${name}.jpg`;

const HERO_SLIDE: BannerSeed = {
  slot: "home-hero",
  eyebrow: "Modern cosmetics — Studio edition",
  title: "Glam Defined Perfectly",
  subtitle:
    "Formulated for all day wear with light reflecting minerals and nourishing-serum hydration. Find your custom formula match.",
  ctaLabel: "Shop collection",
  ctaHref: "/shop",
  image: img("hero"),
  data: { badge: { top: "Limited", value: "20%", bottom: "Off" }, cardTitle: "Glow your terms" },
};

export const HOME_BANNERS: BannerSeed[] = [
  // Figma shows three slides (index 01/02/03) but designs only the first; slides 2 and 3 repeat it
  // until the client supplies their own copy (decision-log D-035).
  ...[1, 2, 3].map(() => HERO_SLIDE),

  {
    slot: "home-categories",
    title: "Skincare",
    subtitle: "Cleansers, Serums, Treatments",
    ctaHref: "/shop?category=skincare",
    image: img("cat-skincare"),
    data: {
      index: "01",
      categorySlug: "skincare",
      crop: { width: 117.26, height: 106.75, left: -8.5, top: -6.75 }, // Figma 3:2517 fill crop
    },
  },
  {
    slot: "home-categories",
    title: "Eyes",
    subtitle: "Mascara, Eyeliner, Brow care",
    ctaHref: "/shop?category=eyes",
    image: img("cat-eyes"),
    data: { index: "02", categorySlug: "eyes" },
  },
  {
    slot: "home-categories",
    title: "Lips",
    subtitle: "Bullets, Gloss glaze, Lip liners",
    ctaHref: "/shop?category=lips",
    image: img("cat-lips"),
    data: { index: "03", categorySlug: "lips" },
  },
  {
    slot: "home-categories",
    title: "Face",
    subtitle: "Foundation, Powder, Blush",
    ctaHref: "/shop?category=face",
    image: img("cat-face"),
    data: {
      index: "04",
      categorySlug: "face",
      crop: { width: 109.85, height: 100, left: -5.9, top: 0 }, // Figma 3:2545 fill crop
    },
  },

  // Home "Trending now" cards exactly as designed (Figma 3:2295..3:2671: every card shows $96 / $110, 5 stars, [30]).
  // They link to the real products; the rest of the row is filled from the live collection.
  {
    slot: "home-trending",
    title: "glow-veil-highlighter",
    data: {
      productSlug: "glow-veil-highlighter",
      priceCents: 9600,
      compareAtCents: 11000,
      rating: 5,
      reviewCount: 30,
      badge: "best-seller",
    },
  },
  {
    slot: "home-trending",
    title: "velvet-skin-foundation",
    data: {
      productSlug: "velvet-skin-foundation",
      priceCents: 9600,
      compareAtCents: 11000,
      rating: 5,
      reviewCount: 30,
      badge: "new",
    },
  },
  {
    slot: "home-trending",
    title: "luxe-matte-lipstick",
    data: {
      productSlug: "luxe-matte-lipstick",
      priceCents: 9600,
      compareAtCents: 11000,
      rating: 5,
      reviewCount: 30,
      badge: "trending",
    },
  },
  {
    slot: "home-trending",
    title: "glam-edit-eyeshadow",
    data: {
      productSlug: "glam-edit-eyeshadow",
      priceCents: 9600,
      compareAtCents: 11000,
      rating: 5,
      reviewCount: 30,
      badge: "hot",
    },
  },
  {
    slot: "home-trending",
    title: "the-renewal-serum",
    data: {
      productSlug: "the-renewal-serum",
      priceCents: 9600,
      compareAtCents: 11000,
      rating: 5,
      reviewCount: 30,
      badge: "trending",
    },
  },

  // Home "Most loved product" cards as designed (Figma 3:2850..3:2944: $96, 5 stars, [30], custom tags).
  {
    slot: "home-loved",
    title: "soft-focus-concealer",
    data: {
      productSlug: "soft-focus-concealer",
      badgeLabel: "#Best seller",
      priceCents: 9600,
      rating: 5,
      reviewCount: 30,
    },
  },
  {
    slot: "home-loved",
    title: "glass-glow-primer",
    data: {
      productSlug: "glass-glow-primer",
      badgeLabel: "Award wining",
      priceCents: 9600,
      rating: 5,
      reviewCount: 30,
    },
  },
  {
    slot: "home-loved",
    title: "soft-sculpt-bronzer",
    data: {
      productSlug: "soft-sculpt-bronzer",
      badgeLabel: "Top rated",
      priceCents: 9600,
      rating: 5,
      reviewCount: 30,
    },
  },
  {
    slot: "home-loved",
    title: "precision-brow-pencil",
    data: {
      productSlug: "precision-brow-pencil",
      badgeLabel: "Trending",
      priceCents: 9600,
      rating: 5,
      reviewCount: 30,
    },
  },

  { slot: "home-marquee", title: "100% natural ingredients" },
  { slot: "home-marquee", title: "Fragrance-free options" },
  { slot: "home-marquee", title: "Refillable glass" },
  { slot: "home-marquee", title: "Cruelty-free" },

  {
    slot: "home-fresh-drops",
    eyebrow: "New collection",
    title: "Sculpt and glow multiplate",
    ctaLabel: "Add to cart",
    ctaHref: "/shop?badge=new",
    image: img("fresh-multiplate"),
    data: {
      priceCents: 9600,
      badge: { line1: "Free", line2: "Shipping", line3: "Only today" },
      productSlug: "glam-edit-eyeshadow",
    },
  },

  {
    slot: "home-fresh-items",
    eyebrow: "Limited shade",
    title: "Lift & define brow gel",
    subtitle: "Brow Gel · 6ml",
    ctaHref: "/product/lift-and-define-brow-gel",
    image: img("drops-1"),
    data: {
      productSlug: "lift-and-define-brow-gel",
      priceCents: 9600,
      compareAtCents: 11000,
      tone: "dark",
    },
  },
  {
    slot: "home-fresh-items",
    eyebrow: "New formula",
    title: "Flush cream blush",
    subtitle: "Cream Blush · 7g",
    ctaHref: "/product/flush-cream-blush",
    image: img("drops-2"),
    data: {
      productSlug: "flush-cream-blush",
      priceCents: 9600,
      compareAtCents: 11000,
      tone: "light",
      crop: { height: 124.14, top: -17.26 },
    },
  },
  {
    slot: "home-fresh-items",
    eyebrow: "Essential fix",
    title: "Lift & define brow gel",
    subtitle: "Spray · 80ml",
    ctaHref: "/product/lift-and-define-brow-gel",
    image: img("drops-3"),
    data: {
      productSlug: "lift-and-define-brow-gel",
      priceCents: 9600,
      compareAtCents: 11000,
      tone: "light",
    },
  },

  // Feature strip icons are the design's own artwork (public/images/home/icons); `inset` is the
  // icon's placement inside its 48px box (Figma 3:2474..3:2495), in percent: top/right/bottom/left.
  {
    slot: "home-features",
    title: "Thoughtful formulation",
    subtitle: "Nine products. No filler ingredients, no seasonal launches.",
    data: { icon: "/images/home/icons/feat-1.svg" },
  },
  {
    slot: "home-features",
    title: "Sensory texture",
    subtitle: "Weightless finishes developed over eighteen months.",
    data: { icon: "/images/home/icons/feat-2.svg", inset: [10.42, 13.49, 10.42, 10.65] },
  },
  {
    slot: "home-features",
    title: "Conscious beauty",
    subtitle: "Refillable glass, recycled cartons, carbon-neutral delivery.",
    data: { icon: "/images/home/icons/feat-3.svg" },
  },
  {
    slot: "home-features",
    title: "Proven actives",
    subtitle: "Clinical concentrations, published research, honest claims.",
    data: { icon: "/images/home/icons/feat-4-quality.svg", inset: [10.69, 19.01, 10.15, 19.01] },
  },

  {
    slot: "home-editorial",
    eyebrow: "The 2026 statement",
    title: "The right color looks good on you in each moment",
    subtitle:
      "Reject beige conformity. Our hyper-pigment matrix uses micronized gemstone particles to deliver in unapologetic saturation that moves your expressions.",
    ctaLabel: "Explore collection",
    ctaHref: "/shop?category=makeup",
    image: img("editorial-model"),
    data: {
      secondaryImage: img("editorial-lipstick"),
      script: "More color more you",
      film: "Runway film (0:45)",
    },
  },

  {
    slot: "home-flash",
    eyebrow: "Flash sales",
    title: "Glow more, spend less",
    subtitle:
      "Receive 20% OFF selected high-pigment lips and serum foundations with promotional code",
    ctaLabel: "Shop flat 20% off",
    ctaHref: "/shop?availability=on-sale",
    image: img("flash-sale"),
    data: { code: "VELOUR20" },
  },

  {
    slot: "home-testimonials",
    title: "Glam edit eyeshadow",
    subtitle: "Blending took 30 seconds. Seamless skin for more transition.",
    ctaHref: "/product/glam-edit-eyeshadow",
    image: img("story-1"),
    data: { handle: "@chloeglows", tagline: "Nice one", rating: 5 },
  },
  {
    slot: "home-testimonials",
    title: "Glow veil highlighter",
    subtitle: "The red doesn't bleed even through 6 hours under studio heat.",
    ctaHref: "/product/glow-veil-highlighter",
    image: img("story-2"),
    data: {
      handle: "@alexperrymakeup",
      tagline: "Most loveable",
      rating: 5,
      crop: { width: 114.44, height: 119.34, left: -7.22, top: -17.2 }, // Figma 3:3030
    },
  },
  {
    slot: "home-testimonials",
    title: "The renewal serum",
    subtitle: "Finally a foundation serum that make behaves like premium skincare.",
    ctaHref: "/product/the-renewal-serum",
    image: img("story-3"),
    data: {
      handle: "@elena_artistry",
      tagline: "I love the smell",
      rating: 5,
      crop: { width: 100, height: 104.28, left: 0, top: -4.34 }, // Figma 3:3085
    },
  },
  {
    slot: "home-testimonials",
    title: "Glow veil highlighter",
    subtitle: "The red doesn't bleed even through 6 hours under studio heat.",
    ctaHref: "/product/glow-veil-highlighter",
    image: img("story-4"),
    data: {
      handle: "@alexperrymakeup",
      tagline: "Best ever cream",
      rating: 5,
      crop: { width: 104.85, height: 109.34, left: -2.43, top: -2.14 }, // Figma 3:3060
    },
  },

  {
    slot: "home-journal",
    title: "Inside the formula behind beautiful skin.",
    ctaHref: "/blog",
    image: img("journal-1"),
    data: { tag: "Rituals", date: "2026-10-08", readMinutes: 6 },
  },
  {
    slot: "home-journal",
    title: "Skin, simplified for a smarter skincare routine.",
    ctaHref: "/blog",
    image: img("journal-2"),
    data: { tag: "Guides", date: "2026-10-08", readMinutes: 6 },
  },
  {
    slot: "home-journal",
    title: "The evening ritual for rested, radiant skin.",
    ctaHref: "/blog",
    image: img("journal-3"),
    data: { tag: "Science", date: "2026-10-08", readMinutes: 6 },
  },

  { slot: "home-instagram", title: "Whipped cream texture swatch", image: img("ig-1") },
  { slot: "home-instagram", title: "Model holding a Cosmia face cream", image: img("ig-2") },
  { slot: "home-instagram", title: "Serum and jar on a stone tray", image: img("ig-3") },
  { slot: "home-instagram", title: "Portrait with a soft glow", image: img("ig-4") },
  { slot: "home-instagram", title: "Portrait in a fur collar", image: img("ig-5") },
  { slot: "home-instagram", title: "Flat lay of Cosmia products", image: img("ig-6") },

  {
    slot: "home-newsletter",
    title: "Get skincare tips, product drops and exclusive offers.",
    image: img("footer-newsletter"),
  },
];

/** The flash-sale banner ends 2 days 8 hours 30 minutes 16 seconds after seeding (as in the design). */
export const FLASH_SALE_DURATION_MS = ((2 * 24 + 8) * 3600 + 30 * 60 + 16) * 1000;
