import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { fieldErrors } from "@/lib/validation/checkout";
import { requireUser } from "@/server/auth/guard";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import { crossSiteBlock, validationError } from "@/server/http";
import { hit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const body = z.object({
  current: z.string().min(1, "Enter your current password.").max(200),
  next: z.string().min(1, "Choose a new password.").max(200),
});

/** Change the password of the signed-in account (needs the current one). */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));

  const db = getDb();
  if (!hit(db, `pwchange:${gate.user.id}`, 5, 15 * 60 * 1000).allowed) {
    return validationError({ current: "Too many attempts. Please wait a few minutes." });
  }
  const row = db.select().from(users).where(eq(users.id, gate.user.id)).get();
  if (!row || !verifyPassword(parsed.data.current, row.passwordHash)) {
    return validationError({ current: "Your current password is not correct." });
  }
  const problem = passwordProblem(parsed.data.next);
  if (problem) return validationError({ next: problem });
  db.update(users)
    .set({ passwordHash: hashPassword(parsed.data.next), updatedAt: new Date() })
    .where(eq(users.id, row.id))
    .run();
  return Response.json({ ok: true });
}
