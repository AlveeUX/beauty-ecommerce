import { getDb } from "@/db/client";
import { resetSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/checkout";
import { AUTH_ERROR_STATUS, resetPassword } from "@/server/auth/service";
import { crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

/** Spend a one-time reset link and set a new password. Existing sessions are ended. */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const result = resetPassword(getDb(), parsed.data.token, parsed.data.password);
  if (!result.ok) {
    if (result.error.code === "weak_password") {
      return validationError({ password: result.error.message });
    }
    return jsonError(AUTH_ERROR_STATUS[result.error.code], result.error.code, result.error.message);
  }
  return Response.json({ ok: true });
}
