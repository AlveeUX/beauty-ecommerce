/** Money is stored as integer cents everywhere (see docs/context.md section 12). */
export type Cents = number;

const USD = (fractionDigits: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

/**
 * Format cents as US dollars.
 * "compact" (default) drops ".00" for whole amounts, as the design's product
 * cards do ($96); "full" always shows cents ($96.00) as product details,
 * cart and checkout do.
 */
export function formatMoney(cents: Cents, style: "compact" | "full" = "compact"): string {
  if (!Number.isInteger(cents)) throw new Error(`Money must be integer cents, got ${cents}`);
  const whole = cents % 100 === 0;
  return USD(style === "compact" && whole ? 0 : 2).format(cents / 100);
}
