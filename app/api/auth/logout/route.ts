import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { checkOrigin, jsonError } from "@/lib/auth/guard";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
