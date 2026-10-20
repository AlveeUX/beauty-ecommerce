import { jsonError } from "@/server/http";
import { getCurrentUser } from "./session";
import type { AuthUser } from "./service";

/** For API routes: the signed-in user, or a 401 response to return as-is (SEC-002). */
export async function requireUser(): Promise<{ user: AuthUser } | { response: Response }> {
  const user = await getCurrentUser();
  if (!user) return { response: jsonError(401, "unauthenticated", "Please sign in to continue.") };
  return { user };
}

/** For API routes that need a staff role. Returns 403 for a signed-in customer (SEC-002). */
export async function requireAdmin(): Promise<{ user: AuthUser } | { response: Response }> {
  const gate = await requireUser();
  if ("response" in gate) return gate;
  if (gate.user.role !== "admin") {
    return { response: jsonError(403, "forbidden", "You do not have permission to do that.") };
  }
  return gate;
}
