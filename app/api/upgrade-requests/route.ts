import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { createUpgradeRequest } from "@/lib/services/admin";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const user = await requireUser();
  if (isResponse(user)) return user;
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  const created = await createUpgradeRequest(user.id, (body.message ?? "").slice(0, 500));
  return NextResponse.json({ request: created }, { status: 201 });
}
