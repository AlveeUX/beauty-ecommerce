import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { destroySession, getSessionUser, type AuthUser } from "./service";

const COOKIE = "session";

async function readToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Signed-in user of this request, or null. Reads the database so a logged-out session stops working. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await readToken();
  if (!token) return null;
  try {
    return getSessionUser(getDb(), token);
  } catch (error) {
    console.error("Session lookup failed:", error);
    return null;
  }
}

/** Store the session token in an httpOnly, SameSite=Lax cookie (never readable by page scripts). */
export async function setSessionCookie(token: string, maxAgeSeconds: number): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  destroySession(getDb(), jar.get(COOKIE)?.value ?? null);
  jar.delete(COOKIE);
}
