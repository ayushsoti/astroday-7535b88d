import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { aiConclusions, engineRuns, messages, statedFacts } from "../db/schema";
import { analyze } from "../astro/analyze";
import { todayIso } from "../astro/time";
import { buildAnswerRequest } from "../llm/build-request";
import { answerQuestion } from "../llm/answer";
import { birthOf, ensureConversation, getCustomerRow } from "./customers";
import type { AskRequest, AskResponse } from "../contract";

export class NotFoundError extends Error {
  readonly code = "CUSTOMER_NOT_FOUND";
  constructor() {
    super("Customer not found");
  }
}

export async function ask(userId: string, isAdmin: boolean, req: AskRequest): Promise<AskResponse> {
  const customerRow = await getCustomerRow(
    { id: userId, role: isAdmin ? "admin" : "user" } as never,
    req.customerId,
  );
  if (!customerRow) throw new NotFoundError();

  const asOf = req.asOf ?? todayIso();
  const birth = birthOf(customerRow);

  const started = Date.now();
  const analysis = analyze({ birth, asOf, question: req.question });
  const durationMs = Date.now() - started;

  const engineRunId = randomUUID();
  await db.insert(engineRuns).values({
    id: engineRunId,
    customerId: customerRow.id,
    asOfDate: asOf,
    requestJson: JSON.stringify({ birth, asOf, question: req.question }),
    responseJson: JSON.stringify(analysis),
    durationMs,
  });

  const conversation = await ensureConversation(customerRow.id);

  if (req.statedFact && req.statedFact.text.trim()) {
    await db.insert(statedFacts).values({
      id: randomUUID(),
      customerId: customerRow.id,
      text: req.statedFact.text.trim(),
      category: req.statedFact.category ?? null,
      eventDate: req.statedFact.eventDate ?? null,
    });
  }

  const priorFacts = await db
    .select()
    .from(statedFacts)
    .where(eq(statedFacts.customerId, customerRow.id))
    .orderBy(desc(statedFacts.createdAt))
    .limit(10);
  const priorConclusions = await db
    .select()
    .from(aiConclusions)
    .where(eq(aiConclusions.customerId, customerRow.id))
    .orderBy(desc(aiConclusions.createdAt))
    .limit(6);

  const llmRequest = buildAnswerRequest(analysis, {
    statedFacts: priorFacts.map((f) => ({ text: f.text, category: f.category, eventDate: f.eventDate })),
    priorConclusions: priorConclusions.map((c) => c.text),
  });
  const answer = await answerQuestion(llmRequest);

  const userMessageId = randomUUID();
  await db.insert(messages).values({
    id: userMessageId,
    conversationId: conversation.id,
    role: "user",
    content: req.question,
  });

  const assistantMessageId = randomUUID();
  await db.insert(messages).values({
    id: assistantMessageId,
    conversationId: conversation.id,
    role: "assistant",
    content: answer.answerText,
    questionCategory: analysis.query.category,
    domainsJson: JSON.stringify(analysis.query.domains),
    convergenceLabel: analysis.convergenceLabel,
    supportingFindingIdsJson: JSON.stringify(analysis.supportingFindingIds),
    uncertaintyNotesJson: JSON.stringify(analysis.uncertaintyNotes),
    knowledgeStatusSummaryJson: JSON.stringify(analysis.knowledgeStatusSummary),
    engineRunId,
  });

  const firstLine = answer.answerText.split("\n").find((l) => l.trim().length > 0) ?? answer.answerText;
  await db.insert(aiConclusions).values({
    id: randomUUID(),
    customerId: customerRow.id,
    messageId: assistantMessageId,
    text: firstLine.slice(0, 500),
  });

  return {
    messageId: assistantMessageId,
    answerText: answer.answerText,
    answerSource: answer.answerSource,
    questionCategory: analysis.query.category,
    domains: analysis.query.domains,
    convergenceLabel: analysis.convergenceLabel,
    supportingFindingIds: analysis.supportingFindingIds,
    uncertaintyNotes: analysis.uncertaintyNotes,
    knowledgeStatusSummary: analysis.knowledgeStatusSummary,
    engineRunId,
    analysis,
  };
}
