import type { Db } from "../client";
import {
  appMeta,
  banners,
  blogComments,
  blogPosts,
  categories,
  collectionProducts,
  collections,
  colors,
  inventory,
  productCategories,
  productColors,
  productImages,
  productTags,
  products,
  reviews,
  variants,
} from "../schema";
import { ARTICLE_BLOCKS, BLOG_POSTS, SEED_COMMENTS } from "./blog-content";
import { SEED_PRODUCTS } from "./catalog-data";
import { FLASH_SALE_DURATION_MS, HOME_BANNERS } from "./home-content";
import { SERUM_CONTENT, SERUM_GALLERY, SERUM_INCI, SERUM_SHORT } from "./serum-content";

/** Category tree from Figma frame 3:42651 (Demo 3 "Modern Beauty"), grouped under Skincare / Makeup. */
const CATEGORY_TREE: { slug: string; name: string; children: { slug: string; name: string }[] }[] =
  [
    {
      slug: "skincare",
      name: "Skincare",
      children: [
        { slug: "cleansers", name: "Cleansers" },
        { slug: "essentials", name: "Essentials" },
        { slug: "moisturizers", name: "Moisturizers" },
        { slug: "treatments", name: "Treatments" },
        { slug: "masks", name: "Masks" },
      ],
    },
    {
      slug: "makeup",
      name: "Makeup",
      children: [
        { slug: "eyes", name: "Eyes" },
        { slug: "lips", name: "Lips" },
        { slug: "face", name: "Face" },
        { slug: "nails", name: "Nails" },
      ],
    },
    { slug: "haircare", name: "Haircare", children: [] },
    { slug: "tools", name: "Tools", children: [] },
    { slug: "fragrance", name: "Fragrance", children: [] },
  ];

/** Swatches from the Shop filter (frame 3:4833). Hex values are read from the filter swatches in Figma. */
const COLORS = [
  { slug: "peach", name: "Peach", hex: "#f5d7c5" },
  { slug: "blush", name: "Blush", hex: "#e9bfa5" },
  { slug: "sand", name: "Sand", hex: "#d7a77e" },
  { slug: "cocoa", name: "Cocoa", hex: "#965d3d" },
  { slug: "mocha", name: "Mocha", hex: "#806653" },
  { slug: "crimson", name: "Crimson", hex: "#ba0034" },
  { slug: "rose", name: "Rose", hex: "#d45367" },
];

/**
 * Category card copy and images for the Categories page (Figma 3:28043). The images are the design's;
 * the sub-lines are rewritten because several in the design are copy-pasted placeholders.
 */
const CATEGORY_CARDS: Record<string, string> = {
  skincare: "Cleansers, Serums, Treatments",
  eyes: "Eyeshadow, Brow care, Liners",
  essentials: "Serums, Toners, Face oils",
  moisturizers: "Creams, Lotions, Body care",
  haircare: "Shampoo, Scalp care",
  masks: "Overnight masks, LED masks",
  lips: "Lipstick, Lip oil, Lip care",
  treatments: "Eye care, Neck care, Sun care",
  cleansers: "Cleansing milk, Cleansing bars",
  tools: "Facial rollers, Cleansing brushes",
  face: "Foundation, Powder, Blush",
  fragrance: "Perfume, Eau de parfum",
};

/** Extra sizes for the PDP exemplar (design shows 15 / 30 / 50 ml selectors). Demo prices. */
const EXTRA_VARIANTS: Record<string, { size: string; sizeMl: number; priceCents: number }[]> = {
  "the-renewal-serum": [
    { size: "15ml", sizeMl: 15, priceCents: 2800 },
    { size: "50ml", sizeMl: 50, priceCents: 7200 },
  ],
};

const OUT_OF_STOCK = new Set(["glass-glow-primer"]); // demo data for stock states and the In-stock filter

const PLACEHOLDER_SHORT = (name: string, type: string) =>
  `${name} is a thoughtfully formulated ${type.toLowerCase()} designed to support your everyday glow.`;

function cardFields(slug: string): { description: string | null; image: string | null } {
  const description = CATEGORY_CARDS[slug];
  return description
    ? { description, image: `/images/categories/${slug}.jpg` }
    : { description: null, image: null };
}

function breakdownFor(rating: number, count: number): Record<string, number> {
  // Deterministic distribution that skews to 5 stars more strongly for higher averages.
  const f5 = Math.min(0.95, Math.max(0.3, ((rating - 3) / 2) * 0.9));
  const f4 = (1 - f5) * 0.6;
  const f3 = (1 - f5 - f4) * 0.55;
  const f2 = (1 - f5 - f4 - f3) * 0.5;
  const five = Math.round(count * f5);
  const four = Math.round(count * f4);
  const three = Math.round(count * f3);
  const two = Math.round(count * f2);
  const one = Math.max(0, count - five - four - three - two);
  return { "5": five, "4": four, "3": three, "2": two, "1": one };
}

/**
 * Replace all catalog data with the deterministic demo catalog.
 * Synchronous and transactional (better-sqlite3). Safe to re-run.
 */
export function seedCatalog(db: Db): { products: number; categories: number } {
  return db.transaction((tx) => {
    // FK-safe order
    tx.delete(reviews).run();
    tx.delete(collectionProducts).run();
    tx.delete(collections).run();
    tx.delete(productTags).run();
    tx.delete(productColors).run();
    tx.delete(productCategories).run();
    tx.delete(inventory).run();
    tx.delete(variants).run();
    tx.delete(productImages).run();
    tx.delete(products).run();
    tx.delete(colors).run();
    tx.delete(categories).run();
    tx.delete(banners).run();
    tx.delete(blogComments).run();
    tx.delete(blogPosts).run();

    // Categories
    const categoryId = new Map<string, number>();
    let sort = 0;
    for (const parent of CATEGORY_TREE) {
      const p = tx
        .insert(categories)
        .values({
          slug: parent.slug,
          name: parent.name,
          sortOrder: sort++,
          ...cardFields(parent.slug),
        })
        .returning({ id: categories.id })
        .get();
      categoryId.set(parent.slug, p.id);
      for (const child of parent.children) {
        const c = tx
          .insert(categories)
          .values({
            slug: child.slug,
            name: child.name,
            parentId: p.id,
            sortOrder: sort++,
            ...cardFields(child.slug),
          })
          .returning({ id: categories.id })
          .get();
        categoryId.set(child.slug, c.id);
      }
    }

    // Colors
    const colorId = new Map<string, number>();
    COLORS.forEach((c, i) => {
      const row = tx
        .insert(colors)
        .values({ ...c, sortOrder: i })
        .returning({ id: colors.id })
        .get();
      colorId.set(c.slug, row.id);
    });

    // Collections for the Home page carousels (HOM-004)
    const collectionId = new Map<string, number>();
    for (const [slug, name] of [
      ["trending-now", "Trending now"],
      ["fresh-drops", "Fresh drops"],
      ["most-loved", "Most loved product"],
    ] as const) {
      const row = tx
        .insert(collections)
        .values({ slug, name })
        .returning({ id: collections.id })
        .get();
      collectionId.set(slug, row.id);
    }

    const publishedAt = new Date("2026-01-15T09:00:00Z");
    SEED_PRODUCTS.forEach((sp, index) => {
      const skincare = ["cleansers", "essentials", "moisturizers", "treatments", "masks"].includes(
        sp.category,
      );
      const product = tx
        .insert(products)
        .values({
          slug: sp.slug,
          name: sp.name,
          productType: sp.type,
          shortDescription:
            sp.slug === "the-renewal-serum" ? SERUM_SHORT : PLACEHOLDER_SHORT(sp.name, sp.type),
          description: null,
          ingredients:
            sp.slug === "the-renewal-serum"
              ? SERUM_INCI
              : "Aqua, Glycerin, Niacinamide, Squalane, Panthenol, Tocopherol, Sodium Hyaluronate",
          content: sp.slug === "the-renewal-serum" ? JSON.stringify(SERUM_CONTENT) : null,
          status: "published",
          badge: sp.badge,
          // demo sale for the "On sale countdown" layout: products that carry a compare-at price end it in 20 days
          saleEndsAt: sp.compareAtCents ? new Date(Date.now() + 20 * 86_400_000) : null,
          ratingAvg: sp.rating,
          reviewCount: sp.reviewCount,
          ratingBreakdown: JSON.stringify(breakdownFor(sp.rating, sp.reviewCount)),
          soldCount: sp.reviewCount * (sp.badge === "best-seller" ? 12 : 6) + (36 - index),
          publishedAt: new Date(publishedAt.getTime() - index * 86_400_000),
          createdAt: new Date(publishedAt.getTime() - index * 86_400_000),
        })
        .returning({ id: products.id })
        .get();

      const gallery =
        sp.slug === "the-renewal-serum"
          ? SERUM_GALLERY
          : [{ url: `/images/products/${sp.slug}.png`, alt: sp.name }];
      gallery.forEach((img, i) => {
        tx.insert(productImages)
          .values({ productId: product.id, url: img.url, alt: img.alt, sortOrder: i })
          .run();
      });

      tx.insert(productCategories)
        .values({ productId: product.id, categoryId: categoryId.get(sp.category)! })
        .run();
      for (const color of sp.colors) {
        tx.insert(productColors)
          .values({ productId: product.id, colorId: colorId.get(color)! })
          .run();
      }
      for (const tag of [sp.type, skincare ? "Skincare" : "Cosmetic"]) {
        tx.insert(productTags).values({ productId: product.id, tag }).run();
      }

      const sku = `CSM-${String(index + 1).padStart(4, "0")}`;
      const defaultVariant = tx
        .insert(variants)
        .values({
          productId: product.id,
          sku: `${sku}-${sp.size.toUpperCase().replace(/\s+/g, "")}`,
          sizeLabel: sp.size,
          sizeMl: sp.sizeMl,
          priceCents: sp.priceCents,
          compareAtCents: sp.compareAtCents,
          isDefault: true,
          sortOrder: 1,
        })
        .returning({ id: variants.id })
        .get();
      tx.insert(inventory)
        .values({ variantId: defaultVariant.id, onHand: OUT_OF_STOCK.has(sp.slug) ? 0 : 60 })
        .run();

      for (const [i, extra] of (EXTRA_VARIANTS[sp.slug] ?? []).entries()) {
        const v = tx
          .insert(variants)
          .values({
            productId: product.id,
            sku: `${sku}-${extra.size.toUpperCase()}`,
            sizeLabel: extra.size,
            sizeMl: extra.sizeMl,
            priceCents: extra.priceCents,
            sortOrder: extra.sizeMl < (sp.sizeMl ?? 0) ? 0 : 2 + i,
          })
          .returning({ id: variants.id })
          .get();
        tx.insert(inventory).values({ variantId: v.id, onHand: 40 }).run();
      }

      const into = (slug: string) =>
        tx
          .insert(collectionProducts)
          .values({
            collectionId: collectionId.get(slug)!,
            productId: product.id,
            sortOrder: index,
          })
          .run();
      if (sp.badge === "trending" || sp.badge === "hot") into("trending-now");
      if (sp.badge === "new") into("fresh-drops");
      if (sp.badge === "best-seller") into("most-loved");

      if (sp.slug === "the-renewal-serum") {
        tx.insert(reviews)
          .values([
            {
              productId: product.id,
              authorName: "Amelia S.",
              rating: 5,
              title: "Replaced my $80 foundation",
              body: "I have the lightest hands on this serum and I use it daily; skin looks more even and glowy.",
              recommend: true,
              isVerified: true,
              status: "approved",
              brandReply:
                "Thank you for sharing your experience. We're delighted it works so well for you.",
              brandReplyAuthor: "Cosmia Skin Team",
            },
            {
              productId: product.id,
              authorName: "Daniel K.",
              rating: 5,
              title: "The supernatural skin radiance",
              body: "Absorbs fast with no sticky feel. Noticeable difference after two weeks.",
              recommend: true,
              isVerified: true,
              status: "approved",
            },
            {
              productId: product.id,
              authorName: "Sarah L.",
              rating: 4,
              title: "Lovely texture",
              body: "Lovely texture and a subtle finish. I would like a larger size.",
              recommend: true,
              isVerified: false,
              status: "approved",
            },
            {
              productId: product.id,
              authorName: "Pending Reviewer",
              rating: 3,
              title: "Awaiting moderation",
              body: "This review is pending and must not appear on the storefront.",
              recommend: false,
              isVerified: false,
              status: "pending",
            },
          ])
          .run();
      }
    });

    HOME_BANNERS.forEach((b, i) => {
      tx.insert(banners)
        .values({
          slot: b.slot,
          eyebrow: b.eyebrow ?? null,
          title: b.title,
          subtitle: b.subtitle ?? null,
          ctaLabel: b.ctaLabel ?? null,
          ctaHref: b.ctaHref ?? null,
          image: b.image ?? null,
          data: b.data ? JSON.stringify(b.data) : null,
          sortOrder: i,
          endsAt: b.slot === "home-flash" ? new Date(Date.now() + FLASH_SALE_DURATION_MS) : null,
        })
        .run();
    });

    // Journal: all posts carry the design's date; the first one also has the designed comments
    const postedAt = new Date("2026-10-08T09:00:00Z");
    const postIds = BLOG_POSTS.map((post, i) =>
      tx
        .insert(blogPosts)
        .values({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          category: post.category,
          authorImage: "/images/blog/author-selena.jpg",
          coverImage: `/images/blog/${post.slug}.jpg`,
          content: JSON.stringify(ARTICLE_BLOCKS(post.title)),
          tags: JSON.stringify(post.tags),
          publishedAt: new Date(postedAt.getTime() - i * 1000),
        })
        .returning({ id: blogPosts.id })
        .get(),
    );
    const commentIds: number[] = [];
    SEED_COMMENTS.forEach((c) => {
      const row = tx
        .insert(blogComments)
        .values({
          postId: postIds[0]!.id,
          parentId: c.parent === null ? null : commentIds[c.parent]!,
          name: c.name,
          email: `${c.name.split(" ")[0]!.toLowerCase()}@example.com`,
          avatar: c.avatar,
          body: c.body,
          status: "approved",
          createdAt: new Date("2024-06-18T18:00:00Z"),
        })
        .returning({ id: blogComments.id })
        .get();
      commentIds.push(row.id);
    });

    tx.insert(appMeta)
      .values({ key: "catalog_seeded_at", value: new Date().toISOString() })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: new Date().toISOString() } })
      .run();

    return { products: SEED_PRODUCTS.length, categories: categoryId.size };
  });
}
