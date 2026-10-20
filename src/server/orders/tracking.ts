import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { orders } from "@/db/schema";
import { hit } from "@/server/security/rate-limit";
import { getOrderByNumber, isOrderNumber, type OrderView } from "./service";

const TRACK_LIMIT = 10;
const TRACK_WINDOW_MS = 15 * 60 * 1000;

export type TrackResult =
  | { ok: true; order: OrderView }
  | { ok: false; reason: "not_found" | "rate_limited"; retryAfterSeconds?: number };

/**
 * Order lookup for guests (TRK-001, BR-12): the order ID and the billing email must both match. Every
 * mismatch looks the same ("not found") so IDs cannot be probed, and lookups are limited per client
 * (SEC-004). `clientKey` is the caller's address; the limit also applies per order ID.
 */
export function trackOrder(
  db: Db,
  orderId: string,
  email: string,
  clientKey: string,
  now = Date.now(),
): TrackResult {
  const byClient = hit(db, `track:ip:${clientKey}`, TRACK_LIMIT, TRACK_WINDOW_MS, now);
  const id = orderId.trim().toUpperCase();
  const byOrder = hit(db, `track:order:${id}`, TRACK_LIMIT, TRACK_WINDOW_MS, now);
  if (!byClient.allowed || !byOrder.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.ceil(Math.max(byClient.retryAfterMs, byOrder.retryAfterMs) / 1000),
    };
  }
  if (!isOrderNumber(id)) return { ok: false, reason: "not_found" };
  const match = db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.number, id), eq(orders.email, email.trim().toLowerCase())))
    .get();
  if (!match) return { ok: false, reason: "not_found" };
  const order = getOrderByNumber(db, id);
  return order ? { ok: true, order } : { ok: false, reason: "not_found" };
}
