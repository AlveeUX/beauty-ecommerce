import fs from "node:fs";
import path from "node:path";
import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import { seedCatalog } from "../src/db/seed";

// Destructive by design, so it only ever touches a database whose path
// contains "test" (see docs/e2e-testing-strategy.md section 6).
const configured = process.env.TEST_DATABASE_URL ?? "./data/test.db";
const file = path.resolve(process.cwd(), configured);
const dataDir = path.resolve(process.cwd(), "data");

if (!path.basename(file).toLowerCase().includes("test") || !file.startsWith(dataDir + path.sep)) {
  console.error(`Refusing to reset "${file}": must be a *test* database inside ./data`);
  process.exit(1);
}

for (const suffix of ["", "-wal", "-shm"]) {
  fs.rmSync(file + suffix, { force: true });
}

const { db, sqlite } = createDb(file);
runMigrations(db);
const seeded = seedCatalog(db);
sqlite.close();
console.log(`Test database reset and seeded (${seeded.products} products): ${file}`);
