import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { resolveDatabasePath } from "./config";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/** Open a connection with the project's required pragmas. */
export function createDb(file: string = resolveDatabasePath()): {
  db: Db;
  sqlite: Database.Database;
} {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { db: drizzle(sqlite, { schema }), sqlite };
}

// Reuse one connection across Next.js dev hot reloads.
const globalForDb = globalThis as unknown as { __db?: Db };

/** Shared application connection. */
export function getDb(): Db {
  globalForDb.__db ??= createDb().db;
  return globalForDb.__db;
}
