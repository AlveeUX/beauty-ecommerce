import { cookies } from "next/headers";
import { isOrderNumber } from "./service";

const COOKIE = "last_order";

/** Remember the order just placed so this browser (and only it) can open the confirmation page. */
export async function rememberOrder(number: string): Promise<void> {
  (await cookies()).set(COOKIE, number, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function lastOrderNumber(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return isOrderNumber(value) ? value : null;
}
