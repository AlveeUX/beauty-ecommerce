import { getDb } from "@/db/client";
import { addressSchema, fieldErrors } from "@/lib/validation/checkout";
import { addAddress, listAddresses } from "@/server/account/addresses";
import { requireUser } from "@/server/auth/guard";
import { crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  return Response.json({ addresses: listAddresses(getDb(), gate.user.id) });
}

export async function POST(request: Request) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const result = addAddress(getDb(), gate.user.id, parsed.data);
  if (!result.ok) return jsonError(409, "limit_reached", result.message);
  return Response.json({ address: result.address }, { status: 201 });
}
