import type { BlogBlock } from "@/lib/blog";

/**
 * Journal posts from the Blog frames (Figma 3:25805 grid, 3:26684 details). Titles, categories, excerpts
 * and images are the design's; every post is dated 08 Oct 2026 there (a placeholder). Only the first post
 * has a designed body; the others reuse its paragraphs until real articles exist (Assumption, D-041).
 */
const EXCERPT_A = "Refined daily ritual design replenish moisture, soften complexion, and bring.";

type Seed = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
};

export const BLOG_POSTS: Seed[] = [
  {
    slug: "inside-the-formula-behind-beautiful-skin",
    title: "Inside the formula behind beautiful skin.",
    excerpt: EXCERPT_A,
    category: "Science",
    tags: ["Barrier", "Hydration", "Routine"],
  },
  {
    slug: "skin-simplified-for-smarter-skincare-routine",
    title: "Skin, simplified for smarter skincare routine.",
    excerpt: EXCERPT_A,
    category: "Guides",
    tags: ["Routine", "SPF"],
  },
  {
    slug: "the-evening-ritual-for-rested-radiant-skin",
    title: "The evening ritual for rested, radiant skin.",
    excerpt: EXCERPT_A,
    category: "Rituals",
    tags: ["Evening", "Glow"],
  },
  {
    slug: "the-ritual-behind-skin-that-feels-truly-refreshed",
    title: "The ritual behind skin that feels truly refreshed.",
    excerpt: "Thoughtful skincare ritual can turn everyday care into a calming moment.",
    category: "Skincare",
    tags: ["Hydration", "Routine"],
  },
  {
    slug: "cleanse-to-glow-understand-every-step-of-your-ritual",
    title: "Cleanse to glow: understand every step of your ritual",
    excerpt: "Every step has a purpose, from the first cleanse to the final of hydration.",
    category: "Cleansing",
    tags: ["Cleansing", "Glow"],
  },
  {
    slug: "the-ingredients-that-give-your-skincare-beautiful-finish",
    title: "The ingredients that give your skincare beautiful finish",
    excerpt: "Behind every refined formula is a carefully combination of ingredients.",
    category: "Ingredients",
    tags: ["Ingredients", "Serum"],
  },
  {
    slug: "the-little-skincare-habits-that-make-a-noticeable-difference",
    title: "The little skincare habits that make a noticeable",
    excerpt: "Small changes can make your daily ritual feel more effective.",
    category: "Beauty",
    tags: ["Routine", "SPF"],
  },
  {
    slug: "what-your-skin-really-needs-for-a-healthy-looking-glow",
    title: "What your skin really needs for a healthy-looking.",
    excerpt: "Great skin starts with understanding what it needs. Explore simple essentials.",
    category: "Glow",
    tags: ["Glow", "Barrier"],
  },
  {
    slug: "smarter-approach-to-building-daily-skincare-routine",
    title: "Smarter approach to building daily skincare routine.",
    excerpt: "Well-planned routine doesn’t need countless products. Learn how to create.",
    category: "Routine",
    tags: ["Routine", "Cleansing"],
  },
  {
    slug: "the-evening-ritual-your-skin-looks-forward",
    title: "The evening ritual your skin looks forward.",
    excerpt: "Slow down at the end of the day with a comforting nighttime ritual.",
    category: "Night",
    tags: ["Evening", "Hydration"],
  },
  {
    slug: "preparing-your-skin-for-makeup-that-looks-natural",
    title: "Preparing your skin for makeup that looks natural.",
    excerpt: "Beautiful makeup begins with a well-prepared canvas. Discover simple skincare.",
    category: "Makeup",
    tags: ["Glow", "SPF"],
  },
  {
    slug: "how-to-create-a-skincare-routine-that-works",
    title: "How to create a skincare routine that works.",
    excerpt: "Your routine should feel personal, practical, and easy to maintain.",
    category: "Serum",
    tags: ["Serum", "Routine"],
  },
];

const IMG = "/images/blog";

/** The designed article (Figma 3:26846), used for every post until real articles are written. */
export const ARTICLE_BLOCKS = (title: string): BlogBlock[] => [
  {
    type: "p",
    text: "Beautiful skin is rarely about doing more. It is about understanding what your skin needs and choosing formulas that support it consistently. From gentle cleansers to nourishing moisturizers and targeted serums, every product has a role to play in creating a balanced, comfortable, healthy-looking complexion. Behind every effective skincare formula is a thoughtful combination of ingredients.",
  },
  {
    type: "p",
    text: "Some ingredients help replenish moisture, while others support the skin barrier, smooth the appearance of texture, or help brighten a dull-looking complexion. Ingredients such as hyaluronic acid are commonly used to attract and retain moisture, while ceramides help support the skin's natural barrier.",
  },
  {
    type: "checklist",
    items: [
      "Support Your Barrier",
      "Simplify Your Routine",
      "Choose Better Ingredients",
      "Give It Time",
      "Keep Skin Hydrated",
      "Stay Consistent Daily",
      "Protect From Sun",
    ],
  },
  {
    type: "quote",
    text: "“Beautiful skin starts with understanding what your skin needs and giving it consistent, thoughtful care every day, while embracing your skin’s natural beauty and balance.”",
    by: "Marta Lindqvist · Director of Skinlama",
  },
  {
    type: "p",
    text: "The skin barrier is one of the most important parts of a healthy-looking complexion. When it is well supported, skin can feel softer, smoother, and more comfortable. When it becomes compromised, dryness, tightness, and sensitivity can become more noticeable. A simple routine can go a long way. Gentle cleansing, regular moisturization, and daily sunscreen can help maintain the skin barrier while avoiding unnecessary irritation.",
  },
  {
    type: "images",
    srcs: [`${IMG}/details-pair-1.jpg`, `${IMG}/details-pair-2.jpg`],
    alts: [
      `Skincare formulas being tested for ${title}`,
      "A researcher examining a formula sample",
    ],
  },
  {
    type: "p",
    text: "Beautiful-looking skin is influenced by much more than skincare alone. Sleep, hydration, nutrition, stress, sun exposure, and everyday habits can all play a role in how your skin looks and feels. The best routine is one that feels realistic enough to follow every day. Start with the essentials, choose ingredients thoughtfully, and give your routine time to work. Instead of searching for one perfect product, focus on creating a balanced.",
  },
  {
    type: "note",
    lead: "Prefer to keep it simple?",
    text: " Start with what your skin needs, choose formulas that feel right, and give them time to work. No complicated routine, no endless products.",
  },
  {
    type: "p",
    text: "Beautiful skin is built through small, thoughtful choices made consistently. Understand your skin, choose formulas with purpose, and create a routine that feels effortless enough to follow every day. With the right care, your skincare ritual can become more than a routine—it can become a moment of self-care.",
  },
];

/** Comments shown under the first post in the design (Figma 3:26910); the replies point at the parent by index. */
export const SEED_COMMENTS = [
  {
    name: "Eleanor Pena",
    avatar: `${IMG}/avatar-eleanor.jpg`,
    body: "“Such a thoughtful read. I especially loved the reminder that a simple, consistent routine can be more effective than constantly trying new products.”",
    parent: null,
  },
  {
    name: "Michel Man",
    avatar: `${IMG}/avatar-michel.jpg`,
    body: "Thank you, Sarah! We completely agree—consistency and thoughtful choices can make skincare feel much simpler.",
    parent: 0,
  },
  {
    name: "Darrell Steward",
    avatar: `${IMG}/avatar-darrell.jpg`,
    body: "“Beautifully written and genuinely helpful. The focus on understanding your skin before choosing products is something more people should talk about.”",
    parent: null,
  },
] as const;
