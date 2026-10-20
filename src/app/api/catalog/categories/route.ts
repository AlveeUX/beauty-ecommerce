import { getDb } from "@/db/client";
import { getCategoryTree } from "@/server/catalog/service";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ categories: getCategoryTree(getDb()) });
}
