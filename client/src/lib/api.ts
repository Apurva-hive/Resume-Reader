const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiErrorBody = { error?: { code?: string; message?: string } };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Single place that talks to the backend. Every call goes through here so
 * error shape, base URL, and (later) auth headers live in one file.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error response; fall through to the status text
    }
    throw new ApiError(
      body.error?.message ?? res.statusText,
      res.status,
      body.error?.code
    );
  }

  return (await res.json()) as T;
}
