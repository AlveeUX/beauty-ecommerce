"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { sendJson } from "@/lib/api";
import { replaceList } from "@/lib/lists";
import { useAuth } from "./AuthProvider";
import styles from "./Account.module.css";

const LINKS = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
] as const;

/** Account sub-navigation (proposed design, USR-004) with logout (USR-005). */
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setUser } = useAuth();
  const cart = useCart();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await sendJson("/api/auth/logout", "POST");
    setUser(null);
    // the next person on a shared computer must not inherit this account's wishlist or cart
    replaceList("wishlist", []);
    await cart.refresh();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className={styles.nav} aria-label="Account">
      <ul>
        {LINKS.map((link) => {
          const active =
            link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link href={link.href} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={logout} disabled={busy} data-testid="logout">
            Log out
          </button>
        </li>
      </ul>
    </nav>
  );
}
