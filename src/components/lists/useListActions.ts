"use client";

import { COMPARE_LIMIT } from "@/config/store";
import { useList } from "@/lib/lists";
import { notify } from "@/lib/notify";
import { useListsUi } from "./ListsUi";

/** Heart behaviour: add opens the wishlist popup, a second click removes it (WSH-001). */
export function useWishlistAction(slug: string, name: string) {
  const list = useList("wishlist");
  const ui = useListsUi();
  const active = list.has(slug);
  return {
    active,
    toggle: () => {
      if (active) {
        list.remove(slug);
        notify(`${name} removed from your wishlist.`);
      } else {
        list.add(slug);
        ui.showWishlist();
      }
    },
  };
}

/** Compare behaviour: add (up to the limit); a repeat click shows the "Already added" popup. */
export function useCompareAction(slug: string, name: string) {
  const list = useList("compare");
  const ui = useListsUi();
  return {
    active: list.has(slug),
    add: () => {
      const result = list.add(slug);
      if (result === "exists") ui.showCompareExists(name);
      else if (result === "limit") {
        notify(`You can compare up to ${COMPARE_LIMIT} products. Remove one first.`, "error");
      } else notify(`${name} added to compare.`);
    },
  };
}
