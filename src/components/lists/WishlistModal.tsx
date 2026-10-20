"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useList } from "@/lib/lists";
import { formatMoney } from "@/lib/money";
import type { ListProduct } from "@/server/catalog/lookup";
import styles from "./ListModals.module.css";

/** "Your wishlist (n)" popup shown after a heart is added (Figma 3:15517). */
export function WishlistModal({ onClose }: { onClose: () => void }) {
  const { slugs, remove } = useList("wishlist");
  const { add } = useCart();
  const [items, setItems] = useState<ListProduct[] | null>(null);
  const key = slugs.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetch(`/api/products/lookup?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json() as Promise<{ items: ListProduct[] }>)
      .then((body) => {
        if (!cancelled) setItems(body.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const visible = (items ?? []).filter((p) => slugs.includes(p.slug));

  return (
    <Modal titleId="wishlist-modal-title" width={543} onClose={onClose} testId="wishlist-modal">
      <header className={styles.head}>
        <h2 id="wishlist-modal-title">Your wishlist ({slugs.length})</h2>
        <button type="button" className={styles.closeInline} aria-label="Close" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </header>

      {slugs.length === 0 ? (
        <p className={styles.emptyLine}>Your wishlist is empty.</p>
      ) : (
        <ul className={styles.rows}>
          {visible.map((p) => (
            <li key={p.slug} className={styles.row}>
              <button
                type="button"
                className={styles.rowRemove}
                aria-label={`Remove ${p.name} from wishlist`}
                onClick={() => remove(p.slug)}
              >
                <Icon name="x" size={14} />
              </button>
              <Link
                href={`/product/${p.slug}`}
                className={styles.thumb}
                onClick={onClose}
                aria-label={p.name}
              >
                {p.image ? <Image src={p.image} alt="" fill sizes="90px" /> : null}
              </Link>
              <div className={styles.rowInfo}>
                <p className={styles.rowName}>{p.name}</p>
                <p className={styles.rowPrice}>
                  {p.compareAtCents && p.compareAtCents > p.priceCents ? (
                    <s>{formatMoney(p.compareAtCents)}</s>
                  ) : null}
                  <span>{formatMoney(p.priceCents)}</span>
                </p>
                <p className={styles.stock} data-out={!p.inStock || undefined}>
                  {p.inStock ? "In Stock" : "Out of stock"}
                </p>
              </div>
              <button
                type="button"
                className={styles.rowAdd}
                disabled={!p.inStock}
                onClick={() => {
                  onClose();
                  void add({ slug: p.slug, name: p.name });
                }}
              >
                <span>Add to cart</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className={styles.foot}>
        <Link href="/wishlist" className={styles.outline} onClick={onClose} data-autofocus>
          <span>View wishlist page</span>
          <Icon name="arrow-up-right" size={18} />
        </Link>
        <button type="button" className={styles.primary} onClick={onClose}>
          <span>Continue shopping</span>
          <Icon name="arrow-up-right" size={18} />
        </button>
      </footer>
    </Modal>
  );
}
