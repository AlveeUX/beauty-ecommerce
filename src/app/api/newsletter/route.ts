import { getDb } from "@/db/client";
import { newsletterSchema } from "@/lib/validation/newsletter";
import { fieldErrors } from "@/lib/validation/checkout";
import { subscribe } from "@/server/newsletter/service";
import { clientKey, crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

/** Newsletter sign-up (NWS-001): validates, stores the address with its consent time, answers 201. */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = newsletterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const result = subscribe(getDb(), parsed.data, clientKey(request));
  if (!result.ok) {
    const response = jsonError(429, "rate_limited", "Too many attempts. Please try again later.");
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  }
  return Response.json({ ok: true, message: "Thanks for subscribing." }, { status: 201 });
}
