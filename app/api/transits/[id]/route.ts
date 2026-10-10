import { NextResponse } from "next/server";
import { todayIso } from "@/lib/astro/time";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { getTransits } from "@/lib/services/chart";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf") ?? todayIso();
  const payload = await getTransits(user, id, asOf);
  if (!payload) return jsonError("NOT_FOUND", "Chart not found.", 404);
  return NextResponse.json(payload);
}
