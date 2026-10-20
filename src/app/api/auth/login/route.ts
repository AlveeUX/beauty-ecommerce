import { z } from "zod";
import { getDb } from "@/db/client";
import { loginSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/checkout";
import { authenticate } from "@/server/auth/service";
import { completeSignIn } from "@/server/auth/signin";
import { crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

const body = loginSchema.extend({ wishlist: z.array(z.string()).max(100).optional() });

/** Sign in with user name or email (USR-001). Failures are generic and throttled. */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));

  const result = authenticate(getDb(), parsed.data.identifier, parsed.data.password);
  if (!result.ok) {
    const { code, message, retryAfterSeconds } = result.error;
    if (code === "locked") {
      const response = jsonError(429, code, message);
      response.headers.set("Retry-After", String(retryAfterSeconds ?? 900));
      return response;
    }
    return jsonError(401, code, message);
  }
  const { wishlist } = await completeSignIn(result.value, {
    remember: parsed.data.remember,
    browserWishlist: parsed.data.wishlist ?? [],
  });
  return Response.json({ user: result.value, wishlist });
}
