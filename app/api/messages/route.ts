import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { isResponse, jsonError, requireUser } from "@/lib/auth/guard";
import { getCustomerRow } from "@/lib/services/customers";
import type { ChatMessage } from "@/lib/contract";

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
  return NextResponse.json({ messages: out });
}
