import type { Db } from "@/db/client";
import { emailOutbox } from "@/db/schema";

/**
 * Local email: messages are written to the `email_outbox` table (and the dev server log) instead of
 * being sent, because no real provider is connected (decision-log D-004). Never put secrets other
 * than the one-time link the recipient needs into a message.
 */
export function queueEmail(
  db: Db,
  message: { kind: string; to: string; subject: string; body: string },
): void {
  db.insert(emailOutbox)
    .values({
      kind: message.kind,
      toEmail: message.to,
      subject: message.subject,
      body: message.body,
    })
    .run();
}
