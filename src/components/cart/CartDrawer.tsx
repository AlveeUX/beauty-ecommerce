"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { MAX_LINE_QUANTITY } from "@/config/store";
import { formatMoney } from "@/lib/money";
import { useCart } from "./CartProvider";
import { FreeShippingBar } from "./FreeShippingBar";
import { QuantityStepper } from "./QuantityStepper";
import styles from "./CartDrawer.module.css";

/**
 * Slide-in cart (CRT-001): opens on add, filled and empty states. Figma 3:15424 (filled) and
 * 3:15067 (empty). A modal dialog: Escape and the overlay close it, focus returns to the opener.
 */
export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, setQuantity, remove, busy } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    opener.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
      if (event.key !== "Tab" || !panel.current) return;
      // keep keyboard focus inside the drawer
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])",
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;
  const empty = cart.lines.length === 0;

  return (
    <div className={styles.overlay} data-testid="cart-overlay">
      <button
        type="button"
        className={styles.scrim}
        aria-label="Close cart"
        tabIndex={-1}
        onClick={closeDrawer}
      />
      <button
        type="button"
        className={styles.closeOutside}
        aria-label="Close cart"
        onClick={closeDrawer}
      >
        <Icon name="x" size={20} />
      </button>

      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        data-testid="cart-drawer"
      >
        <header className={styles.head}>
          <h2 id="cart-drawer-title">{empty ? "Your Cart (0)" : `Your cart (${cart.count})`}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close cart"
            onClick={closeDrawer}
            data-autofocus
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cart/close.svg" alt="" width={13} height={13} />
          </button>
        </header>

        <FreeShippingBar
          subtotalCents={cart.subtotalCents}
          thresholdCents={cart.freeShippingThresholdCents}
        />

        {empty ? (
          <div className={styles.empty} data-testid="cart-empty">
            <div className={styles.illustration} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.boxes} src="/images/cart/empty-a.svg" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/cart/empty-b.svg" alt="" />
            </div>
            <p className={styles.emptyTitle}>Your beauty bag Is empty</p>
            <p className={styles.emptyText}>
              Discover skincare and beauty essentials made to elevate your everyday routine.
            </p>
            <Link href="/shop" className={styles.outline} onClick={closeDrawer}>
              <span>Continue shopping</span>
              <Icon name="arrow-up-right" size={18} />
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.items} data-testid="cart-lines">
              {cart.lines.map((line) => (
                <li key={line.variantId} className={styles.item}>
                  <Link
                    href={`/product/${line.slug}`}
                    className={styles.thumb}
                    aria-label={line.name}
                    onClick={closeDrawer}
                  >
                    {line.image ? <Image src={line.image} alt="" fill sizes="90px" /> : null}
                  </Link>
                  <div className={styles.info}>
                    <p className={styles.name}>
                      <Link href={`/product/${line.slug}`} onClick={closeDrawer}>
                        {line.name}
                      </Link>
                    </p>
                    <p className={styles.price}>
                      {line.compareAtCents && line.compareAtCents > line.unitCents ? (
                        <s>{formatMoney(line.compareAtCents)}</s>
                      ) : null}
                      <span>{formatMoney(line.unitCents)}</span>
                    </p>
                    <QuantityStepper
                      size="sm"
                      name={line.name}
                      value={line.quantity}
                      max={Math.min(line.available, MAX_LINE_QUANTITY)}
                      disabled={busy}
                      onChange={(q) => void setQuantity(line.variantId, q)}
                    />
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Remove ${line.name}`}
                      onClick={() => void remove(line.variantId)}
                    >
                      <span>Remove</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className={styles.foot}>
              <p className={styles.subtotal}>
                <span>Subtotal</span>
                <strong data-testid="drawer-subtotal">{formatMoney(cart.subtotalCents)}</strong>
              </p>
              <Link href="/checkout" className={styles.checkout} onClick={closeDrawer}>
                <span>Checkout</span>
                <Icon name="arrow-up-right" size={18} />
              </Link>
              <Link href="/cart" className={styles.outline} onClick={closeDrawer}>
                <span>View Cart</span>
                <Icon name="arrow-up-right" size={18} />
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
