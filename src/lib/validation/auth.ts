import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your user name or email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(200),
  remember: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use at most 30 characters.")
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, dashes and underscores only."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .max(200)
    .email("Enter a valid email address."),
  password: z.string().min(1, "Choose a password.").max(200),
});

export const forgotSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your user name or email address.").max(200),
});

export const resetSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "This reset link is invalid or has expired."),
  password: z.string().min(1, "Choose a password.").max(200),
});

export const trackSchema = z.object({
  orderId: z.string().trim().min(1, "Enter your order ID.").max(40),
  email: z
    .string()
    .trim()
    .min(1, "Enter your billing email.")
    .max(200)
    .email("Enter a valid email."),
});
