import { getDb } from "@/db/client";
import { contactSchema } from "@/lib/validation/contact";
import { fieldErrors } from "@/lib/validation/checkout";
import { saveContactMessage } from "@/server/contact/service";
import { clientKey, crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

/** Contact form (CNT-003): validates, stores the message for staff, answers 201. */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const result = saveContactMessage(getDb(), parsed.data, clientKey(request));
  if (!result.ok) {
    const response = jsonError(
      429,
      "rate_limited",
      "You have sent several messages. Please try again in a while.",
    );
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  }
  return Response.json(
    { ok: true, message: "Thank you. We have your message and will reply by email." },
    { status: 201 },
  );
}
