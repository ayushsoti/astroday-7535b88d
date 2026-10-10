import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie, toPublicUser } from "@/lib/auth/session";
import { checkOrigin, jsonError } from "@/lib/auth/guard";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  let body: { email?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("INVALID_EMAIL", "Enter a valid email address.", 400);
  if (name.length < 2) return jsonError("INVALID_NAME", "Enter your name.", 400);
  if (password.length < 8) return jsonError("WEAK_PASSWORD", "Password must be at least 8 characters.", 400);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return jsonError("EMAIL_TAKEN", "An account with this email already exists.", 409);

  const id = randomUUID();
  await db.insert(users).values({
    id,
    email,
    name,
    passwordHash: hashPassword(password),
    role: "user",
    plan: "free",
  });
  await setSessionCookie(id);
  const row = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  return NextResponse.json({ user: toPublicUser(row) }, { status: 201 });
}
