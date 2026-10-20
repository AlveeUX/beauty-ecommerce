"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  className?: string;
  /** Extra class when this link points at the current page. */
  activeClassName?: string;
  /** When false the link is never highlighted (duplicate targets such as unbuilt layout variants). */
  match?: boolean;
  children: ReactNode;
  onClick?: () => void;
};

/** Link that marks itself as the current page (aria-current) when the path equals its target. */
export function NavLink({
  href,
  className,
  activeClassName,
  match = true,
  children,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const target = href.split("?")[0];
  const current = match && !href.includes("?") && pathname === target;
  const classes = [className, current ? activeClassName : null].filter(Boolean).join(" ");
  return (
    <Link
      href={href}
      className={classes || undefined}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
