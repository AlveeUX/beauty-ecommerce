import { z } from "zod";
import { getDb } from "@/db/client";
import { addressSchema, fieldErrors } from "@/lib/validation/checkout";
import { deleteAddress, setDefaultAddress, updateAddress } from "@/server/account/addresses";
import { requireUser } from "@/server/auth/guard";
import { crossSiteBlock, jsonError, validationError } from "@/server/http";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function idOf({ params }: Params): Promise<number | null> {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: Request, ctx: Params) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const id = await idOf(ctx);
  if (id === null) return jsonError(404, "not_found", "Address not found.");
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(fieldErrors(parsed.error));
  const address = updateAddress(getDb(), gate.user.id, id, parsed.data);
  return address ? Response.json({ address }) : jsonError(404, "not_found", "Address not found.");
}

/** `{ "default": true }` makes this the address that checkout pre-fills. */
export async function PATCH(request: Request, ctx: Params) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const id = await idOf(ctx);
  const body = z
    .object({ default: z.literal(true) })
    .safeParse(await request.json().catch(() => null));
  if (id === null || !body.success) return jsonError(422, "validation_error", "Nothing to change.");
  return setDefaultAddress(getDb(), gate.user.id, id)
    ? Response.json({ ok: true })
    : jsonError(404, "not_found", "Address not found.");
}

export async function DELETE(request: Request, ctx: Params) {
  const blocked = crossSiteBlock(request);
  if (blocked) return blocked;
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const id = await idOf(ctx);
  if (id === null || !deleteAddress(getDb(), gate.user.id, id)) {
    return jsonError(404, "not_found", "Address not found.");
  }
  return Response.json({ ok: true });
}
