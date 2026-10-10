"use client";

import { useState } from "react";
import { ChevronDown, WifiOff } from "lucide-react";
import type { ChatMessage } from "@/lib/contract";
import type { AnalyzeResponse, GroupVerdict } from "@/lib/astro/types";
import { ConvergenceBadge, KnowledgeTag, VerdictChip } from "@/components/verdict";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface AnswerCardProps {
  message: ChatMessage;
  /** `fallback` marks an answer written without the model. */
  answerSource?: "llm" | "fallback";
  /** Present for answers produced in this session — carries the per-domain verdicts. */
  analysis?: AnalyzeResponse;
}

/**
 * Stored messages only carry the convergence label, so a per-domain verdict is
 * derived from it. Answers produced in this session carry the real reports.
 */
const CONVERGENCE_VERDICT: Record<string, GroupVerdict> = {
  "HIGH CONVERGENCE": "SUPPORT",
  "MODERATE CONVERGENCE": "SUPPORT",
  "LOW CONVERGENCE": "CORRELATED_NON_INDEPENDENT",
  CONFLICTED: "CONFLICTED",
  "INSUFFICIENT DATA": "UNVALIDATED",
};

function verdictForDomain(
  message: ChatMessage,
  analysis: AnalyzeResponse | undefined,
  domain: string,
): GroupVerdict {
  const report = analysis?.conflictReports.find((r) => r.domain === domain);
  if (report) return report.netRead;
  return CONVERGENCE_VERDICT[message.convergenceLabel ?? ""] ?? "UNVALIDATED";
}

export function AnswerCard({ message, answerSource, analysis }: AnswerCardProps) {
  const [open, setOpen] = useState(false);
  const knowledgeEntries = Object.entries(message.knowledgeStatusSummary);
  const uncertainty = message.uncertaintyNotes[0] ?? null;

  return (
    <article
      aria-label="Astroday answer"
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{message.content}</p>

      {answerSource === "fallback" && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2.5 py-1 text-[11px] text-muted-foreground">
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          model offline — deterministic answer
        </p>
      )}

      {message.domains.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Domains read for this question">
          {message.domains.map((domain) => (
            <li key={domain} className="inline-flex items-center gap-2">
              <span className="text-xs capitalize text-muted-foreground">{domain}</span>
              <VerdictChip label={verdictForDomain(message, analysis, domain)} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {message.convergenceLabel && <ConvergenceBadge label={message.convergenceLabel} />}
        {message.questionCategory && (
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {message.questionCategory}
          </span>
        )}
      </div>

      <Collapsible open={open} onOpenChange={setOpen} className="mt-4 border-t border-border pt-3">
        <CollapsibleTrigger
          aria-label="Why this answer"
          className="flex w-full items-center justify-between rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Why this answer
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-4 text-xs text-muted-foreground">
          <section aria-label="Supporting findings">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
              Supporting findings
            </h3>
            {message.supportingFindingIds.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {message.supportingFindingIds.map((id) => (
                  <li
                    key={id}
                    className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {id}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">No findings were attached to this answer.</p>
            )}
          </section>

          <section aria-label="Knowledge status">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
              Knowledge status
            </h3>
            {knowledgeEntries.length > 0 ? (
              <ul className="mt-2 flex flex-wrap items-center gap-2">
                {knowledgeEntries.map(([status, count]) => (
                  <li key={status} className="inline-flex items-center gap-1">
                    <KnowledgeTag status={status} />
                    <span className="text-[11px]">×{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">No knowledge-status summary was recorded.</p>
            )}
          </section>
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        {uncertainty ?? "No uncertainty notes were recorded for this answer."}
      </p>
    </article>
  );
}
