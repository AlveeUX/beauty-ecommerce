import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import { emailOutbox, passwordResets, sessions, users } from "../../src/db/schema";
import { seedCatalog } from "../../src/db/seed";
import {
  authenticate,
  createSession,
  destroySession,
  getSessionUser,
  isResetTokenValid,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../../src/server/auth/service";
import { hashPassword, passwordProblem, verifyPassword } from "../../src/server/auth/password";
import { addItem, getCart, newCartToken } from "../../src/server/cart/service";
import { mergeGuestCart, mergeWishlist } from "../../src/server/cart/account";
import { hit, peek } from "../../src/server/security/rate-limit";

let db: Db;
const ana = { username: "Ana", email: "Ana@Example.com", password: "correct horse 42" };

beforeEach(() => {
  db = createDb(":memory:").db;
  runMigrations(db);
  seedCatalog(db);
});

function register() {
  const r = registerUser(db, ana);
  if (!r.ok) throw new Error("register failed");
  return r.value;
}

describe("password hashing (SEC-001)", () => {
  it("never stores the password and verifies only the right one", () => {
    const hash = hashPassword("s3cret-pass");
    expect(hash).not.toContain("s3cret-pass");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("s3cret-pass", hash)).toBe(true);
    expect(verifyPassword("s3cret-pasS", hash)).toBe(false);
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(hashPassword("s3cret-pass")).not.toBe(hash); // salted
  });

  it("applies the policy: 8+ characters, not a common password (USR-002)", () => {
    expect(passwordProblem("short")).toMatch(/at least 8/);
    expect(passwordProblem("Password123")).toMatch(/common/);
    expect(passwordProblem("a long unusual phrase")).toBeNull();
  });
});

describe("registration (USR-002)", () => {
  it("creates an account with lower-cased email and user name and a hashed password", () => {
    const user = register();
    expect(user).toMatchObject({ email: "ana@example.com", username: "ana", role: "customer" });
    const row = db.select().from(users).where(eq(users.id, user.id)).get()!;
    expect(row.passwordHash).not.toContain(ana.password);
  });

  it("rejects duplicate email, duplicate user name and weak passwords", () => {
    register();
    expect(registerUser(db, { ...ana, username: "other" })).toMatchObject({
      ok: false,
      error: { code: "email_taken" },
    });
    expect(registerUser(db, { ...ana, email: "new@example.com" })).toMatchObject({
      ok: false,
      error: { code: "username_taken" },
    });
    expect(
      registerUser(db, { username: "bo", email: "bo@example.com", password: "12345678" }),
    ).toMatchObject({ ok: false, error: { code: "weak_password" } });
  });
});

describe("login and throttling (USR-001, SEC-004)", () => {
  it("accepts user name or email, case-insensitively", () => {
    register();
    expect(authenticate(db, "ANA", ana.password).ok).toBe(true);
    expect(authenticate(db, "ana@example.com", ana.password).ok).toBe(true);
  });

  it("gives the same answer for a wrong password and an unknown user", () => {
    register();
    const wrong = authenticate(db, "ana", "nope-nope-nope");
    const unknown = authenticate(db, "ghost", "nope-nope-nope");
    expect(wrong).toMatchObject({ ok: false, error: { code: "invalid_credentials" } });
    expect(unknown).toEqual(wrong);
  });

  it("locks after 5 failures, even for the right password, then recovers after the window", () => {
    register();
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) {
      expect(authenticate(db, "ana", "bad-bad-bad", t0 + i)).toMatchObject({
        error: { code: "invalid_credentials" },
      });
    }
    expect(authenticate(db, "ana", ana.password, t0 + 10)).toMatchObject({
      ok: false,
      error: { code: "locked" },
    });
    expect(authenticate(db, "ana", ana.password, t0 + 16 * 60 * 1000).ok).toBe(true);
  });

  it("a successful login clears the failure counter", () => {
    register();
    for (let i = 0; i < 3; i++) authenticate(db, "ana", "bad-bad-bad");
    expect(authenticate(db, "ana", ana.password).ok).toBe(true);
    expect(peek(db, "login:ana", 5).remaining).toBe(5);
  });
});

describe("sessions (USR-005)", () => {
  it("resolves a live session and stores only the token hash", () => {
    const user = register();
    const { token } = createSession(db, user.id, false);
    expect(getSessionUser(db, token)?.id).toBe(user.id);
    const stored = db.select().from(sessions).get()!;
    expect(stored.tokenHash).not.toBe(token);
  });

  it("logout deletes the session server-side, so a copied cookie stops working", () => {
    const { token } = createSession(db, register().id, false);
    destroySession(db, token);
    expect(getSessionUser(db, token)).toBeNull();
  });

  it("expires, and remember-me lasts longer", () => {
    const user = register();
    const short = createSession(db, user.id, false, 1000);
    const long = createSession(db, user.id, true, 1000);
    expect(long.maxAgeSeconds).toBeGreaterThan(short.maxAgeSeconds);
    expect(getSessionUser(db, short.token, 1000 + short.maxAgeSeconds * 1000 + 1)).toBeNull();
    expect(getSessionUser(db, long.token, 1000 + short.maxAgeSeconds * 1000 + 1)).not.toBeNull();
  });

  it("ignores malformed tokens", () => {
    expect(getSessionUser(db, "x")).toBeNull();
    expect(getSessionUser(db, null)).toBeNull();
  });
});

describe("password reset (USR-003)", () => {
  const origin = "http://localhost:3000";

  it("queues a link for a known account and nothing for an unknown one", () => {
    register();
    requestPasswordReset(db, "ghost@example.com", origin);
    expect(db.select().from(emailOutbox).all()).toHaveLength(0);
    requestPasswordReset(db, "ana@example.com", origin);
    const mail = db.select().from(emailOutbox).all();
    expect(mail).toHaveLength(1);
    expect(mail[0]!.toEmail).toBe("ana@example.com");
    expect(mail[0]!.body).toContain(`${origin}/reset-password?token=`);
  });

  it("stores only the token hash, works once, ends other sessions and sets the new password", () => {
    const user = register();
    const session = createSession(db, user.id, false);
    requestPasswordReset(db, "ana", origin);
    const token = /token=([0-9a-f]{64})/.exec(db.select().from(emailOutbox).get()!.body)![1]!;
    expect(db.select().from(passwordResets).get()!.tokenHash).not.toBe(token);
    expect(isResetTokenValid(db, token)).toBe(true);

    expect(resetPassword(db, token, "a brand new phrase").ok).toBe(true);
    expect(getSessionUser(db, session.token)).toBeNull();
    expect(authenticate(db, "ana", "a brand new phrase").ok).toBe(true);
    expect(authenticate(db, "ana", ana.password).ok).toBe(false);
    expect(resetPassword(db, token, "another new phrase")).toMatchObject({
      ok: false,
      error: { code: "invalid_token" },
    });
  });

  it("rejects expired tokens and weak new passwords", () => {
    register();
    requestPasswordReset(db, "ana", origin, 1000);
    const token = /token=([0-9a-f]{64})/.exec(db.select().from(emailOutbox).get()!.body)![1]!;
    expect(resetPassword(db, token, "a brand new phrase", 1000 + 2 * 60 * 60 * 1000)).toMatchObject(
      { ok: false, error: { code: "invalid_token" } },
    );
    expect(resetPassword(db, token, "12345678", 2000)).toMatchObject({
      ok: false,
      error: { code: "weak_password" },
    });
  });

  it("limits reset requests per identifier", () => {
    register();
    for (let i = 0; i < 8; i++) requestPasswordReset(db, "ana", origin);
    expect(db.select().from(emailOutbox).all().length).toBe(5);
  });
});

describe("rate limiter", () => {
  it("counts per key inside a window and resets after it", () => {
    for (let i = 0; i < 3; i++) expect(hit(db, "k", 3, 1000, 0).allowed).toBe(true);
    expect(hit(db, "k", 3, 1000, 10).allowed).toBe(false);
    expect(hit(db, "other", 3, 1000, 10).allowed).toBe(true);
    expect(hit(db, "k", 3, 1000, 1001).allowed).toBe(true);
  });
});

describe("guest cart and wishlist merge at login (OQ-20, WSH-003)", () => {
  it("turns the guest cart into the account cart when the account has none", () => {
    const user = register();
    const guest = newCartToken();
    addItem(db, guest, { slug: "the-renewal-serum", quantity: 2 });
    const token = mergeGuestCart(db, guest, user.id);
    expect(token).toBe(guest);
    expect(getCart(db, token).count).toBe(2);
  });

  it("sums quantities into an existing account cart and removes the guest cart", () => {
    const user = register();
    const accountToken = mergeGuestCart(db, null, user.id);
    addItem(db, accountToken, { slug: "the-renewal-serum", quantity: 2 });
    addItem(db, accountToken, { slug: "barrier-repair-cream", quantity: 1 });

    const guest = newCartToken();
    addItem(db, guest, { slug: "the-renewal-serum", quantity: 3 });
    addItem(db, guest, { slug: "glow-cleansing-bar", quantity: 1 });

    const token = mergeGuestCart(db, guest, user.id);
    expect(token).toBe(accountToken);
    const cart = getCart(db, token);
    expect(cart.lines.find((l) => l.slug === "the-renewal-serum")!.quantity).toBe(5);
    expect(cart.lines).toHaveLength(3);
    expect(getCart(db, guest).count).toBe(0);
  });

  it("merges browser wishlists without duplicates and ignores junk slugs", () => {
    const user = register();
    mergeWishlist(db, user.id, ["the-renewal-serum", "barrier-repair-cream"]);
    const merged = mergeWishlist(db, user.id, ["the-renewal-serum", "glow-cleansing-bar", "../x"]);
    expect(merged.sort()).toEqual([
      "barrier-repair-cream",
      "glow-cleansing-bar",
      "the-renewal-serum",
    ]);
  });
});
