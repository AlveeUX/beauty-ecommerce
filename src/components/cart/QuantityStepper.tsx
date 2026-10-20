"use client";

import styles from "./QuantityStepper.module.css";

type Props = {
  value: number;
  /** Largest allowed quantity (stock, capped by the store limit). */
  max: number;
  name: string;
  size?: "sm" | "md";
  disabled?: boolean;
  onChange: (next: number) => void;
};

/** Dashed stepper "- 01 +" (Figma 3:15457 in the drawer, 3:20546 on the cart page). */
export function QuantityStepper({ value, max, name, size = "md", disabled, onChange }: Props) {
  return (
    <div className={`${styles.stepper} ${size === "sm" ? styles.sm : ""}`} data-testid="qty">
      <button
        type="button"
        aria-label={`Decrease quantity of ${name}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/cart/minus.svg" alt="" width={16} height={16} />
      </button>
      <output aria-live="polite" aria-label={`Quantity of ${name}`}>
        {String(value).padStart(2, "0")}
      </output>
      <button
        type="button"
        aria-label={`Increase quantity of ${name}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/cart/plus.svg" alt="" width={16} height={16} />
      </button>
    </div>
  );
}
