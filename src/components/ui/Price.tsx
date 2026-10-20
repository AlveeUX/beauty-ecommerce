import { formatMoney, type Cents } from "@/lib/money";
import styles from "./Price.module.css";

type PriceProps = {
  cents: Cents;
  /** Original price; shown struck through when higher than `cents`. */
  compareAtCents?: Cents | null;
  format?: "compact" | "full";
  size?: "md" | "lg";
};

export function Price({ cents, compareAtCents, format = "compact", size = "md" }: PriceProps) {
  const onSale = compareAtCents != null && compareAtCents > cents;
  return (
    <p className={`${styles.price} ${styles[size]}`}>
      <span className={styles.current}>{formatMoney(cents, format)}</span>
      {onSale ? (
        <>
          <span className="visually-hidden">Was</span>
          <s className={styles.compare}>{formatMoney(compareAtCents, format)}</s>
        </>
      ) : null}
    </p>
  );
}
