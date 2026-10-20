/** Shape of every error body the API returns (see src/server/http.ts). */
export type ApiFailure = {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
  items?: string[];
};

export type ApiResult<T> =
  { ok: true; status: number; data: T } | { ok: false; status: number; data: ApiFailure };

/** JSON request that never throws: network failures come back as `ok: false` with status 0. */
export async function sendJson<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { ok: true, status: response.status, data: data as T }
      : { ok: false, status: response.status, data: data as ApiFailure };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {
        code: "network",
        message: "We could not reach the server. Check your connection and try again.",
      },
    };
  }
}
