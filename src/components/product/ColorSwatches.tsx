"use client";

import styles from "./PurchaseExtras.module.css";

export type Swatch = { slug: string; name: string; hex: string };

/** Round colour chips with a name tooltip (Figma "Product color" 3:35398). Selection is shown on the page only. */
export function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: Swatch[];
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Color" data-testid="swatches">
      <span className={styles.swatchLabel}>Color:</span>
      {colors.map((color) => (
        <button
          key={color.slug}
          type="button"
          role="radio"
          aria-checked={color.slug === value}
          aria-label={color.name}
          data-name={color.name}
          className={styles.swatch}
          onClick={() => onChange(color.slug)}
        >
          <span style={{ background: color.hex }} />
        </button>
      ))}
    </div>
  );
}
