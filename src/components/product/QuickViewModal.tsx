"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Rating } from "@/components/ui/Rating";
import type { ProductBadge } from "@/lib/catalog-types";
import { formatMoney } from "@/lib/money";
import type { QuickViewData } from "@/server/catalog/quick-view";
import info from "./ProductInfo.module.css";
import styles from "./QuickViewModal.module.css";

const BADGE_TEXT: Record<ProductBadge, string> = {
  "best-seller": "Best seller",
  new: "New",
  trending: "Trending",
  hot: "Hot",
};

/**
 * Quick view popup (Figma 3:1366, 1100 x 641): image with arrows on the left, the product's summary and
 * purchase controls on the right. The text styles are the product page's (same frame, 490 wide).
 */
export function QuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<QuickViewData | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const { add, busy } = useCart();

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/products/quick?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ item: QuickViewData }>) : Promise.reject()))
      .then((body) => !cancelled && setData(body.item))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const images = data?.images ?? [];
  const step = (by: number) => setIndex((i) => (i + by + images.length) % images.length);
  const maxQty = Math.max(1, data?.available ?? 1);
  const onSale = Boolean(data?.compareAtCents && data.compareAtCents > data.priceCents);
  const canBuy = Boolean(data?.inStock) && !busy;

  return (
    <Modal titleId="quick-view-title" width={1100} onClose={onClose} testId="quick-view">
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <Icon name="x" size={20} />
      </button>

      {failed ? (
        <div className={styles.message} role="alert">
          <h2 id="quick-view-title">This product is not available</h2>
          <Link href="/shop" onClick={onClose} data-autofocus>
            Back to the shop
          </Link>
        </div>
      ) : !data ? (
        <div className={styles.message} role="status">
          <h2 id="quick-view-title" className="visually-hidden">
            Quick view
          </h2>
          Loading…
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.media}>
            {images[index] ? (
              <Image
                src={images[index].url}
                alt={images[index].alt || data.name}
                fill
                sizes="550px"
                priority
              />
            ) : null}
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  className={`${styles.arrow} ${styles.prev}`}
                  aria-label="Previous image"
                  onClick={() => step(-1)}
                  data-testid="qv-prev"
                >
                  <Icon name="arrow-left" size={18} />
                </button>
                <button
                  type="button"
                  className={`${styles.arrow} ${styles.next}`}
                  aria-label="Next image"
                  onClick={() => step(1)}
                  data-testid="qv-next"
                >
                  <Icon name="arrow-right" size={18} />
                </button>
              </>
            ) : null}
          </div>

          <div className={styles.body}>
            <div className={`${info.status} ${styles.status}`}>
              {data.badge ? <span className={info.badge}>{BADGE_TEXT[data.badge]}</span> : null}
              <span className={info.stock} data-testid="qv-stock">
                {data.inStock ? "In Stock" : "Out of stock"}
              </span>
            </div>

            <h2 id="quick-view-title" className={`${info.title} ${styles.title}`}>
              {data.name}
            </h2>
            {data.shortDescription ? (
              <p className={`${info.description} ${styles.description}`}>{data.shortDescription}</p>
            ) : null}

            <div className={`${info.ratingRow} ${styles.rating}`}>
              <Rating value={data.rating} />
              <span>{data.rating.toFixed(1)}</span>
              <span>[{data.reviewCount} Review]</span>
              <span className={info.verified}>
                <Icon name="check-circle" size={12} />
                Verified
              </span>
            </div>

            <p className={`${info.price} ${styles.price}`} data-testid="qv-price">
              <span className={info.amount}>{formatMoney(data.priceCents, "full")}</span>
              {onSale ? (
                <s className={info.compare}>{formatMoney(data.compareAtCents ?? 0, "full")}</s>
              ) : null}
              <span className={info.unit}>/ {data.sizeLabel}</span>
            </p>

            <div className={styles.buy}>
              <div className={info.qty} data-testid="qv-quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Icon name="minus" size={20} />
                </button>
                <output aria-live="polite">{String(qty).padStart(2, "0")}</output>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                >
                  <Icon name="plus" size={20} />
                </button>
              </div>
              <button
                type="button"
                className={info.add}
                disabled={!canBuy}
                data-testid="qv-add"
                onClick={() => {
                  onClose();
                  void add({ variantId: data.variantId, name: data.name }, qty);
                }}
              >
                Add to cart
                <Icon name="shopping-bag" size={15} />
              </button>
              <button
                type="button"
                className={`${info.buyNow} ${styles.buyNow}`}
                disabled={!canBuy}
                data-testid="qv-buy-now"
                onClick={async () => {
                  if (
                    await add({ variantId: data.variantId, name: data.name }, qty, {
                      openDrawer: false,
                    })
                  ) {
                    onClose();
                    router.push("/checkout");
                  }
                }}
              >
                Buy now
                <Icon name="arrow-up-right" size={18} />
              </button>
            </div>

            <Link
              href={`/product/${data.slug}`}
              className={styles.more}
              onClick={onClose}
              data-testid="qv-details"
            >
              <span>View more details</span>
              <Icon name="arrow-up-right" size={18} />
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
