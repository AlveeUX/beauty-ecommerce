import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { products, reviews } from "@/db/schema";

/** Input of the "Share your experience" form (PRD-006). Every field is required. */
export const reviewInputSchema = z.object({
  headline: z.string().trim().min(3, "Please add a headline (3+ characters).").max(120),
  rating: z.number().int().min(1, "Please choose a rating.").max(5),
  comment: z.string().trim().min(10, "Please write at least 10 characters.").max(2000),
  recommend: z.boolean(),
  name: z.string().trim().min(2, "Please enter your name.").max(60),
  email: z.string().trim().toLowerCase().email("Please enter a valid email.").max(120),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export type SubmitReviewResult =
  { ok: true; id: number } | { ok: false; code: "not_found" | "duplicate" };

/**
 * Store a review for moderation. It stays "pending" (hidden from the storefront) until an admin
 * approves it (BR-11). One review per email per product; "verified" is only ever set from an order (P6).
 */
export function submitReview(db: Db, productSlug: string, input: ReviewInput): SubmitReviewResult {
  return db.transaction((tx) => {
    const product = tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.slug, productSlug), eq(products.status, "published")))
      .get();
    if (!product) return { ok: false, code: "not_found" } as const;

    const existing = tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(eq(reviews.productId, product.id), sql`lower(${reviews.authorEmail}) = ${input.email}`),
      )
      .get();
    if (existing) return { ok: false, code: "duplicate" } as const;

    const row = tx
      .insert(reviews)
      .values({
        productId: product.id,
        authorName: input.name,
        authorEmail: input.email,
        rating: input.rating,
        title: input.headline,
        body: input.comment,
        recommend: input.recommend,
        isVerified: false,
        status: "pending",
      })
      .returning({ id: reviews.id })
      .get();
    return { ok: true, id: row.id } as const;
  });
}
