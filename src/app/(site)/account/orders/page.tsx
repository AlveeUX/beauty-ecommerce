import type { Metadata } from "next";
import Link from "next/link";
import account from "@/components/account/Account.module.css";
import styles from "@/components/orders/OrderPages.module.css";
import { getDb } from "@/db/client";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireAccountUser } from "@/server/auth/page-guard";
import { listOrdersForUser } from "@/server/orders/service";
import { STATUS_LABEL } from "@/server/orders/state";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersRoute() {
  const user = await requireAccountUser();
  const orders = listOrdersForUser(getDb(), user.id);
  return (
    <section className={account.card} aria-labelledby="orders">
      <h2 id="orders">Orders</h2>
      {orders.length === 0 ? (
        <div className={styles.empty} data-testid="orders-empty">
          <p>You have not placed an order yet.</p>
          <Link href="/shop" className={styles.dark}>
            Continue shopping
          </Link>
        </div>
      ) : (
        <table className={styles.list} data-testid="orders-list">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Date</th>
              <th scope="col">Status</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.number}>
                <td>
                  <Link href={`/account/orders/${o.number}`}>{o.number}</Link>
                </td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{STATUS_LABEL[o.status]}</td>
                <td>{formatMoney(o.totalCents, "full")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
