import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { getCustomerRow } from "@/lib/services/customers";

export async function GET(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) return jsonError("MISSING_FIELDS", "customerId is required.", 400);
  const customer = await getCustomerRow(user, customerId);
  if (!customer) return jsonError("NOT_FOUND", "Profile not found.", 404);
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.customerId, customerId))
    .orderBy(desc(conversations.createdAt));
  return NextResponse.json({ conversations: rows });
}
