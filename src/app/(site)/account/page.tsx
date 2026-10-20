import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/account/Account.module.css";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { getDb } from "@/db/client";
import { requireAccountUser } from "@/server/auth/page-guard";
import { listOrdersForUser } from "@/server/orders/service";

export const metadata: Metadata = { title: "My account" };

export default async function AccountRoute() {
  const user = await requireAccountUser();
  const orders = listOrdersForUser(getDb(), user.id);
  return (
    <>
      <section className={styles.card} aria-labelledby="profile">
        <h2 id="profile">Hello, {user.username}</h2>
        <dl className={styles.profile} data-testid="profile">
          <dt>User name</dt>
          <dd>{user.username}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Orders</dt>
          <dd>
            {orders.length === 0 ? (
              "None yet"
            ) : (
              <Link href="/account/orders">{orders.length} placed</Link>
            )}
          </dd>
        </dl>
      </section>
      <section className={`${styles.card} ${styles.narrow}`} aria-labelledby="password">
        <h2 id="password">Change password</h2>
        <ChangePasswordForm />
      </section>
    </>
  );
}
