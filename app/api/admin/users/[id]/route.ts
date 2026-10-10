import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireAdmin } from "@/lib/auth/guard";
import { updateUser } from "@/lib/services/admin";
import type { Plan, Role } from "@/lib/contract";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const { id } = await params;
  let body: { role?: Role; plan?: Plan };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  if (body.role && body.role !== "admin" && body.role !== "user") return jsonError("INVALID_ROLE", "Unknown role.", 400);
  if (body.plan && body.plan !== "free" && body.plan !== "paid") return jsonError("INVALID_PLAN", "Unknown plan.", 400);
  const updated = await updateUser(id, { role: body.role, plan: body.plan });
  if (!updated) return jsonError("NOT_FOUND", "User not found.", 404);
  return NextResponse.json({ user: updated });
}
