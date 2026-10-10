import { NextResponse } from "next/server";
import { isResponse, requireAdmin } from "@/lib/auth/guard";
import { listAiModels } from "@/lib/services/ai-settings";

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  return NextResponse.json({ models: await listAiModels() });
}
