import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    getDb().run(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch {
    return Response.json({ status: "error", db: "unavailable" }, { status: 503 });
  }
}
