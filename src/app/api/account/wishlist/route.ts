import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { wishlistItems } from "@/db/schema";
import { requireUser } from "@/server/auth/guard";
import { setAccountWishlist } from "@/server/cart/account";
import { crossSiteBlock, jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

/** The account wishlist (WSH-003). Guests keep theirs in the browser until they sign in. */
export async function GET() {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const rows = getDb()
    .select({ slug: wishlistItems.productSlug })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, gate.user.id))
    .all();
  return Response.json({ wishlist: rows.map((r) => r.slug) });
}

export async function PUT(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const parsed = z
    .object({ wishlist: z.array(z.string()).max(100) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(422, "validation_error", "Send a list of product slugs.");
  setAccountWishlist(getDb(), gate.user.id, parsed.data.wishlist);
  return Response.json({ ok: true });
}
