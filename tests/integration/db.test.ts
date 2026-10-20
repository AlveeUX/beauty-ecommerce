import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";
import { appMeta } from "../../src/db/schema";

describe("database foundation", () => {
  it("applies migrations to a fresh in-memory database and round-trips a row", () => {
    const { db, sqlite } = createDb(":memory:");
    runMigrations(db);

    db.insert(appMeta).values({ key: "k", value: "v" }).run();
    const row = db.select().from(appMeta).where(eq(appMeta.key, "k")).get();

    expect(row).toEqual({ key: "k", value: "v" });
    sqlite.close();
  });

  it("enforces foreign keys pragma", () => {
    const { sqlite } = createDb(":memory:");
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    sqlite.close();
  });
});
