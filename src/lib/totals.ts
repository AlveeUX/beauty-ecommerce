import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_RATE_CENTS } from "@/config/store";

/** Shipping for a basket: free at or above the threshold, otherwise the flat rate (OQ-04 default). */
export function shippingFor(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_RATE_CENTS;
}

/** BR-03: total = subtotal - discount + shipping + tax, all in integer cents (no tax in MVP). */
export function totalsFor(subtotalCents: number, discountCents = 0) {
  const shippingCents = shippingFor(subtotalCents - discountCents);
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;
  return { subtotalCents, discountCents, shippingCents, totalCents };
}
