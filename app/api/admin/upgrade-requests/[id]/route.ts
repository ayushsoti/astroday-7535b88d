import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireAdmin } from "@/lib/auth/guard";
import { updateUpgradeRequest } from "@/lib/services/admin";
import type { UpgradeStatus } from "@/lib/contract";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const { id } = await params;
  let body: { status?: UpgradeStatus };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  if (!body.status || !["pending", "approved", "declined"].includes(body.status)) {
    return jsonError("INVALID_STATUS", "Unknown status.", 400);
  }
  const updated = await updateUpgradeRequest(id, body.status);
  if (!updated) return jsonError("NOT_FOUND", "Request not found.", 404);
  return NextResponse.json({ request: updated });
}
