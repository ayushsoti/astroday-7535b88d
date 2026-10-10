import { NextResponse } from "next/server";
import { AmbiguousPlaceError, UnknownPlaceError } from "@/lib/astro/place";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { createCustomer, listCustomers } from "@/lib/services/customers";
import type { CreateCustomerRequest } from "@/lib/contract";

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return NextResponse.json({ customers: await listCustomers(user) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  let body: CreateCustomerRequest;
  try {
    body = (await req.json()) as CreateCustomerRequest;
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  if (!body.name || !body.birthDate || !body.birthTime || !body.placeText) {
    return jsonError("MISSING_FIELDS", "Name, birth date, birth time and place are required.", 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) return jsonError("INVALID_DATE", "Birth date must be YYYY-MM-DD.", 400);
  if (!/^\d{2}:\d{2}$/.test(body.birthTime)) return jsonError("INVALID_TIME", "Birth time must be HH:MM.", 400);

  try {
    const customer = await createCustomer(user.id, body);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    if (err instanceof AmbiguousPlaceError) {
      return jsonError("AMBIGUOUS_BIRTH_PLACE", `Multiple places match "${body.placeText}". Pick one.`, 422, { candidates: err.candidates });
    }
    if (err instanceof UnknownPlaceError) {
      return jsonError("UNKNOWN_BIRTH_PLACE", `No known place matches "${body.placeText}". Try "City, Country" or set coordinates under Advanced.`, 422);
    }
    return jsonError("ENGINE_ERROR", "Could not compute the chart. Check the birth details and try again.", 500);
  }
}
