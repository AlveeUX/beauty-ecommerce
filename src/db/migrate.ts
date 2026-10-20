import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { migrationsFolder } from "./config";
import type { Db } from "./client";

/** Apply all pending migrations to the given database. */
export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder: migrationsFolder() });
}
