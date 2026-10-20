import { createDb } from "../src/db/client";
import { resolveDatabasePath } from "../src/db/config";
import { runMigrations } from "../src/db/migrate";

const file = resolveDatabasePath();
const { db, sqlite } = createDb(file);
runMigrations(db);
sqlite.close();
console.log(`Migrations applied to ${file}`);
