/** Plain constants shared by the schema, validation and UI (no database imports, safe for the browser). */
export const USER_ROLES = ["customer", "admin"] as const;
export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
] as const;
export const PAYMENT_METHODS = ["bank_transfer", "cod", "check", "card_test"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
