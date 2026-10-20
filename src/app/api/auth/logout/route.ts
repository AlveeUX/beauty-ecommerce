import { endSession } from "@/server/auth/session";
import { clearCartToken } from "@/server/cart/session";
import { crossSiteBlock } from "@/server/http";

export const dynamic = "force-dynamic";

/** End the session server-side and forget the cart cookie (USR-005). */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  await endSession();
  await clearCartToken();
  return Response.json({ ok: true });
}
