"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

/** Header user icon: "My account" when signed in, the login page otherwise. */
export function AccountLink() {
  const { user } = useAuth();
  return (
    <Link
      href={user ? "/account" : "/login"}
      aria-label={user ? `My account (${user.username})` : "Log in or register"}
      data-testid="account-link"
    >
      <Icon name="user" size={18} />
    </Link>
  );
}
