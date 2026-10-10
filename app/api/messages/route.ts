import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, engineRuns, messages } from "@/lib/db/schema";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { getCustomerRow } from "@/lib/services/customers";
import type { ChatMessage } from "@/lib/contract";
import type { AnalyzeResponse } from "@/lib/astro/types";

export async function GET(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return jsonError("MISSING_FIELDS", "conversationId is required.", 400);
  const conv = (await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1))[0];
  if (!conv) return jsonError("NOT_FOUND", "Conversation not found.", 404);
  const customer = await getCustomerRow(user, conv.customerId);
  if (!customer) return jsonError("FORBIDDEN", "Not your conversation.", 403);
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
  const out: ChatMessage[] = rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    role: r.role,
    content: r.content,
    questionCategory: r.questionCategory,
    domains: JSON.parse(r.domainsJson),
    convergenceLabel: r.convergenceLabel,
    supportingFindingIds: JSON.parse(r.supportingFindingIdsJson),
    uncertaintyNotes: JSON.parse(r.uncertaintyNotesJson),
    knowledgeStatusSummary: JSON.parse(r.knowledgeStatusSummaryJson),
    createdAt: r.createdAt,
  }));

  // Reattach the analysis behind each assistant answer so the visual summary
  // survives a reload. Stored once per engine run and shared by id.
  const runIds = Array.from(
    new Set(rows.map((r) => r.engineRunId).filter((v): v is string => Boolean(v))),
  );
  if (runIds.length > 0) {
    const runs = await db.select().from(engineRuns).where(inArray(engineRuns.id, runIds));
    const byRun = new Map<string, AnalyzeResponse>();
    for (const run of runs) {
      try {
        byRun.set(run.id, JSON.parse(run.responseJson) as AnalyzeResponse);
      } catch {
        // A malformed stored run should not break the whole thread.
      }
    }
    for (const message of out) {
      const row = rows.find((r) => r.id === message.id);
      if (message.role === "assistant" && row?.engineRunId) {
        const analysis = byRun.get(row.engineRunId);
        if (analysis) message.analysis = analysis;
      }
    }
  }

  return NextResponse.json({ messages: out });
}
