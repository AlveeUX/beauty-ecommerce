import type { ORDER_STATUSES } from "@/config/order-constants";

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Order lifecycle (PRD ORD-001, BR-06). `failed` is only reached when a payment is declined at
 * checkout. Terminal states have no exits.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "cancelled", "failed"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
  failed: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  TRANSITIONS[from].includes(to);

/** Statuses after which reserved stock goes back on the shelf. */
export const RELEASES_STOCK: readonly OrderStatus[] = ["cancelled", "failed"];

/** Timeline shown to the shopper (TRK-002). */
export const TRACKING_STEPS = ["pending", "processing", "shipped", "delivered"] as const;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Payment failed",
};
