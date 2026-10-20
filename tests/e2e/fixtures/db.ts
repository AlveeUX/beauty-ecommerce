import path from "node:path";
import Database from "better-sqlite3";

/**
 * Direct access to the E2E test database (./data/test.db, never the dev database) for the things a
 * browser cannot see: the local email outbox, order rows and stock. Reads are the norm; the only writes
 * are test setup (setStock) so a test can create the "stock changed meanwhile" situation.
 */
const file = path.resolve(process.cwd(), process.env.TEST_DATABASE_URL ?? "./data/test.db");

function open() {
  if (!path.basename(file).toLowerCase().includes("test")) {
    throw new Error(`Refusing to open "${file}": the E2E database must be a *test* database`);
  }
  const db = new Database(file);
  db.pragma("busy_timeout = 5000");
  return db;
}

export function query<T>(sql: string, ...params: unknown[]): T[] {
  const db = open();
  try {
    return db.prepare(sql).all(...params) as T[];
  } finally {
    db.close();
  }
}

export function run(sql: string, ...params: unknown[]): void {
  const db = open();
  try {
    db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}

/** Link from the most recent password-reset email to this address. */
export function latestResetLink(email: string): string | null {
  const rows = query<{ body: string }>(
    "select body from email_outbox where kind = 'password-reset' and to_email = ? order by id desc limit 1",
    email.toLowerCase(),
  );
  const match = rows[0]
    ? /(https?:\/\/\S+\/reset-password\?token=[0-9a-f]{64})/.exec(rows[0].body)
    : null;
  return match?.[1] ?? null;
}

export type OrderRow = {
  number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_cents: number;
  email: string;
  user_id: number | null;
};

export function ordersFor(email: string): OrderRow[] {
  return query<OrderRow>(
    "select number, status, payment_status, payment_method, total_cents, email, user_id from orders where email = ? order by id",
    email.toLowerCase(),
  );
}

export function stockOf(slug: string): { onHand: number; reserved: number } {
  const row = query<{ on_hand: number; reserved: number }>(
    `select i.on_hand, i.reserved from inventory i
       join variants v on v.id = i.variant_id
       join products p on p.id = v.product_id
      where p.slug = ? and v.is_default = 1`,
    slug,
  )[0];
  if (!row) throw new Error(`no stock row for ${slug}`);
  return { onHand: row.on_hand, reserved: row.reserved };
}

export function setStock(slug: string, onHand: number): void {
  run(
    `update inventory set on_hand = ? where variant_id =
       (select v.id from variants v join products p on p.id = v.product_id where p.slug = ? and v.is_default = 1)`,
    onHand,
    slug,
  );
}

export function contactMessagesFor(email: string) {
  return query<{ name: string; email: string; topic: string; message: string; status: string }>(
    "select name, email, topic, message, status from contact_messages where email = ? order by id",
    email.toLowerCase(),
  );
}

export function blogCommentsFor(email: string) {
  return query<{ name: string; body: string; status: string; parent_id: number | null }>(
    "select name, body, status, parent_id from blog_comments where email = ? order by id",
    email.toLowerCase(),
  );
}

export function subscribersFor(email: string) {
  return query<{ email: string; source: string; unsubscribed_at: number | null }>(
    "select email, source, unsubscribed_at from newsletter_subscribers where email = ?",
    email.toLowerCase(),
  );
}

/** A unique, valid email address per test so tests never share an account or an order. */
export function uniqueEmail(label: string): string {
  return `${label}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
}
