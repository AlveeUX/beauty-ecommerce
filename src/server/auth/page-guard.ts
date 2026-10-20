import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { AuthUser } from "./service";

/**
 * For account pages: the signed-in user, or a redirect to the login page. The account layout checks
 * too, but Next renders a layout and its page in parallel, so each page must not assume the layout ran first.
 */
export async function requireAccountUser(next = "/account"): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${next}`);
  return user;
}
