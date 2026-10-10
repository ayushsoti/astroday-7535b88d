import { systemPrompt, type LlmAnswerRequest } from "./build-request";

export interface AnswerResult {
  answerText: string;
  answerSource: "llm" | "fallback";
}

/**
 * Provider resolution.
 *
 * Priority:
 *   1. Ollama Cloud (OLLAMA_API_KEY) — hosted models, no local server required.
 *      Uses Ollama's Anthropic-compatible /v1/messages endpoint (Bearer auth).
 *   2. Anthropic (ANTHROPIC_API_KEY) — the original direct Claude endpoint.
 *   3. Deterministic fallback — clearly labelled, engine-only, never a fake success.
 *
 * Both hosted providers accept the same request/response shape, so the parsing
 * below is shared. Ollama returns extra `thinking` blocks; we keep only `text`.
 */
interface Provider {
  url: string;
  headers: Record<string, string>;
  model: string;
}

const DEFAULT_OLLAMA_BASE_URL = "https://ollama.com";
const DEFAULT_OLLAMA_MODEL = "gpt-oss:120b";
const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const REQUEST_TIMEOUT_MS = 60000;

function resolveProvider(): Provider | null {
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (ollamaKey) {
    const base = (process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
    return {
      url: `${base}/v1/messages`,
      headers: {
        authorization: `Bearer ${ollamaKey}`,
        "anthropic-version": "2023-06-01",
      },
      model: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
    };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      model: ANTHROPIC_MODEL,
    };
  }

  return null;
}

/**
 * Deterministic fallback: no API key configured, or the call failed.
 * It is clearly labelled and built only from engine-computed values — never a fake success.
 */
export function fallbackAnswer(req: LlmAnswerRequest, reason: string): AnswerResult {
  const lines: string[] = [];
  lines.push(`> **Offline answer** — the language model is not configured (${reason}).`);
  lines.push("");
  lines.push(`**Category:** ${req.question_category} · **Convergence:** ${req.convergence_label} · **Event specificity:** ${req.event_specificity}`);
  lines.push(
    `**Active period:** ${req.active_dasha.md} / ${req.active_dasha.ad}${req.active_dasha.pd ? ` / ${req.active_dasha.pd}` : ""} (${req.active_dasha.adWindow[0]} to ${req.active_dasha.adWindow[1]}, ±2–3 days).`,
  );
  for (const d of req.domains) {
    lines.push("");
    lines.push(`### ${d.domain} — net read: ${d.net_read}`);
    for (const f of d.findings) {
      lines.push(`- **[${f.technique}]** ${f.result}${f.strength ? ` (${f.strength})` : ""} — ${f.explanation}`);
    }
  }

  // Why / how long / what to do — the same structure the live model is required to follow.
  const g = req.guidance;
  if (g) {
    lines.push("");
    lines.push("### Why this is happening");
    for (const c of g.why) lines.push(`- **${c.step}:** ${c.basis}`);

    lines.push("");
    lines.push("### How long");
    lines.push(`- ${g.duration.headline} (${g.duration.caveat})`);

    lines.push("");
    lines.push("### What to do");
    for (const da of g.domainActions) {
      lines.push(`- **${da.domain}** (house ${da.house})`);
      for (const s of da.steps) lines.push(`  - ${s}`);
    }
    for (const a of g.actions) {
      lines.push(`- **${a.planet}** — ${a.theme}`);
      for (const s of a.daily) lines.push(`  - ${s}`);
      for (const s of a.traditional) lines.push(`  - _traditional:_ ${s}`);
      lines.push(`  - _caution:_ ${a.caution}`);
    }
    lines.push("");
    lines.push(g.note);
  }
  if (req.uncertainty_notes.length > 0) {
    lines.push("");
    lines.push(`> **Uncertainty:** ${req.uncertainty_notes[0]}`);
  }
  return { answerText: lines.join("\n"), answerSource: "fallback" };
}

export async function answerQuestion(req: LlmAnswerRequest): Promise<AnswerResult> {
  const provider = resolveProvider();
  if (!provider) return fallbackAnswer(req, "no language-model API key configured");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1800,
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
