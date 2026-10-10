import { systemPrompt, type LlmAnswerRequest } from "./build-request";
import { buildChatRequest, parseChatResponse } from "./provider";
import { logAiUsage, resolveSettings, type ResolvedSettings } from "../services/ai-settings";

export interface AnswerResult {
  answerText: string;
  answerSource: "llm" | "fallback";
}

/**
 * The advisor's language model.
 *
 * Configuration lives in the admin AI console (persisted in `ai_settings`) and
 * falls back to environment variables when the console has never been saved.
 * Three provider shapes are supported through lib/llm/provider.ts. If the model is
 * disabled, unconfigured, or unreachable, we return a clearly-labelled deterministic
 * answer built only from engine values — never a fake success.
 */

/** Fill the {language} placeholder in a custom prompt, or use the built-in one. */
function resolveSystemPrompt(language: "english" | "hinglish", override: string): string {
  const lang =
    language === "hinglish" ? "Hinglish (Roman-script Hindi mixed with English)" : "English";
  if (override.trim().length > 0) {
    const filled = override.replace(/\{language\}/g, lang);
    return `${filled}\n\nReply in ${lang}; Hinglish is fine when the user writes Hinglish.`;
  }
  return systemPrompt(language);
}

interface CallOutcome {
  ok: boolean;
  text: string;
  latencyMs: number;
  detail: string;
}

async function callModel(
  cfg: ResolvedSettings,
  model: string,
  system: string,
  userContent: string,
): Promise<CallOutcome> {
  const started = Date.now();
  try {
    const request = buildChatRequest(cfg, model, system, userContent);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
    const res = await fetch(request.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...request.headers },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - started;
    if (!res.ok) return { ok: false, text: "", latencyMs, detail: `upstream ${res.status}` };
    const data = await res.json();
    const text = parseChatResponse(cfg.provider, data);
    if (!text) return { ok: false, text: "", latencyMs, detail: "empty model response" };
    return { ok: true, text, latencyMs, detail: "" };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const detail =
      err instanceof Error && err.name === "AbortError"
        ? "model timeout"
        : err instanceof Error
          ? err.message
          : "request failed";
    return { ok: false, text: "", latencyMs, detail };
  }
}

/**
 * Deterministic fallback: no usable model, or the call failed.
 * Clearly labelled and built only from engine-computed values — never a fake success.
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
  const cfg = await resolveSettings();

  if (!cfg.enabled) {
    const reason = "the AI console is switched off";
    await logAiUsage({ provider: cfg.provider, model: cfg.model, source: "fallback", ok: false, latencyMs: 0, detail: reason });
    return fallbackAnswer(req, reason);
  }

  if (!cfg.apiKey) {
    const reason = "no language-model API key configured";
    await logAiUsage({ provider: cfg.provider, model: cfg.model, source: "fallback", ok: false, latencyMs: 0, detail: reason });
    return fallbackAnswer(req, reason);
  }

  const system = resolveSystemPrompt(req.language, cfg.systemPromptOverride);
  const userContent = JSON.stringify(req);

  let outcome = await callModel(cfg, cfg.model, system, userContent);
  let usedModel = cfg.model;

  // Retry once on the configured backup model before giving up.
  if (!outcome.ok && cfg.fallbackModel && cfg.fallbackModel !== cfg.model) {
    const retry = await callModel(cfg, cfg.fallbackModel, system, userContent);
    if (retry.ok) {
      outcome = retry;
      usedModel = cfg.fallbackModel;
    }
  }

  if (!outcome.ok) {
    await logAiUsage({
      provider: cfg.provider,
      model: cfg.model,
      source: "fallback",
      ok: false,
      latencyMs: outcome.latencyMs,
      detail: outcome.detail,
    });
    return fallbackAnswer(req, outcome.detail);
  }

  await logAiUsage({
    provider: cfg.provider,
    model: usedModel,
    source: "llm",
    ok: true,
    latencyMs: outcome.latencyMs,
    detail: usedModel === cfg.model ? undefined : `served by backup model ${usedModel}`,
  });

  return { answerText: outcome.text, answerSource: "llm" };
}
