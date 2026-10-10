import { NextResponse } from "next/server";
import { isResponse, jsonError, requireAdmin } from "@/lib/auth/guard";
import { testAiSettings } from "@/lib/services/ai-settings";

export async function POST(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ result: await testAiSettings() });
  } catch {
    return jsonError("TEST_FAILED", "The connection test could not be run.", 502);
  }
}
