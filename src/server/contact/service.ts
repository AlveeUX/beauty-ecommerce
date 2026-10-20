import type { Db } from "@/db/client";
import { contactMessages } from "@/db/schema";
import type { ContactInput } from "@/lib/validation/contact";
import { hit } from "@/server/security/rate-limit";

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Store a contact-form message (CNT-003). Sending is limited per client address and per email so the form
 * cannot be used to fill the inbox; nothing is emailed in the local phase.
 */
export function saveContactMessage(
  db: Db,
  input: ContactInput,
  clientKey: string,
  now = Date.now(),
): { ok: true; id: number } | { ok: false; reason: "rate_limited"; retryAfterSeconds: number } {
  const byClient = hit(db, `contact:ip:${clientKey}`, LIMIT, WINDOW_MS, now);
  const byEmail = hit(db, `contact:email:${input.email}`, LIMIT, WINDOW_MS, now);
  if (!byClient.allowed || !byEmail.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.ceil(Math.max(byClient.retryAfterMs, byEmail.retryAfterMs) / 1000),
    };
  }
  const row = db
    .insert(contactMessages)
    .values({
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
    })
    .returning({ id: contactMessages.id })
    .get();
  return { ok: true, id: row.id };
}
