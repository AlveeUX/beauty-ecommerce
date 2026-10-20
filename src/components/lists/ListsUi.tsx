"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CompareExistsModal } from "./CompareExistsModal";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { WishlistModal } from "./WishlistModal";

type Modal =
  | { kind: "wishlist" }
  | { kind: "compare-exists"; name: string }
  | { kind: "quick-view"; slug: string }
  | null;

type ListsUi = {
  showWishlist: () => void;
  showCompareExists: (name: string) => void;
  showQuickView: (slug: string) => void;
};

const Ctx = createContext<ListsUi | null>(null);

export function useListsUi(): ListsUi {
  const value = useContext(Ctx);
  if (!value) throw new Error("useListsUi must be used inside <ListsUiProvider>");
  return value;
}

/** Hosts the wishlist popup (after adding a heart), the "Already added" compare popup and the quick view. */
export function ListsUiProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<Modal>(null);
  const close = useCallback(() => setModal(null), []);
  const value = useMemo<ListsUi>(
    () => ({
      showWishlist: () => setModal({ kind: "wishlist" }),
      showCompareExists: (name) => setModal({ kind: "compare-exists", name }),
      showQuickView: (slug) => setModal({ kind: "quick-view", slug }),
    }),
    [],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {modal?.kind === "wishlist" ? <WishlistModal onClose={close} /> : null}
      {modal?.kind === "quick-view" ? <QuickViewModal slug={modal.slug} onClose={close} /> : null}
      {modal?.kind === "compare-exists" ? (
        <CompareExistsModal name={modal.name} onClose={close} />
      ) : null}
    </Ctx.Provider>
  );
}
