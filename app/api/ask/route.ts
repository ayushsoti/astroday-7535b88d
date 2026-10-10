import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { ask, NotFoundError } from "@/lib/services/ask";
import type { AskRequest } from "@/lib/contract";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const user = await requireUser();
  if (isResponse(user)) return user;
  let body: AskRequest;
  try {
    body = (await req.json()) as AskRequest;
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  if (!body.customerId || !body.question || !body.question.trim()) {
    return jsonError("MISSING_FIELDS", "A customer and a question are required.", 400);
  }
  try {
    const result = await ask(user.id, user.role === "admin", body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) return jsonError("CUSTOMER_NOT_FOUND", "That profile does not exist or is not yours.", 404);
    return jsonError("ENGINE_ERROR", "The advisor could not complete this question. Try again.", 500);
  }
}
