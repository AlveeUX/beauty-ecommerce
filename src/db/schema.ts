import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
} from "../config/order-constants";

/*
 * Catalog schema (PRD section 9). Money is integer cents. Timestamps are unix
 * milliseconds. Kept to portable SQL so a later move to PostgreSQL is a
 * driver/migration change (decision-log D-007).
 */

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export const PRODUCT_BADGES = ["best-seller", "new", "trending", "hot"] as const;
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

/** P1 placeholder that proves the migration pipeline; also used for app-level flags. */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    image: text("image"),
    parentId: integer("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_slug_uq").on(t.slug),
    index("categories_parent_idx").on(t.parentId),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Short type shown on cards, e.g. "Serum" (card label = type + " · " + default size). */
    productType: text("product_type").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    /** Plain-text list of ingredients (searchable, shown in "Full ingredient transparency"). */
    ingredients: text("ingredients"),
    /** JSON, see src/lib/product-content.ts */
    content: text("content"),
    status: text("status", { enum: PRODUCT_STATUSES }).notNull().default("draft"),
    badge: text("badge", { enum: PRODUCT_BADGES }),
    /** Denormalised review summary (kept in sync when reviews are approved). */
    ratingAvg: real("rating_avg").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    /** JSON: {"5":n,"4":n,"3":n,"2":n,"1":n} */
    ratingBreakdown: text("rating_breakdown"),
    soldCount: integer("sold_count").notNull().default(0),
    /** Product page layout (src/lib/pdp-layouts.ts); null means "details-default". Set by staff in P8. */
    pdpLayout: text("pdp_layout"),
    /** End of a running sale: shows the countdown on the "On sale countdown" layout (PRD-011, APM-002). */
    saleEndsAt: integer("sale_ends_at", { mode: "timestamp_ms" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_status_idx").on(t.status),
    index("products_badge_idx").on(t.badge),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const variants = sqliteTable(
  "variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    /** Display size, e.g. "30ml", "8g", "1 Piece". */
    sizeLabel: text("size_label").notNull(),
    /** Numeric millilitres when the size is a volume; drives the size filter. */
    sizeMl: integer("size_ml"),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("variants_sku_uq").on(t.sku), index("variants_product_idx").on(t.productId)],
);

export const inventory = sqliteTable("inventory", {
  variantId: integer("variant_id")
    .primaryKey()
    .references(() => variants.id, { onDelete: "cascade" }),
  onHand: integer("on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const productCategories = sqliteTable(
  "product_categories",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index("pc_category_idx").on(t.categoryId),
  ],
);

export const colors = sqliteTable(
  "colors",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    hex: text("hex").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("colors_slug_uq").on(t.slug)],
);

export const productColors = sqliteTable(
  "product_colors",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorId: integer("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.colorId] })],
);

export const productTags = sqliteTable(
  "product_tags",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.tag] })],
);

export const collections = sqliteTable(
  "collections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("collections_slug_uq").on(t.slug)],
);

export const collectionProducts = sqliteTable(
  "collection_products",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    /** Private; never returned by the storefront. */
    authorEmail: text("author_email"),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    recommend: integer("recommend", { mode: "boolean" }).notNull().default(true),
    isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: REVIEW_STATUSES }).notNull().default("pending"),
    brandReply: text("brand_reply"),
    brandReplyAuthor: text("brand_reply_author"),
    ...timestamps,
  },
  (t) => [index("reviews_product_idx").on(t.productId, t.status)],
);

/** Home/marketing content blocks, managed from the admin in P9 (ACN-001). */
export const banners = sqliteTable(
  "banners",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** e.g. "home-hero", "home-category-cards", "home-editorial" */
    slot: text("slot").notNull(),
    eyebrow: text("eyebrow"),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    ctaLabel: text("cta_label"),
    ctaHref: text("cta_href"),
    image: text("image"),
    /** JSON with slot-specific extras (handles, dates, badge values...). */
    data: text("data"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("banners_slot_idx").on(t.slot, t.isActive)],
);

/*
 * Cart (P5, PRD CRT-004/005). A guest cart is identified by an unguessable token kept in an httpOnly
 * cookie; it is merged into the account cart at login (P6, OQ-20). Quantities are checked against stock
 * on every write and again at checkout.
 */
export const carts = sqliteTable(
  "carts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    token: text("token").notNull(),
    /** Set once the cart belongs to an account (P6, OQ-20); null for a guest cart. */
    userId: integer("user_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("carts_token_uq").on(t.token), uniqueIndex("carts_user_uq").on(t.userId)],
);

export const cartItems = sqliteTable(
  "cart_items",
  {
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [primaryKey({ columns: [t.cartId, t.variantId] })],
);

/*
 * Accounts, sessions and ordering (P6, PRD USR/CHK/ORD/TRK). Passwords are scrypt hashes; session and
 * reset tokens are stored only as SHA-256 hashes so a database leak does not expose live credentials.
 */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Stored lower-case. */
    email: text("email").notNull(),
    /** Stored lower-case; the login form accepts "user name / email address". */
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull().default("customer"),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_username_uq").on(t.username),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tokenHash: text("token_hash").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const passwordResets = sqliteTable(
  "password_resets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tokenHash: text("token_hash").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("password_resets_token_uq").on(t.tokenHash)],
);

/** Fixed-window counters for login, reset and order-lookup throttling (SEC-004). */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetsAt: integer("resets_at", { mode: "timestamp_ms" }).notNull(),
});

/** Saved billing/shipping addresses of an account (USR-004). */
export const addresses = sqliteTable(
  "addresses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    company: text("company"),
    country: text("country").notNull(),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    postcode: text("postcode").notNull(),
    phone: text("phone").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/** Account wishlist, merged from the browser list at login (WSH-003). */
export const wishlistItems = sqliteTable(
  "wishlist_items",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productSlug: text("product_slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productSlug] })],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Public order ID, "CSM-" + 8 characters (OQ-21). Pairs with the billing email for tracking. */
    number: text("number").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Billing email, lower-case. */
    email: text("email").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull().default("pending"),
    currency: text("currency").notNull().default("USD"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    company: text("company"),
    country: text("country").notNull(),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    postcode: text("postcode").notNull(),
    phone: text("phone").notNull(),
    notes: text("notes"),
    /** Carrier and number, entered by staff when shipped (AOR-004, P8). */
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    /** Client-generated key: submitting the same checkout twice returns the same order (CHK-006). */
    idempotencyKey: text("idempotency_key").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    uniqueIndex("orders_idem_uq").on(t.idempotencyKey),
    index("orders_user_idx").on(t.userId),
    index("orders_email_idx").on(t.email),
  ],
);

/** Name, size, SKU and price are copied at purchase so later catalog edits never rewrite history. */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").references(() => variants.id, { onDelete: "set null" }),
    productSlug: text("product_slug").notNull(),
    name: text("name").notNull(),
    variantLabel: text("variant_label").notNull(),
    sku: text("sku").notNull(),
    image: text("image"),
    unitCents: integer("unit_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineCents: integer("line_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: text("method", { enum: PAYMENT_METHODS }).notNull(),
    provider: text("provider").notNull(),
    status: text("status", { enum: PAYMENT_STATUSES }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** Gateway reference or failure reason; never card data. */
    reference: text("reference"),
    ...timestamps,
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

/** Every status change with its actor (ORD-001). */
export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actor: text("actor").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

/** Local stand-in for outgoing email (no real provider; decision-log D-004). */
export const emailOutbox = sqliteTable("email_outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Messages from the contact form (CNT-003); staff read them in the admin (P9). No email is sent. */
export const CONTACT_STATUSES = ["new", "read", "answered"] as const;
export const contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: CONTACT_STATUSES }).notNull().default("new"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Journal posts (BLG). `content` is a JSON array of blocks (see src/lib/blog.ts); `tags` a JSON string array. */
export const BLOG_STATUSES = ["draft", "published"] as const;
export const blogPosts = sqliteTable(
  "blog_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    category: text("category").notNull(),
    author: text("author").notNull().default("Selena"),
    authorImage: text("author_image"),
    readMinutes: integer("read_minutes").notNull().default(6),
    coverImage: text("cover_image").notNull(),
    content: text("content").notNull().default("[]"),
    tags: text("tags").notNull().default("[]"),
    status: text("status", { enum: BLOG_STATUSES }).notNull().default("published"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("blog_posts_status_published_idx").on(t.status, t.publishedAt)],
);

/** Reader comments. New ones wait for staff approval (Assumption, see D-041); replies point at a parent. */
export const COMMENT_STATUSES = ["pending", "approved", "rejected"] as const;
export const blogComments = sqliteTable(
  "blog_comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    website: text("website"),
    avatar: text("avatar"),
    body: text("body").notNull(),
    status: text("status", { enum: COMMENT_STATUSES }).notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("blog_comments_post_idx").on(t.postId, t.status)],
);

/** Newsletter sign-ups from the footer forms and the welcome popup (NWS-001). One row per address. */
export const NEWSLETTER_SOURCES = ["footer", "home-footer", "popup"] as const;
export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  source: text("source", { enum: NEWSLETTER_SOURCES }).notNull(),
  /** When the address agreed to receive updates (the form's consent text or checkbox). */
  consentedAt: integer("consented_at", { mode: "timestamp_ms" }).notNull(),
  unsubscribedAt: integer("unsubscribed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
