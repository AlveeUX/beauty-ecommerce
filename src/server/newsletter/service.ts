import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { newsletterSubscribers } from "@/db/schema";
import type { NewsletterInput } from "@/lib/validation/newsletter";
import { hit } from "@/server/security/rate-limit";

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export type SubscribeResult =
  { ok: true } | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

/**
 * Record a newsletter sign-up (NWS-001). An address that is already subscribed gets the same answer as a
 * new one, so the form cannot be used to find out who is on the list. Signing up again after an
 * unsubscribe re-activates the address with a fresh consent time.
 */
export function subscribe(
  db: Db,
  input: NewsletterInput,
  clientKey: string,
  now = Date.now(),
): SubscribeResult {
  const limited = hit(db, `newsletter:ip:${clientKey}`, LIMIT, WINDOW_MS, now);
  if (!limited.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.ceil(limited.retryAfterMs / 1000),
    };
  }
  const existing = db
    .select({ id: newsletterSubscribers.id, unsubscribedAt: newsletterSubscribers.unsubscribedAt })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, input.email))
    .get();
  if (!existing) {
    db.insert(newsletterSubscribers)
      .values({ email: input.email, source: input.source, consentedAt: new Date(now) })
      .run();
  } else if (existing.unsubscribedAt) {
    db.update(newsletterSubscribers)
      .set({ unsubscribedAt: null, consentedAt: new Date(now), source: input.source })
      .where(eq(newsletterSubscribers.id, existing.id))
      .run();
  }
  return { ok: true };
}
