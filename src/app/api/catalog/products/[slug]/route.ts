import { getDb } from "@/db/client";
import { getApprovedReviews, getProductBySlug, getRelatedProducts } from "@/server/catalog/service";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const product = getProductBySlug(db, slug);
  if (!product) return jsonError(404, "not_found", "Product not found.");
  return Response.json({
    product,
    reviews: getApprovedReviews(db, product.id),
    related: getRelatedProducts(db, product.id, 4),
  });
}
