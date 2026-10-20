import { cookies } from "next/headers";
import { isCartToken, newCartToken } from "./service";

const COOKIE = "cart_token";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Token of the visitor's guest cart, or null when they have not added anything yet. */
export async function readCartToken(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return isCartToken(value) ? value : null;
}

/** Existing token, or a new one stored in an httpOnly cookie (never readable by scripts). */
export async function ensureCartToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (isCartToken(existing)) return existing;
  const token = newCartToken();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return token;
}

/** Point the browser at a different cart (the account cart after login). */
export async function setCartToken(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

/** Forget the cart cookie (logout: the shared computer must not keep showing the account cart). */
export async function clearCartToken(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
