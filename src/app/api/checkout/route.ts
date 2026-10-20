import { z } from "zod";
import { enabledPaymentMethods } from "@/config/store";
import { getDb } from "@/db/client";
import { checkoutSchema, fieldErrors } from "@/lib/validation/checkout";
import { getCurrentUser } from "@/server/auth/session";
import { readCartToken } from "@/server/cart/session";
import { crossSiteBlock, validationError } from "@/server/http";
import { ORDER_ERROR_STATUS, placeOrder } from "@/server/orders/service";
import { rememberOrder } from "@/server/orders/session";
import { localGateway } from "@/server/payments/gateway";

export const dynamic = "force-dynamic";

const body = checkoutSchema.extend({ simulate: z.enum(["approve", "decline"]).optional() });

/**
 * Place the order for the cart in this browser (CHK-006). Prices and stock come from the server; the
 * browser only sends who the order is for, how they pay and a one-time idempotency key.
 */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  if (!enabledPaymentMethods().includes(parsed.data.paymentMethod)) {
    return validationError({ paymentMethod: "This payment method is not available." });
  }

  const user = await getCurrentUser();
  const result = await placeOrder(getDb(), {
    token: await readCartToken(),
    userId: user?.id ?? null,
    input: parsed.data,
    simulate: parsed.data.simulate,
    gateway: localGateway,
  });
  if (!result.ok) {
    const { code, message, items } = result.error;
    return Response.json(
      { code, message, ...(items ? { items } : {}) },
      { status: ORDER_ERROR_STATUS[code] },
    );
  }
  await rememberOrder(result.order.number);
  return Response.json({ order: result.order }, { status: result.created ? 201 : 200 });
}
