import { getDb } from "@/db/client";
import { commentSchema } from "@/lib/validation/blog";
import { fieldErrors } from "@/lib/validation/checkout";
import { addComment } from "@/server/blog/comments";
import { clientKey, crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

/** Leave a comment on a journal post (BLG-004): validated, stored as pending, 201. */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const { slug } = await ctx.params;
  const parsed = commentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const result = addComment(getDb(), slug, parsed.data, clientKey(request));
  if (!result.ok) {
    if (result.reason === "not_found") {
      return jsonError(404, "not_found", "This post does not exist.");
    }
    if (result.reason === "bad_parent") {
      return jsonError(400, "bad_parent", "That comment cannot be replied to.");
    }
    const response = jsonError(
      429,
      "rate_limited",
      "You have sent several comments. Please try again in a while.",
    );
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  }
  return Response.json(
    { ok: true, message: "Thank you. Your comment will appear once our team has approved it." },
    { status: 201 },
  );
}
