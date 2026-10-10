"use client";

import type { ApiError } from "@/lib/contract";

export class RequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: unknown;
  constructor(status: number, body: ApiError) {
    super(body.message || "Request failed");
    this.status = status;
    this.code = body.code;
    this.detail = body.detail;
  }
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new RequestError(res.status, data as ApiError);
  return data as T;
}
