"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";
import type { ListProduct } from "@/server/catalog/lookup";
import styles from "./ShareModal.module.css";

/** "Share this product" popup (Figma 3:14693, 543 x 474): product, four platforms and the page address. */
export function ShareModal({
  slug,
  name,
  onClose,
}: {
  slug: string;
  name: string;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<ListProduct | null>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  // the address of the product page itself, without layout or filter parameters
  const url = `${window.location.origin}/product/${slug}`;

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/products/lookup?slugs=${encodeURIComponent(slug)}`)
      .then((r) => r.json() as Promise<{ items: ListProduct[] }>)
      .then((body) => !cancelled && setProduct(body.items[0] ?? null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function copy(message: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setStatus(message);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus("Press Ctrl+C to copy the address.");
    }
  }

  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(product?.name ?? name);
  const media = encodeURIComponent(
    product?.image ? `${window.location.origin}${product.image}` : "",
  );
  const onSale = product?.compareAtCents && product.compareAtCents > product.priceCents;

  return (
    <Modal titleId="share-title" width={543} onClose={onClose} testId="share-modal">
      <div className={styles.box}>
        <header className={styles.head}>
          <h2 id="share-title">Share this product</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className={styles.product}>
          <div className={styles.thumb}>
            {product?.image ? <Image src={product.image} alt="" fill sizes="88px" /> : null}
          </div>
          <div>
            <p className={styles.name}>{product?.name ?? name}</p>
            {product ? (
              <p className={styles.label}>{product.label.replace(/(\d)(ml|g)$/i, "$1 $2")}</p>
            ) : null}
            {product ? (
              <p className={styles.price}>
                {onSale ? <s>{formatMoney(product.compareAtCents ?? 0)}</s> : null}
                <span>{formatMoney(product.priceCents)}</span>
              </p>
            ) : null}
          </div>
        </div>

        <ul className={styles.platforms}>
          <li>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-facebook"
              data-autofocus
            >
              <span className={styles.circle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/share/facebook.svg" alt="" width={20} height={20} />
              </span>
              <span className={styles.platform}>Facebook</span>
            </a>
          </li>
          <li>
            <a
              href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-x"
            >
              <span className={styles.circle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/share/x.svg" alt="" width={18} height={18} />
              </span>
              <span className={styles.platform}>X</span>
            </a>
          </li>
          <li>
            <button
              type="button"
              data-testid="share-instagram"
              onClick={() => void copy("Link copied. Paste it into Instagram.")}
            >
              <span className={styles.circle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/share/instagram.svg" alt="" width={18} height={18} />
              </span>
              <span className={styles.platform}>Instagram</span>
            </button>
          </li>
          <li>
            <a
              href={`https://pinterest.com/pin/create/button/?url=${encoded}&media=${media}&description=${text}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-pinterest"
            >
              <span className={styles.circle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/share/pinterest.svg" alt="" width={16} height={20} />
              </span>
              <span className={styles.platform}>Pinterest</span>
            </a>
          </li>
        </ul>

        <div className={styles.link}>
          <input
            type="text"
            readOnly
            value={url}
            aria-label="Product address"
            data-testid="share-url"
          />
          <button type="button" onClick={() => void copy("Link copied.")} data-testid="share-copy">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className={styles.note}>Sharing sends this product page to your selected platform.</p>
        <p className="visually-hidden" role="status">
          {status}
        </p>
      </div>
    </Modal>
  );
}
