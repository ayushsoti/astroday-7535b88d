import { NextResponse } from "next/server";
import { isResponse, jsonError, requireAdmin } from "@/lib/auth/guard";
import { getAiUsageSummary } from "@/lib/services/ai-settings";

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ summary: await getAiUsageSummary() });
  } catch {
    return jsonError("USAGE_FAILED", "Could not load AI usage.", 500);
  }
}
