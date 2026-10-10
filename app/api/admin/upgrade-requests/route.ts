import { NextResponse } from "next/server";
import { isResponse, requireAdmin } from "@/lib/auth/guard";
import { listUpgradeRequests } from "@/lib/services/admin";

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  return NextResponse.json({ requests: await listUpgradeRequests() });
}
