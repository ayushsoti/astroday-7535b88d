import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, toPublicUser } from "@/lib/auth/session";
import { checkOrigin, jsonError } from "@/lib/auth/guard";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const row = rows[0];
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return jsonError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  }
  await setSessionCookie(row.id);
  return NextResponse.json({ user: toPublicUser(row) });
}
