import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/astro/place";
import { isResponse, requireUser } from "@/lib/auth/guard";

export async function GET(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ places: searchPlaces(q, 8) });
}
