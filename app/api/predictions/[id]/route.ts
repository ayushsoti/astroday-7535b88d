import { NextResponse } from "next/server";
import { checkOrigin, isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { updatePredictionOutcome } from "@/lib/services/audit";
import type { PredictionOutcome } from "@/lib/contract";

const OUTCOMES: PredictionOutcome[] = ["pending", "hit", "miss", "partial", "unknown"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!checkOrigin(req)) return jsonError("BAD_ORIGIN", "Request origin rejected.", 403);
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  let body: { outcome?: PredictionOutcome; outcomeNotes?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  if (!body.outcome || !OUTCOMES.includes(body.outcome)) return jsonError("INVALID_OUTCOME", "Unknown outcome.", 400);
  const updated = await updatePredictionOutcome(user, id, body.outcome, body.outcomeNotes ?? null);
  if (!updated) return jsonError("NOT_FOUND", "Prediction not found.", 404);
  return NextResponse.json({ prediction: updated });
}
