import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireAdmin } from "@/lib/auth/guard";
import { AiSettingsError, getAiSettings, updateAiSettings } from "@/lib/services/ai-settings";
import type { UpdateAiSettingsInput } from "@/lib/contract";

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ settings: await getAiSettings() });
  } catch {
    return jsonError("LOAD_FAILED", "Could not load the AI settings.", 500);
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  let body: UpdateAiSettingsInput;
  try {
    body = (await req.json()) as UpdateAiSettingsInput;
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  try {
    const settings = await updateAiSettings(body, admin.email);
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof AiSettingsError) return jsonError("INVALID_SETTINGS", err.message, 400);
    return jsonError("SAVE_FAILED", "Could not save the AI settings.", 500);
  }
}
