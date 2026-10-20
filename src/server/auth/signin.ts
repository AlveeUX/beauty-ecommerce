import { getDb } from "@/db/client";
import { mergeGuestCart, mergeWishlist } from "@/server/cart/account";
import { readCartToken, setCartToken } from "@/server/cart/session";
import { createSession, type AuthUser } from "./service";
import { setSessionCookie } from "./session";

/**
 * Everything that happens when someone becomes signed in (login or registration): start the session,
 * move the guest cart into the account cart (OQ-20) and merge the browser wishlist into the account
 * wishlist (WSH-003). Returns the merged wishlist so the browser can replace its local copy.
 */
export async function completeSignIn(
  user: AuthUser,
  options: { remember: boolean; browserWishlist: string[] },
): Promise<{ wishlist: string[] }> {
  const db = getDb();
  const session = createSession(db, user.id, options.remember);
  await setSessionCookie(session.token, session.maxAgeSeconds);
  const cartToken = mergeGuestCart(db, await readCartToken(), user.id);
  await setCartToken(cartToken);
  return { wishlist: mergeWishlist(db, user.id, options.browserWishlist) };
}
