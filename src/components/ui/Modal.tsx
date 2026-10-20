"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

type ModalProps = {
  titleId: string;
  /** Width of the dialog in px (Figma: wishlist popup 540, compare popup 365). */
  width?: number;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
};

/**
 * Centered dialog over a dark scrim (wishlist and compare popups, Figma 3:15517 / 3:15903).
 * Escape and the scrim close it, Tab stays inside, focus returns to the opener on close.
 */
export function Modal({ titleId, width = 540, onClose, children, testId }: ModalProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !box.current) return;
      const focusable = box.current.querySelectorAll<HTMLElement>(
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
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.scrim}
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={box}
        className={styles.box}
        style={{ width: `min(${width}px, calc(100vw - 32px))` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  );
}
