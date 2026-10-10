import { NextResponse } from "next/server";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { listPredictions } from "@/lib/services/audit";

export async function GET(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) return jsonError("MISSING_FIELDS", "customerId is required.", 400);
  const rows = await listPredictions(user, customerId);
  if (rows === null) return jsonError("NOT_FOUND", "Profile not found.", 404);
  return NextResponse.json({ predictions: rows });
}
