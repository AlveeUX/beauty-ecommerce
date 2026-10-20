"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import styles from "./ListModals.module.css";

/** "Already added": the product is already in the compare list (Figma 3:15903). */
export function CompareExistsModal({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <Modal titleId="compare-exists-title" width={365} onClose={onClose} testId="compare-exists">
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <Icon name="x" size={16} />
      </button>
      <div className={styles.notice}>
        <span className={styles.tick} aria-hidden="true">
          <Icon name="check" size={22} />
        </span>
        <h2 id="compare-exists-title">Already added</h2>
        <p>
          <strong>{name}</strong> is already in your Compare list.
        </p>
        <Link href="/compare" className={styles.primary} onClick={onClose} data-autofocus>
          <span>Compare now</span>
          <Icon name="arrow-up-right" size={18} />
        </Link>
        <button type="button" className={styles.outline} onClick={onClose}>
          <span>Continue shopping</span>
          <Icon name="arrow-up-right" size={18} />
        </button>
      </div>
    </Modal>
  );
}
