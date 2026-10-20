"use client";

import { SUBSCRIBE_DISCOUNT_PERCENT, SUBSCRIBE_EVERY_DAYS } from "@/config/store";
import { formatMoney } from "@/lib/money";
import styles from "./PurchaseExtras.module.css";

export type PurchasePlan = "once" | "subscribe";

/** Price of the subscription plan: the discount comes off the unit price, rounded to whole cents. */
export const subscriptionCents = (priceCents: number) =>
  Math.round((priceCents * (100 - SUBSCRIBE_DISCOUNT_PERCENT)) / 100);

/**
 * "One-Time Purchase" / "Subscribe & Save 15%" cards (PRD-010, Figma 3:36766). Subscriptions need a
 * recurring-order backend that does not exist yet, so choosing one shows the offer but the buy buttons
 * stay off (decision-log D-038).
 */
export function PurchaseOptions({
  priceCents,
  plan,
  onChange,
}: {
  priceCents: number;
  plan: PurchasePlan;
  onChange: (plan: PurchasePlan) => void;
}) {
  const subscribe = subscriptionCents(priceCents);
  return (
    <fieldset className={styles.options} data-testid="purchase-options">
      <legend className={styles.srOnly}>Purchase option</legend>
      <label className={styles.option} data-checked={plan === "once" || undefined}>
        <input
          type="radio"
          name="plan"
          value="once"
          checked={plan === "once"}
          onChange={() => onChange("once")}
          data-testid="plan-once"
        />
        <span className={styles.radio} aria-hidden="true" />
        <span className={styles.optionText}>
          <strong>One-Time Purchase</strong>
          <span>Complimentary deluxe sample included</span>
        </span>
        <span className={styles.optionPrice}>{formatMoney(priceCents, "full")}</span>
      </label>
      <label className={styles.option} data-checked={plan === "subscribe" || undefined}>
        <input
          type="radio"
          name="plan"
          value="subscribe"
          checked={plan === "subscribe"}
          onChange={() => onChange("subscribe")}
          data-testid="plan-subscribe"
        />
        <span className={styles.radio} aria-hidden="true" />
        <span className={styles.optionText}>
          <strong>
            Subscribe &amp; Save {SUBSCRIBE_DISCOUNT_PERCENT}%{" "}
            <em className={styles.save}>SAVE {formatMoney(priceCents - subscribe, "full")}</em>
          </strong>
          <span>Delivered every {SUBSCRIBE_EVERY_DAYS} days · Skip or cancel anytime</span>
        </span>
        <span className={styles.optionPrice}>{formatMoney(subscribe, "full")}</span>
      </label>
    </fieldset>
  );
}
