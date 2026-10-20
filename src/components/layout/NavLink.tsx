"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  className?: string;
  /** Extra class when this link points at the current page. */
  activeClassName?: string;
  /** When false the link is never highlighted (links that duplicate another entry's page). */
  match?: boolean;
  children: ReactNode;
  onClick?: () => void;
};

/** Link that marks itself as the current page (aria-current) when the page and its layout variant match. */
export function NavLink({
  href,
  className,
  activeClassName,
  match = true,
  children,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [target, query = ""] = href.split("?");
  const linkParams = new URLSearchParams(query);
  // Layout variants share one path, so the page's `layout` and `sticky` parameters must agree with the link's
  // (a link without them is the default variant). Filters and paging are ignored.
  const sameVariant = ["layout", "sticky"].every(
    (key) => (linkParams.get(key) ?? null) === (search.get(key) ?? null),
  );
  const current = match && pathname === target && sameVariant;
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
