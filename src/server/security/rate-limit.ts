import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { rateLimits } from "@/db/schema";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterMs: number };

/**
 * Fixed-window counter kept in the database (SEC-004). `hit` counts one attempt and reports whether the
 * caller may proceed; `peek` only reads. Keys are chosen by the caller, e.g. "login:ana@example.com".
 */
export function hit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  return db.transaction((tx) => {
    const row = tx.select().from(rateLimits).where(eq(rateLimits.key, key)).get();
    if (!row || row.resetsAt.getTime() <= now) {
      tx.insert(rateLimits)
        .values({ key, count: 1, resetsAt: new Date(now + windowMs) })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { count: 1, resetsAt: new Date(now + windowMs) },
        })
        .run();
      return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
    }
    if (row.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterMs: row.resetsAt.getTime() - now };
    }
    tx.update(rateLimits)
      .set({ count: row.count + 1 })
      .where(eq(rateLimits.key, key))
      .run();
    return { allowed: true, remaining: limit - row.count - 1, retryAfterMs: 0 };
  });
}

/** Forget a key (a successful login clears the failure counter). */
export function clearLimit(db: Db, key: string): void {
  db.delete(rateLimits).where(eq(rateLimits.key, key)).run();
}

/** Read the window without counting an attempt. */
export function peek(db: Db, key: string, limit: number, now = Date.now()): RateLimitResult {
  const row = db.select().from(rateLimits).where(eq(rateLimits.key, key)).get();
  if (!row || row.resetsAt.getTime() <= now) {
    return { allowed: true, remaining: limit, retryAfterMs: 0 };
  }
  return {
    allowed: row.count < limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterMs: row.count < limit ? 0 : row.resetsAt.getTime() - now,
  };
}
