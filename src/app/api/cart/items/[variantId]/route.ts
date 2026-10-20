import { z } from "zod";
import { getDb } from "@/db/client";
import { jsonError } from "@/server/http";
import { CART_ERROR_STATUS, removeItem, setQuantity } from "@/server/cart/service";
import { ensureCartToken } from "@/server/cart/session";

export const dynamic = "force-dynamic";

const idSchema = z.coerce.number().int().positive();
const body = z.object({ quantity: z.number().int() });

type Context = { params: Promise<{ variantId: string }> };

/** Set the quantity of a line; more than the stock is rejected with 409. */
export async function PATCH(request: Request, { params }: Context) {
  const id = idSchema.safeParse((await params).variantId);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return jsonError(422, "validation_error", "Send a quantity for an existing cart item.");
  }
  const result = setQuantity(getDb(), await ensureCartToken(), id.data, parsed.data.quantity);
  if (!result.ok) {
    return jsonError(CART_ERROR_STATUS[result.error.code], result.error.code, result.error.message);
  }
  return Response.json({ cart: result.cart });
}

export async function DELETE(_request: Request, { params }: Context) {
  const id = idSchema.safeParse((await params).variantId);
  if (!id.success) return jsonError(422, "validation_error", "Unknown cart item.");
  return Response.json({ cart: removeItem(getDb(), await ensureCartToken(), id.data) });
}
