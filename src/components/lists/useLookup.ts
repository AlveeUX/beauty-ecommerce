"use client";

import { useEffect, useState } from "react";
import type { ListProduct } from "@/server/catalog/lookup";

type State = { status: "loading" | "ready" | "error"; items: ListProduct[] };

/** Product details for a list of slugs (wishlist and compare pages), refetched when the slugs change. */
export function useLookup(slugs: readonly string[]): State {
  const key = slugs.join(",");
  const [state, setState] = useState<State & { forKey: string }>({
    status: "loading",
    items: [],
    forKey: "",
  });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetch(`/api/products/lookup?slugs=${encodeURIComponent(key)}`)
      .then((r) => {
        if (!r.ok) throw new Error("lookup failed");
        return r.json() as Promise<{ items: ListProduct[] }>;
      })
      .then((body) => {
        if (!cancelled) setState({ status: "ready", items: body.items, forKey: key });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", items: [], forKey: key });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) return { status: "ready", items: [] };
  // keep showing the previous rows while a changed list reloads; hide rows already removed
  const items = state.items.filter((p) => slugs.includes(p.slug));
  return { status: state.forKey === "" ? "loading" : state.status, items };
}
