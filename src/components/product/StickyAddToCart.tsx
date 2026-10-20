"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import styles from "./StickyAddToCart.module.css";

type Props = {
  name: string;
  image?: string;
  priceCents: number;
  sizeLabel: string;
  disabled: boolean;
  onAdd: () => void;
  /** id of the purchase row; the bar shows once that row has scrolled out of view. */
  watch: string;
};

/**
 * Sticky add-to-cart bar of the "Sticky add to card" menu entry (the design has no frame for it, so this is a
 * plain bar: picture, name, price and the Add to cart button). It slides in when the page's own buttons leave
 * the window and never covers them.
 */
export function StickyAddToCart({
  name,
  image,
  priceCents,
  sizeLabel,
  disabled,
  onAdd,
  watch,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const row = document.getElementById(watch);
    if (!row) return;
    const observer = new IntersectionObserver(([entry]) => {
      // shown only when the row is gone upwards (scrolled past), not while it is still below the window
      setVisible(!entry!.isIntersecting && entry!.boundingClientRect.bottom < 0);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      className={styles.bar}
      data-visible={visible || undefined}
      data-testid="sticky-bar"
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className={`container ${styles.inner}`}>
        {image ? (
          <span className={styles.thumb}>
            <Image src={image} alt="" fill sizes="56px" />
          </span>
        ) : null}
        <p className={styles.name}>{name}</p>
        <p className={styles.price}>
          {formatMoney(priceCents, "full")} <span>/ {sizeLabel}</span>
        </p>
        <button
          type="button"
          className={styles.add}
          disabled={disabled}
          onClick={onAdd}
          data-testid="sticky-add"
        >
          Add to cart
          <Icon name="shopping-bag" size={15} />
        </button>
      </div>
    </div>
  );
}
