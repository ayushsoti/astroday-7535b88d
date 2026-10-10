import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { createCalibrationEvent, listCalibrationEvents } from "@/lib/services/audit";

export async function GET(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) return jsonError("MISSING_FIELDS", "customerId is required.", 400);
  const rows = await listCalibrationEvents(user, customerId);
  if (rows === null) return jsonError("NOT_FOUND", "Profile not found.", 404);
  return NextResponse.json({ events: rows });
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const user = await requireUser();
  if (isResponse(user)) return user;
  let body: { customerId?: string; eventDate?: string; datePrecision?: "day" | "month" | "year"; category?: string; description?: string; confirmed?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  if (!body.customerId || !body.eventDate || !body.category || !body.description) {
    return jsonError("MISSING_FIELDS", "Customer, date, category and description are required.", 400);
  }
  const created = await createCalibrationEvent(user, {
    customerId: body.customerId,
    eventDate: body.eventDate,
    datePrecision: body.datePrecision,
    category: body.category,
    description: body.description,
    confirmed: body.confirmed,
  });
  if (!created) return jsonError("NOT_FOUND", "Profile not found.", 404);
  return NextResponse.json({ event: created }, { status: 201 });
}
