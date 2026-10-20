import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { addresses } from "@/db/schema";
import type { BillingInput } from "@/lib/validation/checkout";

export type AddressView = {
  id: number;
  firstName: string;
  lastName: string;
  company: string | null;
  country: string;
  address1: string;
  address2: string | null;
  city: string;
  postcode: string;
  phone: string;
  isDefault: boolean;
};

const MAX_ADDRESSES = 10;

const toView = (r: typeof addresses.$inferSelect): AddressView => ({
  id: r.id,
  firstName: r.firstName,
  lastName: r.lastName,
  company: r.company,
  country: r.country,
  address1: r.address1,
  address2: r.address2,
  city: r.city,
  postcode: r.postcode,
  phone: r.phone,
  isDefault: r.isDefault,
});

type Fields = Omit<BillingInput, "email" | "notes">;
const values = (a: Fields) => ({
  firstName: a.firstName,
  lastName: a.lastName,
  company: a.company ?? null,
  country: a.country,
  address1: a.address1,
  address2: a.address2 ?? null,
  city: a.city,
  postcode: a.postcode,
  phone: a.phone,
});

export function listAddresses(db: Db, userId: number): AddressView[] {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), addresses.id)
    .all()
    .map(toView);
}

export function defaultAddress(db: Db, userId: number): AddressView | null {
  return listAddresses(db, userId)[0] ?? null;
}

/** The first address becomes the default; the checkout form is pre-filled from it. */
export function addAddress(
  db: Db,
  userId: number,
  input: Fields,
): { ok: true; address: AddressView } | { ok: false; message: string } {
  const existing = db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .all();
  if (existing.length >= MAX_ADDRESSES) {
    return { ok: false, message: `You can save up to ${MAX_ADDRESSES} addresses.` };
  }
  const row = db
    .insert(addresses)
    .values({ userId, ...values(input), isDefault: existing.length === 0 })
    .returning()
    .get();
  return { ok: true, address: toView(row) };
}

/** Edits are scoped to the owner: another account's address id behaves as "not found". */
export function updateAddress(
  db: Db,
  userId: number,
  id: number,
  input: Fields,
): AddressView | null {
  const row = db
    .update(addresses)
    .set({ ...values(input), updatedAt: new Date() })
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning()
    .get();
  return row ? toView(row) : null;
}

export function setDefaultAddress(db: Db, userId: number, id: number): boolean {
  return db.transaction((tx) => {
    const own = tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .get();
    if (!own) return false;
    tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId)).run();
    tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id)).run();
    return true;
  });
}

export function deleteAddress(db: Db, userId: number, id: number): boolean {
  return db.transaction((tx) => {
    const removed = tx
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning()
      .get();
    if (!removed) return false;
    if (removed.isDefault) {
      const next = tx
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(addresses.id)
        .get();
      if (next)
        tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id)).run();
    }
    return true;
  });
}
