import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { OrderDetails, OrderTimeline } from "@/components/orders/OrderDetails";
import styles from "@/components/orders/OrderPages.module.css";
import { getDb } from "@/db/client";
import { getCurrentUser } from "@/server/auth/session";
import { getOrderByNumber, isOrderNumber } from "@/server/orders/service";
import { lastOrderNumber } from "@/server/orders/session";
import { METHOD_COPY } from "@/components/checkout/methods";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };

type Props = { params: Promise<{ number: string }> };

/**
 * Order confirmation (CHK-007, proposed design). Only the browser that placed the order - or the
 * signed-in owner - can open it; anyone else is sent to the tracking form, which asks for the email.
 */
export default async function ConfirmationRoute({ params }: Props) {
  const { number } = await params;
  if (!isOrderNumber(number)) notFound();
  const db = getDb();
  const order = getOrderByNumber(db, number);
  if (!order) notFound();
  const user = await getCurrentUser();
  const owns =
    (await lastOrderNumber()) === number || (user !== null && order.email === user.email);
  if (!owns) redirect("/track-order");

  return (
    <>
      <PageHero
        title="Order received"
        crumbs={[{ label: "Checkout", href: "/checkout" }, { label: "Order received" }]}
      />
      <div className={`container ${styles.page}`}>
        <section className={styles.banner} aria-labelledby="thanks">
          <h2 id="thanks">Thank you. Your order has been received.</h2>
          <dl className={styles.facts}>
            <div>
              <dt>Order ID</dt>
              <dd data-testid="order-number">{order.number}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.email}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>${(order.totalCents / 100).toFixed(2)}</dd>
            </div>
          </dl>
          <p className={styles.next} data-testid="next-steps">
            {order.paymentStatus === "paid"
              ? "Your payment was received and we are preparing your order."
              : METHOD_COPY[order.paymentMethod].description}{" "}
            {order.paymentMethod === "bank_transfer" && order.paymentStatus !== "paid"
              ? `Payment reference: ${order.number}. `
              : null}
            We have sent a confirmation to {order.email}.
          </p>
        </section>
        <OrderDetails order={order} />
        <div className={styles.timeline}>
          <h2>Order progress</h2>
          <OrderTimeline order={order} />
        </div>
        <div className={styles.actions}>
          <Link href="/track-order" className={styles.outline}>
            Track this order
          </Link>
          <Link href="/shop" className={styles.dark}>
            Continue shopping
          </Link>
        </div>
      </div>
      <BenefitStrip />
    </>
  );
}
