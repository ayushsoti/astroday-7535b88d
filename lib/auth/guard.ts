import { NextResponse } from "next/server";
import type { PublicUser } from "../contract";
import { getCurrentUser } from "./session";

export function jsonError(code: string, message: string, status: number, detail?: unknown): NextResponse {
  return NextResponse.json({ code, message, detail }, { status });
}

/** Same-origin guard for cookie-authenticated state-changing requests. */
export function checkOrigin(req: Request): boolean {
  if (process.env.APP_BASE_URL) return true;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const previewOrigin = req.headers.get("x-felix-preview-origin");
  if (previewOrigin && origin === previewOrigin) return true;
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    return !!host && o.host === host;
  } catch {
    return false;
  }
}

export async function requireUser(): Promise<PublicUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in to continue.", 401);
  return user;
}

export async function requireAdmin(): Promise<PublicUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in to continue.", 401);
  if (user.role !== "admin") return jsonError("FORBIDDEN", "Admin access required.", 403);
  return user;
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
