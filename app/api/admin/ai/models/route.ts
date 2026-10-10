import { NextResponse } from "next/server";
import { isResponse, jsonError, requireAdmin } from "@/lib/auth/guard";
import { listAiModels } from "@/lib/services/ai-settings";

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ models: await listAiModels() });
  } catch {
    return jsonError("MODELS_FAILED", "Could not reach the model provider.", 502);
  }
}
