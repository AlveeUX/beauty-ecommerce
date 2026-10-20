import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import { newsletterSubscribers } from "../../src/db/schema";
import { newsletterSchema } from "../../src/lib/validation/newsletter";
import { subscribe } from "../../src/server/newsletter/service";

let db: Db;
beforeAll(() => {
  db = createDb(":memory:").db;
  runMigrations(db);
});

const input = (email: string, source: "footer" | "popup" = "footer") =>
  newsletterSchema.parse({ email, source, consent: true });
const rows = (email: string) =>
  db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).all();

describe("newsletter sign-up (NWS-001)", () => {
  it("normalises the address and requires consent", () => {
    expect(input("  Ana@Example.COM ").email).toBe("ana@example.com");
    expect(
      newsletterSchema.safeParse({ email: "a@b.co", source: "footer", consent: false }).success,
    ).toBe(false);
    expect(
      newsletterSchema.safeParse({ email: "nope", source: "footer", consent: true }).success,
    ).toBe(false);
    expect(
      newsletterSchema.safeParse({ email: "a@b.co", source: "other", consent: true }).success,
    ).toBe(false);
  });

  it("stores an address once, however often and in whatever case it is sent", () => {
    expect(subscribe(db, input("ana@example.com"), "ip-1").ok).toBe(true);
    expect(subscribe(db, input("ANA@example.com", "popup"), "ip-1").ok).toBe(true);
    const found = rows("ana@example.com");
    expect(found).toHaveLength(1);
    expect(found[0]!.source).toBe("footer"); // the first source is kept
  });

  it("re-activates an address that had unsubscribed", () => {
    subscribe(db, input("back@example.com"), "ip-2");
    db.update(newsletterSubscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, "back@example.com"))
      .run();
    subscribe(db, input("back@example.com", "popup"), "ip-2");
    const [row] = rows("back@example.com");
    expect(row!.unsubscribedAt).toBeNull();
    expect(row!.source).toBe("popup");
  });

  it("limits sign-ups per client", () => {
    const results = Array.from({ length: 11 }, (_, i) =>
      subscribe(db, input(`u${i}@example.com`), "ip-flood", 5_000),
    );
    expect(results.slice(0, 10).every((r) => r.ok)).toBe(true);
    expect(results[10]).toMatchObject({ ok: false, reason: "rate_limited" });
  });
});
