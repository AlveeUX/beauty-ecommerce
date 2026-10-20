import { createDb } from "../src/db/client";
import { resolveDatabasePath } from "../src/db/config";
import { runMigrations } from "../src/db/migrate";
import { seedCatalog } from "../src/db/seed";

// Replaces all catalog data with the deterministic demo catalog (see src/db/seed).
const file = resolveDatabasePath();
const { db, sqlite } = createDb(file);
runMigrations(db);
const result = seedCatalog(db);
sqlite.close();
console.log(`Seeded ${result.products} products in ${result.categories} categories -> ${file}`);
