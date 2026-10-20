import { Icon } from "./Icon";
import styles from "./Rating.module.css";

type RatingProps = {
  /** Average rating, 0 to 5. */
  value: number;
  /** Number of reviews, shown as "[30]" like the design. */
  count?: number;
  /** "card" is the exact star strip of the product card (Figma 3:2304): 5 x 13.55 x 12.89, pitch 14.55. */
  variant?: "default" | "card";
};

/** Star outline from the design (13.55 wide, 12.89 tall), x offsets of the five stars. */
const STAR =
  "M6.77708 0L8.87119 4.24245L13.5542 4.92694L10.1656 8.22737L10.9653 12.89L6.77708 10.6875L2.58884 12.89L3.38854 8.22737L0 4.92694L4.68296 4.24245L6.77708 0Z";
const PITCH = 14.5542;

export function Rating({ value, count, variant = "default" }: RatingProps) {
  const rounded = Math.round(value);
  if (variant === "card") {
    return (
      <div
        className={`${styles.rating} ${styles.card}`}
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
      >
        <svg
          width="71.771"
          height="12.89"
          viewBox="0 0 71.771 12.89"
          aria-hidden="true"
          focusable="false"
        >
          {[0, 1, 2, 3, 4].map((n) => (
            <path
              key={n}
              d={STAR}
              transform={`translate(${(n * PITCH).toFixed(4)} 0)`}
              className={n < rounded ? styles.on : styles.off}
              fill="currentColor"
            />
          ))}
        </svg>
        {count !== undefined ? <span className={styles.count}>[{count}]</span> : null}
      </div>
    );
  }
  return (
    <div className={styles.rating} role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className={styles.stars} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon
            key={n}
            name="star"
            size={13}
            filled={n <= rounded}
            strokeWidth={1.2}
            className={n <= rounded ? styles.on : styles.off}
          />
        ))}
      </span>
      {count !== undefined ? <span className={styles.count}>[{count}]</span> : null}
    </div>
  );
}
