import { getDb } from "@/db/client";
import { trackSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/checkout";
import { clientKey, crossSiteBlock, jsonError, validationError } from "@/server/http";
import { trackOrder } from "@/server/orders/tracking";

export const dynamic = "force-dynamic";

/** Guest order lookup: order ID and billing email must both match (TRK-001, BR-12). */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = trackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));

  const result = trackOrder(getDb(), parsed.data.orderId, parsed.data.email, clientKey(request));
  if (!result.ok) {
    if (result.reason === "rate_limited") {
      const response = jsonError(
        429,
        "rate_limited",
        "Too many lookups. Please wait a few minutes and try again.",
      );
      response.headers.set("Retry-After", String(result.retryAfterSeconds ?? 900));
      return response;
    }
    return jsonError(
      404,
      "not_found",
      "We could not find an order with that ID and email address.",
    );
  }
  return Response.json({ order: result.order });
}
