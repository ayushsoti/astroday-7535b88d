import type { AnalyzeResponse } from "../astro/types";

/** Part P.1 system prompt, verbatim, with {language} filled in. */
export function systemPrompt(language: "english" | "hinglish"): string {
  const lang = language === "hinglish" ? "Hinglish (Roman-script Hindi mixed with English)" : "English";
  return `You are Astroday, a Vedic astrology reasoning engine and practical life-strategy advisor.
You receive a JSON payload computed by a deterministic astrology engine. You write the answer text only.

HARD RULES
- Use ONLY positions, dates, findings and rules present in the payload. Never invent degrees,
  dasha dates, transits, yogas, divisional placements or classical quotations.
- If a needed technique is NOT_TESTED/UNAVAILABLE/NOT_IMPLEMENTED, say so plainly.
- Never upgrade UNKNOWN_NOT_TESTED or TRADITION_SPECIFIC evidence to certainty.
- Never give a percentage. Use the convergence_label provided.
- Separate NATAL PROMISE from TIMING ACTIVATION. A transit cannot create a missing promise.
- If findings conflict, explain the conflict; do not average it.
- Domain-level support is not event-level support.
- Give windows, not exact dates, unless the payload gives day-level dasha boundaries
  (then mention the ±2–3 day caveat).
- Astrology never overrides financial, legal, medical or safety reality. For decisions,
  give REAL-WORLD CASE, ASTROLOGICAL TIMING, SYNTHESIS.
- For past events: reconstruct conditions first, say what category they suggested,
  then compare. No post-hoc precision.
- stated_facts are what the user said; prior_conclusions are your earlier opinions.
  Treat both as context, not chart facts. Point out if they conflict with the evidence.
- Be direct, specific, practical. No flattery, no "trust the universe", no horoscope prose.
- If the chart does not resolve the question, say:
  "The chart does not give enough resolution to answer this reliably."
- Reply in ${lang}; Hinglish is fine when the user writes Hinglish.
  Address the user respectfully ("aap").`;
}

export interface LlmAnswerRequest {
  question: string;
  question_category: string;
  language: "english" | "hinglish";
  as_of: string;
  chart_summary: { ascendant: string; moon: string; key_conditions: string[] };
  active_dasha: AnalyzeResponse["activeDasha"];
  timing_windows: AnalyzeResponse["timingWindows"];
  transits: AnalyzeResponse["transits"];
  domains: {
    domain: string;
    net_read: string;
    findings: { id: string; technique: string; result: string; strength: string | null; explanation: string; knowledge_status: string }[];
    notes: string[];
  }[];
  event_specificity: string;
  convergence_label: string;
  limitations: string[];
  uncertainty_notes: string[];
  stated_facts: { text: string; category: string | null; event_date: string | null }[];
  prior_conclusions: string[];
}

/** Build the P.3 LLM request from engine output — no engine computation happens here. */
export function buildAnswerRequest(
  analysis: AnalyzeResponse,
  context: {
    statedFacts: { text: string; category: string | null; eventDate: string | null }[];
    priorConclusions: string[];
  },
): LlmAnswerRequest {
  return {
    question: analysis.query.question,
    question_category: analysis.query.category,
    language: analysis.query.language,
    as_of: analysis.conflictReports[0]?.evaluationDate ?? "",
    chart_summary: {
      ascendant: analysis.natal.ascendant.sign,
      moon: `${analysis.natal.moonSign} / ${analysis.natal.moonNakshatra}-${analysis.natal.moonNakshatraPada}`,
      key_conditions: analysis.natal.conditions
        .filter((c) => c.dignity === "Exalted" || c.dignity === "Debilitated" || c.combust)
        .map((c) => `${c.body}: ${c.dignity ?? "n/a"}${c.combust ? " (combust)" : ""} — score ${c.score}`),
    },
    active_dasha: analysis.activeDasha,
    timing_windows: analysis.timingWindows,
    transits: analysis.transits,
    domains: analysis.conflictReports.map((r) => ({
      domain: r.domain,
      net_read: r.netRead,
      findings: r.findings.map((f) => ({
        id: f.findingId,
        technique: f.techniqueId,
        result: f.result,
        strength: f.strength,
        explanation: f.explanation,
        knowledge_status: f.knowledgeStatus,
      })),
      notes: r.notes,
    })),
    event_specificity: analysis.eventSpecificity,
    convergence_label: analysis.convergenceLabel,
    limitations: analysis.limitations,
    uncertainty_notes: analysis.uncertaintyNotes,
    stated_facts: context.statedFacts.map((f) => ({ text: f.text, category: f.category, event_date: f.eventDate })),
    prior_conclusions: context.priorConclusions,
  };
}
