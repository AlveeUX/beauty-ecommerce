import { getDb } from "@/db/client";
import { forgotSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/checkout";
import { requestPasswordReset } from "@/server/auth/service";
import { crossSiteBlock, requestOrigin, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

/** The same answer whether or not the account exists (USR-003). The email goes to the local outbox. */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = forgotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  requestPasswordReset(getDb(), parsed.data.identifier, requestOrigin(request));
  return Response.json({
    ok: true,
    message: "If an account matches, we have sent a link to create a new password.",
  });
}
