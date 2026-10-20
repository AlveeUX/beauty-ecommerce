"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { sendJson } from "@/lib/api";
import { replaceList, setWishlistSync } from "@/lib/lists";

export type SessionUser = {
  id: number;
  email: string;
  username: string;
  role: "customer" | "admin";
};

type AuthState = {
  user: SessionUser | null;
  /** Called by the login, register and logout flows after the server has changed the session. */
  setUser: (user: SessionUser | null) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** Who is signed in. The server reads the session cookie and passes the user in, so the first paint is right. */
export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  const value = useMemo(() => ({ user, setUser }), [user]);

  // keep the account wishlist in step with the heart buttons while someone is signed in (WSH-003)
  useEffect(() => {
    if (!user) {
      setWishlistSync(null);
      return;
    }
    let cancelled = false;
    // adopt the account list first (another device may have changed it), then start pushing changes
    fetch("/api/account/wishlist")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { wishlist?: string[] } | null) => {
        if (!cancelled && data?.wishlist) replaceList("wishlist", data.wishlist);
      })
      .catch(() => undefined);
    setWishlistSync((slugs) => void sendJson("/api/account/wishlist", "PUT", { wishlist: slugs }));
    return () => {
      cancelled = true;
      setWishlistSync(null);
    };
  }, [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
