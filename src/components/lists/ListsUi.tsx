"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CompareExistsModal } from "./CompareExistsModal";
import { WishlistModal } from "./WishlistModal";

type Modal = { kind: "wishlist" } | { kind: "compare-exists"; name: string } | null;

type ListsUi = {
  showWishlist: () => void;
  showCompareExists: (name: string) => void;
};

const Ctx = createContext<ListsUi | null>(null);

export function useListsUi(): ListsUi {
  const value = useContext(Ctx);
  if (!value) throw new Error("useListsUi must be used inside <ListsUiProvider>");
  return value;
}

/** Hosts the wishlist popup (after adding a heart) and the "Already added" compare popup. */
export function ListsUiProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<Modal>(null);
  const close = useCallback(() => setModal(null), []);
  const value = useMemo<ListsUi>(
    () => ({
      showWishlist: () => setModal({ kind: "wishlist" }),
      showCompareExists: (name) => setModal({ kind: "compare-exists", name }),
    }),
    [],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {modal?.kind === "wishlist" ? <WishlistModal onClose={close} /> : null}
      {modal?.kind === "compare-exists" ? (
        <CompareExistsModal name={modal.name} onClose={close} />
      ) : null}
    </Ctx.Provider>
  );
}
