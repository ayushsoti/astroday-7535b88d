import { systemPrompt, type LlmAnswerRequest } from "./build-request";

export interface AnswerResult {
  answerText: string;
  answerSource: "llm" | "fallback";
}

const MODEL = "claude-sonnet-4-5";

/**
 * Deterministic fallback: no API key configured, or the call failed.
 * It is clearly labelled and built only from engine-computed values — never a fake success.
 */
export function fallbackAnswer(req: LlmAnswerRequest, reason: string): AnswerResult {
  const lines: string[] = [];
  lines.push(`[Offline answer — the language model is not configured (${reason}).]`);
  lines.push("");
  lines.push(`Category: ${req.question_category}. Convergence: ${req.convergence_label}. Event specificity: ${req.event_specificity}.`);
  lines.push(
    `Active period: ${req.active_dasha.md} / ${req.active_dasha.ad}${req.active_dasha.pd ? ` / ${req.active_dasha.pd}` : ""} (${req.active_dasha.adWindow[0]} to ${req.active_dasha.adWindow[1]}, ±2–3 days).`,
  );
  for (const d of req.domains) {
    lines.push("");
    lines.push(`${d.domain} — net read: ${d.net_read}`);
    for (const f of d.findings) {
      lines.push(`  • [${f.technique}] ${f.result}${f.strength ? ` (${f.strength})` : ""} — ${f.explanation}`);
    }
  }
  if (req.uncertainty_notes.length > 0) {
    lines.push("");
    lines.push(`Uncertainty: ${req.uncertainty_notes[0]}`);
  }
  return { answerText: lines.join("\n"), answerSource: "fallback" };
}

export async function answerQuestion(req: LlmAnswerRequest): Promise<AnswerResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallbackAnswer(req, "ANTHROPIC_API_KEY not set");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1400,
        system: systemPrompt(req.language),
        messages: [{ role: "user", content: JSON.stringify(req) }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return fallbackAnswer(req, `upstream ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text) return fallbackAnswer(req, "empty model response");
    return { answerText: text, answerSource: "llm" };
  } catch (err) {
    return fallbackAnswer(req, err instanceof Error ? err.message : "request failed");
  }
}
