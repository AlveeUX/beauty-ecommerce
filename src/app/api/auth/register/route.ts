import { z } from "zod";
import { getDb } from "@/db/client";
import { registerSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/checkout";
import { AUTH_ERROR_STATUS, registerUser } from "@/server/auth/service";
import { completeSignIn } from "@/server/auth/signin";
import { crossSiteBlock, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

const body = registerSchema.extend({ wishlist: z.array(z.string()).max(100).optional() });

/** Create an account and sign the new customer in (USR-002). */
export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const result = registerUser(getDb(), parsed.data);
  if (!result.ok) {
    const { code, message, fields } = result.error;
    return Response.json(
      { code, message, errors: Object.fromEntries((fields ?? []).map((f) => [f, message])) },
      { status: AUTH_ERROR_STATUS[code] },
    );
  }
  const { wishlist } = await completeSignIn(result.value, {
    remember: false,
    browserWishlist: parsed.data.wishlist ?? [],
  }).catch((error: unknown) => {
    console.error("Sign-in after registration failed:", error);
    return { wishlist: [] as string[] };
  });
  return Response.json({ user: result.value, wishlist }, { status: 201 });
}
