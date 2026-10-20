import { getDb } from "@/db/client";
import { clearCart, getCart } from "@/server/cart/service";
import { ensureCartToken, readCartToken } from "@/server/cart/session";

export const dynamic = "force-dynamic";

/** Current cart (lines, units, subtotal, free-shipping progress). */
export async function GET() {
  return Response.json({ cart: getCart(getDb(), await readCartToken()) });
}

/** Remove every line (the cart page's "Remove all"). */
export async function DELETE() {
  return Response.json({ cart: clearCart(getDb(), await ensureCartToken()) });
}
