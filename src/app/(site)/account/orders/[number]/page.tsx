import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import account from "@/components/account/Account.module.css";
import { OrderDetails, OrderTimeline } from "@/components/orders/OrderDetails";
import { getDb } from "@/db/client";
import { requireAccountUser } from "@/server/auth/page-guard";
import { getOrderForUser, isOrderNumber } from "@/server/orders/service";
import { STATUS_LABEL } from "@/server/orders/state";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

type Props = { params: Promise<{ number: string }> };

/** One of the signed-in customer's own orders; another account's order behaves as "not found". */
export default async function OrderRoute({ params }: Props) {
  const { number } = await params;
  const user = await requireAccountUser();
  const order = isOrderNumber(number) ? getOrderForUser(getDb(), user.id, number) : null;
  if (!order) notFound();
  return (
    <>
      <section className={account.card} aria-labelledby="order">
        <h2 id="order" data-testid="order-heading">
          Order {order.number} · {STATUS_LABEL[order.status]}
        </h2>
        <OrderTimeline order={order} />
      </section>
      <section className={account.card} aria-label="Order details">
        <OrderDetails order={order} />
      </section>
      <p>
        <Link href="/account/orders">← All orders</Link>
      </p>
    </>
  );
}
