/** Consistent JSON error shape for every API route: { code, message, fields? } (PRD section 11.2). */
export type ApiError = { code: string; message: string; fields?: string[] };

export function jsonError(
  status: number,
  code: string,
  message: string,
  fields?: string[],
): Response {
  return Response.json(
    { code, message, ...(fields?.length ? { fields } : {}) } satisfies ApiError,
    { status },
  );
}

/**
 * Reject cross-site writes (SEC-004). Browsers always send `Origin` on cross-origin POSTs; if it is
 * present it must match this server's host. Combined with SameSite=Lax cookies this is the CSRF defence.
 */
export function crossSiteBlock(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // fall through to the rejection below
  }
  return jsonError(403, "forbidden", "Cross-site requests are not allowed.");
}

/** Best-effort client address for rate limiting; falls back to one shared bucket on localhost. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded && /^[0-9a-fA-F:.]{3,45}$/.test(forwarded) ? forwarded : "local";
}

/** Origin used to build absolute links in local emails. */
export function requestOrigin(request: Request): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** 422 with one message per field, the shape every form in the app reads. */
export function validationError(
  errors: Record<string, string>,
  message = "Please check the highlighted fields.",
): Response {
  return Response.json({ code: "validation_error", message, errors }, { status: 422 });
}
