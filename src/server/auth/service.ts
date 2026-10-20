import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { passwordResets, sessions, users } from "@/db/schema";
import { PASSWORD_RESET_TTL_MS, SESSION_TTL_MS, SESSION_TTL_REMEMBER_MS } from "@/config/store";
import { queueEmail } from "@/server/email/outbox";
import { clearLimit, hit, peek } from "@/server/security/rate-limit";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

export type AuthUser = { id: number; email: string; username: string; role: "customer" | "admin" };

export type AuthError = {
  code:
    | "email_taken"
    | "username_taken"
    | "weak_password"
    | "invalid_credentials"
    | "locked"
    | "invalid_token";
  message: string;
  fields?: string[];
  retryAfterSeconds?: number;
};

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthError };

export const AUTH_ERROR_STATUS: Record<AuthError["code"], number> = {
  email_taken: 409,
  username_taken: 409,
  weak_password: 422,
  invalid_credentials: 401,
  locked: 429,
  invalid_token: 400,
};

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const RESET_LIMIT = 5;
const RESET_WINDOW_MS = 60 * 60 * 1000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("hex");
export const isSessionToken = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

const toUser = (row: {
  id: number;
  email: string;
  username: string;
  role: "customer" | "admin";
}): AuthUser => ({ id: row.id, email: row.email, username: row.username, role: row.role });

export function registerUser(
  db: Db,
  input: { username: string; email: string; password: string },
): AuthResult<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const problem = passwordProblem(input.password);
  if (problem) {
    return { ok: false, error: { code: "weak_password", message: problem, fields: ["password"] } };
  }
  const clash = db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .all();
  if (clash.some((u) => u.email === email)) {
    return {
      ok: false,
      error: {
        code: "email_taken",
        message: "An account with this email address already exists.",
        fields: ["email"],
      },
    };
  }
  if (clash.some((u) => u.username === username)) {
    return {
      ok: false,
      error: {
        code: "username_taken",
        message: "This user name is already taken.",
        fields: ["username"],
      },
    };
  }
  const row = db
    .insert(users)
    .values({ email, username, passwordHash: hashPassword(input.password) })
    .returning()
    .get();
  return { ok: true, value: toUser(row) };
}

/**
 * Check a user name or email plus password. Failures are counted per identifier; after
 * {@link LOGIN_LIMIT} in the window the account answers "locked" without checking the password (USR-001).
 * Wrong user and wrong password give the same message so accounts cannot be enumerated.
 */
export function authenticate(
  db: Db,
  identifier: string,
  password: string,
  now = Date.now(),
): AuthResult<AuthUser> {
  const id = identifier.trim().toLowerCase();
  const key = `login:${id}`;
  const row = db
    .select()
    .from(users)
    .where(or(eq(users.email, id), eq(users.username, id)))
    .get();

  const gate = peek(db, key, LOGIN_LIMIT, now);
  if (!gate.allowed) {
    return {
      ok: false,
      error: {
        code: "locked",
        message: "Too many attempts. Please wait a few minutes and try again.",
        retryAfterSeconds: Math.ceil(gate.retryAfterMs / 1000),
      },
    };
  }
  // run the hash even for an unknown user so timing does not reveal which accounts exist
  const ok = row
    ? verifyPassword(password, row.passwordHash)
    : (verifyPassword(password, DUMMY_HASH), false);
  if (!row || !ok) {
    hit(db, key, LOGIN_LIMIT, LOGIN_WINDOW_MS, now);
    return {
      ok: false,
      error: {
        code: "invalid_credentials",
        message: "The user name, email address or password is not correct.",
      },
    };
  }
  clearLimit(db, key);
  db.update(users)
    .set({ lastLoginAt: new Date(now) })
    .where(eq(users.id, row.id))
    .run();
  return { ok: true, value: toUser(row) };
}

const DUMMY_HASH = hashPassword("not-a-real-password");

/** Start a session and return the raw token for the cookie (only its hash is stored). */
export function createSession(
  db: Db,
  userId: number,
  remember: boolean,
  now = Date.now(),
): { token: string; maxAgeSeconds: number } {
  const ttl = remember ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_MS;
  const token = newToken();
  db.insert(sessions)
    .values({ tokenHash: sha256(token), userId, expiresAt: new Date(now + ttl) })
    .run();
  return { token, maxAgeSeconds: Math.floor(ttl / 1000) };
}

export function getSessionUser(db: Db, token: string | null, now = Date.now()): AuthUser | null {
  if (!isSessionToken(token)) return null;
  const row = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date(now))))
    .get();
  return row ? toUser(row) : null;
}

/** Server-side logout: the stored session is deleted, so a copied cookie stops working (USR-005). */
export function destroySession(db: Db, token: string | null): void {
  if (!isSessionToken(token)) return;
  db.delete(sessions)
    .where(eq(sessions.tokenHash, sha256(token)))
    .run();
}

/**
 * Forgot-password: the answer to the caller is always the same, whether or not the account exists
 * (USR-003). When it does, a one-time link is written to the email outbox. Requests are limited per
 * identifier so the form cannot be used to flood a mailbox.
 */
export function requestPasswordReset(
  db: Db,
  identifier: string,
  origin: string,
  now = Date.now(),
): void {
  const id = identifier.trim().toLowerCase();
  const gate = hit(db, `reset:${id}`, RESET_LIMIT, RESET_WINDOW_MS, now);
  if (!gate.allowed) return;
  const user = db
    .select()
    .from(users)
    .where(or(eq(users.email, id), eq(users.username, id)))
    .get();
  if (!user) return;
  const token = newToken();
  db.insert(passwordResets)
    .values({
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt: new Date(now + PASSWORD_RESET_TTL_MS),
    })
    .run();
  const link = `${origin}/reset-password?token=${token}`;
  queueEmail(db, {
    kind: "password-reset",
    to: user.email,
    subject: "Reset your Cosmia password",
    body: `Hello ${user.username},\n\nUse this link within one hour to choose a new password:\n${link}\n\nIf you did not ask for this, ignore this message.`,
  });
}

/** Spend a reset token: sets the new password and ends every existing session of that user. */
export function resetPassword(
  db: Db,
  token: string,
  password: string,
  now = Date.now(),
): AuthResult<AuthUser> {
  const problem = passwordProblem(password);
  if (problem) {
    return { ok: false, error: { code: "weak_password", message: problem, fields: ["password"] } };
  }
  const reset = db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, sha256(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date(now)),
      ),
    )
    .get();
  if (!reset) {
    return {
      ok: false,
      error: { code: "invalid_token", message: "This reset link is invalid or has expired." },
    };
  }
  return db.transaction((tx) => {
    tx.update(passwordResets)
      .set({ usedAt: new Date(now) })
      .where(eq(passwordResets.id, reset.id))
      .run();
    const user = tx
      .update(users)
      .set({ passwordHash: hashPassword(password), updatedAt: new Date(now) })
      .where(eq(users.id, reset.userId))
      .returning()
      .get();
    tx.delete(sessions).where(eq(sessions.userId, reset.userId)).run();
    return { ok: true as const, value: toUser(user) };
  });
}

export function isResetTokenValid(db: Db, token: string, now = Date.now()): boolean {
  return Boolean(
    db
      .select({ id: passwordResets.id })
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, sha256(token)),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date(now)),
        ),
      )
      .get(),
  );
}
