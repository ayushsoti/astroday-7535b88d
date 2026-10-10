import { NextResponse } from "next/server";
import { isResponse, requireAdmin } from "@/lib/auth/guard";
import { testAiSettings } from "@/lib/services/ai-settings";

export async function POST(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  return NextResponse.json({ result: await testAiSettings() });
}
