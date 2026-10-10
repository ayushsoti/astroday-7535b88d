import { NextResponse } from "next/server";
import { isResponse, requireAdmin } from "@/lib/auth/guard";
import { listUsers } from "@/lib/services/admin";

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  return NextResponse.json({ users: await listUsers() });
}
