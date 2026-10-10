import { NextResponse } from "next/server";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { getChart } from "@/lib/services/chart";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const payload = await getChart(user, id);
  if (!payload) return jsonError("NOT_FOUND", "Chart not found.", 404);
  return NextResponse.json(payload);
}
