import { connection } from "next/server";
import type { ReactNode } from "react";
import { getDb } from "@/db/client";
import { Toaster } from "@/components/feedback/Toaster";
import { AuthProvider } from "@/components/account/AuthProvider";
import { getCurrentUser } from "@/server/auth/session";
import { getCart } from "@/server/cart/service";
import { readCartToken } from "@/server/cart/session";
import { ListsUiProvider } from "@/components/lists/ListsUi";
import { CartDrawer } from "./CartDrawer";
import { CartProvider } from "./CartProvider";

/** Cart state, the cart drawer and toasts for every storefront page. The cart is read per request. */
export async function StoreProviders({ children }: { children: ReactNode }) {
  // The cart cookie differs per visitor, so every page (including 404) renders per request.
  await connection();
  const token = await readCartToken();
  let initialCart = getCart(getDb(), null);
  try {
    initialCart = getCart(getDb(), token);
  } catch (error) {
    // database not migrated yet: start with an empty cart rather than failing every page
    console.error("Cart unavailable:", error);
  }
  const user = await getCurrentUser();
  return (
    <AuthProvider initialUser={user}>
      <CartProvider initialCart={initialCart}>
        <ListsUiProvider>
          {children}
          <CartDrawer />
          <Toaster />
        </ListsUiProvider>
      </CartProvider>
    </AuthProvider>
  );
}
