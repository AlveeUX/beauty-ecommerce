import { getDb } from "@/db/client";
import { reviewInputSchema, submitReview } from "@/server/catalog/reviews";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

/** POST /api/catalog/products/[slug]/reviews: submit a review for moderation (PRD-006). */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = reviewInputSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return jsonError(400, "validation_failed", "Please check the highlighted fields.", fields);
  }

  const result = submitReview(getDb(), slug, parsed.data);
  if (!result.ok) {
    return result.code === "not_found"
      ? jsonError(404, "not_found", "Product not found.")
      : jsonError(409, "duplicate_review", "You have already reviewed this product.");
  }
  return Response.json(
    { status: "pending", message: "Thanks! Your review will appear once approved." },
    { status: 201 },
  );
}
