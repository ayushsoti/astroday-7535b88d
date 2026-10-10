"use client";

import type { ApiError } from "@/lib/contract";

export class RequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: unknown;
  constructor(status: number, body: ApiError) {
    super(body.message || "Request failed");
    this.name = "RequestError";
    this.status = status;
    this.code = body.code;
    this.detail = body.detail;
  }
}

/**
 * Fetch JSON and surface every failure as a typed RequestError.
 *
 * A route handler can occasionally return a non-JSON body (an HTML error page
 * from an uncaught server fault, a proxy error, a network drop). Previously
 * that threw a raw SyntaxError, which callers rendered as a generic
 * "Something went wrong" with no way to tell what actually failed. Now any
 * non-JSON or unreachable response becomes a RequestError with a real status
 * and message, so the UI can explain it and the user can act on it.
 */
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new RequestError(0, {
      code: "NETWORK",
      message: "Could not reach the server. Check your connection and try again.",
    });
  }

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new RequestError(res.status, {
        code: "BAD_RESPONSE",
        message: res.ok
          ? "The server returned an unexpected response. Please try again."
          : `The server returned an error (status ${res.status}). Please try again.`,
      });
    }
  }

  if (!res.ok) {
    const body = data as Partial<ApiError>;
    throw new RequestError(res.status, {
      code: typeof body?.code === "string" ? body.code : "ERROR",
      message:
        typeof body?.message === "string" && body.message
          ? body.message
          : `Request failed (status ${res.status}).`,
      detail: body?.detail,
    });
  }

  return data as T;
}
