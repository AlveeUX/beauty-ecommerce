import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { banners } from "@/db/schema";

export type Banner = {
  id: number;
  slot: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  image: string | null;
  data: Record<string, unknown>;
  endsAt: Date | null;
};

/**
 * Active banners for a content slot, in display order. A banner is shown only while
 * `is_active` is set and now is inside its optional [starts_at, ends_at) window (ACN-001, HOM-006).
 */
export function getBanners(db: Db, slot: string, now = new Date()): Banner[] {
  return db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.slot, slot),
        eq(banners.isActive, true),
        or(isNull(banners.startsAt), lte(banners.startsAt, now)),
        or(isNull(banners.endsAt), gt(banners.endsAt, now)),
      ),
    )
    .orderBy(asc(banners.sortOrder), asc(banners.id))
    .all()
    .map((b) => {
      let data: Record<string, unknown> = {};
      try {
        data = b.data ? (JSON.parse(b.data) as Record<string, unknown>) : {};
      } catch {
        // malformed JSON: treat the extras as absent
      }
      return {
        id: b.id,
        slot: b.slot,
        eyebrow: b.eyebrow,
        title: b.title,
        subtitle: b.subtitle,
        ctaLabel: b.ctaLabel,
        ctaHref: b.ctaHref,
        image: b.image,
        data,
        endsAt: b.endsAt,
      };
    });
}
