import { z } from "zod";
import { getDb } from "@/db/client";
import { jsonError } from "@/server/http";
import { addItem, CART_ERROR_STATUS } from "@/server/cart/service";
import { ensureCartToken } from "@/server/cart/session";

export const dynamic = "force-dynamic";

const body = z
  .object({
    slug: z.string().min(1).max(200).optional(),
    variantId: z.number().int().positive().optional(),
    quantity: z.number().int().min(1).max(100).default(1),
  })
  .refine((v) => v.slug !== undefined || v.variantId !== undefined, {
    message: "slug or variantId is required",
  });

/** Add units of a product (its default variant) or of a specific variant. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(422, "validation_error", "Send a product slug or variantId and a quantity.");
  }
  const token = await ensureCartToken();
  const result = addItem(getDb(), token, parsed.data);
  if (!result.ok) {
    return jsonError(CART_ERROR_STATUS[result.error.code], result.error.code, result.error.message);
  }
  return Response.json({ cart: result.cart }, { status: 201 });
}
