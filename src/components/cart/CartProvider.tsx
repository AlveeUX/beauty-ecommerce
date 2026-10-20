"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { notify } from "@/lib/notify";
import type { CartView } from "@/server/cart/service";

type Api = { cart?: CartView; code?: string; message?: string };

type CartContextValue = {
  cart: CartView;
  /** True while a request is in flight (buttons show a busy state). */
  busy: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Add one or more units of a product's default variant (or a specific variant). */
  add: (
    target: { slug?: string; variantId?: number; name?: string },
    quantity?: number,
    options?: { openDrawer?: boolean },
  ) => Promise<boolean>;
  /** Add several products and open the drawer once (the Home bundle). */
  addMany: (slugs: string[]) => Promise<boolean>;
  setQuantity: (variantId: number, quantity: number) => Promise<boolean>;
  remove: (variantId: number) => Promise<void>;
  clear: () => Promise<void>;
  /** Re-read the cart from the server (after login merges it, or checkout empties it). */
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>");
  return value;
}

/**
 * Cart state for the whole storefront. The server is the source of truth (stock and prices are
 * checked there, CRT-005); this keeps the last response, opens the drawer on add (CRT-001) and
 * reports rejections such as "Only 3 left in stock" as toasts.
 */
export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartView;
  children: ReactNode;
}) {
  const [cart, setCart] = useState(initialCart);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const inflight = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (response.ok) {
        const body = (await response.json()) as Api;
        if (body.cart) setCart(body.cart);
      }
    } catch {
      // offline: keep what we have
    }
  }, []);

  const request = useCallback(
    async (input: string, init?: RequestInit): Promise<boolean> => {
      inflight.current += 1;
      setBusy(true);
      try {
        const response = await fetch(input, {
          ...init,
          headers: { "content-type": "application/json" },
        });
        const body = (await response.json().catch(() => ({}))) as Api;
        if (!response.ok) {
          notify(body.message ?? "Something went wrong. Please try again.", "error");
          // stock changed under us: show the truth
          if (response.status === 409) void refresh();
          return false;
        }
        if (body.cart) setCart(body.cart);
        return true;
      } catch {
        notify("Could not reach the shop. Check your connection and try again.", "error");
        return false;
      } finally {
        inflight.current -= 1;
        if (inflight.current === 0) setBusy(false);
      }
    },
    [refresh],
  );

  // Back/forward cache and other tabs: re-read the cart when the page becomes visible again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const add = useCallback<CartContextValue["add"]>(
    async (target, quantity = 1, options) => {
      const ok = await request("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ slug: target.slug, variantId: target.variantId, quantity }),
      });
      if (ok && options?.openDrawer !== false) setDrawerOpen(true);
      return ok;
    },
    [request],
  );

  const addMany = useCallback<CartContextValue["addMany"]>(
    async (slugs) => {
      let allOk = true;
      for (const slug of slugs) {
        // one request per product keeps each stock check independent
        allOk = (await add({ slug }, 1, { openDrawer: false })) && allOk;
      }
      setDrawerOpen(true);
      return allOk;
    },
    [add],
  );

  const setQuantity = useCallback<CartContextValue["setQuantity"]>(
    (variantId, quantity) =>
      request(`/api/cart/items/${variantId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }),
    [request],
  );

  const remove = useCallback<CartContextValue["remove"]>(
    async (variantId) => {
      await request(`/api/cart/items/${variantId}`, { method: "DELETE" });
    },
    [request],
  );

  const clear = useCallback(async () => {
    await request("/api/cart", { method: "DELETE" });
  }, [request]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      busy,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add,
      addMany,
      setQuantity,
      remove,
      clear,
      refresh,
    }),
    [cart, busy, drawerOpen, add, addMany, setQuantity, remove, clear, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
