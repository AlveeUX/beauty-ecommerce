import { formatMoney } from "./money";

/** Human label for a price range as the Shop chips show it: "Under $50", "$20 - $50", "$100+". */
export function priceRangeLabel(minCents: number | null, maxCents: number | null): string {
  const dollars = (c: number) => formatMoney(c, "compact");
  if (maxCents !== null && (minCents === null || minCents === 0))
    return `Under ${dollars(maxCents)}`;
  if (minCents !== null && maxCents === null) return `${dollars(minCents)}+`;
  return `${dollars(minCents ?? 0)} - ${dollars(maxCents ?? 0)}`;
}
