import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SHOP_LAYOUT_TRAITS, type ShopLayout } from "@/lib/shop-layouts";
import styles from "./ViewToggle.module.css";

/**
 * Grid / list switch at the left of the toolbar (Figma 3:38295, 81 x 44, active icon on a 30 x 30 tile).
 * It keeps the filters' place (sidebar, panel, bar) and only changes how the products are drawn.
 */
export function ViewToggle({
  layout,
  hrefFor,
}: {
  layout: ShopLayout;
  hrefFor: (layout: ShopLayout) => string;
}) {
  const traits = SHOP_LAYOUT_TRAITS[layout];
  const gridLayout = traits.view === "grid" ? layout : traits.swap;
  const listLayout = traits.view === "list" ? layout : traits.swap;
  return (
    <div className={styles.toggle} role="group" aria-label="Product view">
      <Link
        href={hrefFor(gridLayout)}
        aria-label="Grid view"
        aria-current={traits.view === "grid" ? "true" : undefined}
        scroll={false}
        data-testid="view-grid"
      >
        <Icon name="grid" size={16} />
      </Link>
      <Link
        href={hrefFor(listLayout)}
        aria-label="List view"
        aria-current={traits.view === "list" ? "true" : undefined}
        scroll={false}
        data-testid="view-list"
      >
        <Icon name="list" size={16} />
      </Link>
    </div>
  );
}
