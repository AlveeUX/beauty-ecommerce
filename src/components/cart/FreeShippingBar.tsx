import { formatMoney } from "@/lib/money";
import styles from "./FreeShippingBar.module.css";

type Props = {
  subtotalCents: number;
  thresholdCents: number;
  /** "drawer" keeps the compact copy; "page" is the wide box above the cart table. */
  variant?: "drawer" | "page";
};

/** Free-shipping progress (BR-04): the fill and the truck follow subtotal / threshold. */
export function FreeShippingBar({ subtotalCents, thresholdCents, variant = "drawer" }: Props) {
  const remaining = Math.max(0, thresholdCents - subtotalCents);
  const ratio = Math.min(1, subtotalCents / thresholdCents);
  const unlocked = remaining === 0;

  return (
    <div
      className={`${styles.box} ${variant === "page" ? styles.page : ""}`}
      data-testid="shipping-bar"
    >
      <p className={styles.text}>
        {unlocked ? (
          <>🎉 You’ve unlocked free shipping!</>
        ) : subtotalCents === 0 ? (
          <>
            Spend <strong>{formatMoney(thresholdCents, "full")}</strong> and enjoy free shipping.
          </>
        ) : (
          <>
            You’re <strong>{formatMoney(remaining, "full")}</strong> away from free shipping!
          </>
        )}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Free shipping progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <span className={styles.fill} style={{ width: `${ratio * 100}%` }} />
        {subtotalCents > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.truck}
            src="/images/cart/truck-circle.svg"
            alt=""
            width={32}
            height={32}
            style={{ left: `calc(${ratio * 100}% - 16px)` }}
          />
        ) : null}
      </div>
    </div>
  );
}
