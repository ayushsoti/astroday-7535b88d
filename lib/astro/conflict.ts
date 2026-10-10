/** Conflict model (Part K): grouping, verdicts, event specificity, knowledge status, convergence. */

import type { Domain, KnowledgeStatus } from "./constants";
import type {
  ConflictGroup,
  ConflictReport,
  ConvergenceLabel,
  EventSpecificity,
  Finding,
  GroupVerdict,
  NetRead,
} from "./types";

const RESULT_TO_VERDICT: Record<string, GroupVerdict> = {
  SUPPORTS: "SUPPORT",
  OPPOSES: "OPPOSES",
  NEUTRAL: "NEUTRAL",
  NO_RELEVANT_ACTIVATION: "UNVALIDATED",
  NOT_TESTED: "UNVALIDATED",
  UNAVAILABLE: "UNAVAILABLE",
};

function groupVerdict(findings: Finding[]): GroupVerdict {
  if (findings.length === 1) return RESULT_TO_VERDICT[findings[0].result];
  const distinct = new Set(findings.map((f) => f.result));
  if (distinct.size === 1) return "CORRELATED_NON_INDEPENDENT";
  return "CONFLICTED";
}

export function netReadOf(groups: ConflictGroup[]): NetRead {
  const support = groups.filter((g) => g.verdict === "SUPPORT").length;
  const oppose = groups.filter((g) => g.verdict === "OPPOSES").length;
  const correlated = groups.filter((g) => g.verdict === "CORRELATED_NON_INDEPENDENT").length;
  const conflicted = groups.some((g) => g.verdict === "CONFLICTED");
  const unvalidated = groups.some((g) => g.verdict === "UNVALIDATED");
  const unavailable = groups.some((g) => g.verdict === "UNAVAILABLE");

  if (conflicted) return "CONFLICTED";
  if (support > 0 && oppose > 0) return "CONFLICTED";
  if (support > 0) return "SUPPORT";
  if (oppose > 0) return "OPPOSES";
  if (correlated > 0) return "CORRELATED_NON_INDEPENDENT";
  if (unvalidated) return "UNVALIDATED";
  if (unavailable) return "UNAVAILABLE";
  return "NEUTRAL";
}

export function buildConflictReport(
  domain: Domain,
  eventKey: string | null,
  evaluationDate: string,
  findings: Finding[],
): ConflictReport {
  const byGroup = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = byGroup.get(f.independenceGroup) ?? [];
    arr.push(f);
    byGroup.set(f.independenceGroup, arr);
  }
  const groups: ConflictGroup[] = [...byGroup.entries()].map(([independenceGroup, fs]) => ({
    independenceGroup,
    verdict: groupVerdict(fs),
    findings: fs.map((f) => f.findingId),
  }));

  const netRead = netReadOf(groups);
  const notes: string[] = [];
  const correlated = groups.filter((g) => g.verdict === "CORRELATED_NON_INDEPENDENT");
  if (correlated.length > 0) {
    notes.push("Correlated groups are never counted as independent support.");
  }
  notes.push("Independence uses exact string match; Path E's group contains Path C's fact plus one more.");

  return {
    domain,
    eventKey,
    evaluationDate,
    groups,
    netRead,
    independentSupportGroupCount: groups.filter((g) => g.verdict === "SUPPORT").length,
    independentOpposeGroupCount: groups.filter((g) => g.verdict === "OPPOSES").length,
    correlatedGroupCount: correlated.length,
    notes,
    findings,
  };
}

/** K.4 — distinct named event keys on SUPPORTS findings. */
export function eventSpecificityOf(findings: Finding[]): EventSpecificity {
  const keys = new Set(
    findings.filter((f) => f.result === "SUPPORTS" && f.eventKey).map((f) => f.eventKey as string),
  );
  if (keys.size === 0) return "NO_EVENT_LEVEL_SUPPORT";
  if (keys.size === 1) return "SINGLE_EVENT_SUPPORTED";
  return "MULTIPLE_EVENTS_SUPPORTED";
}

export function knowledgeStatusSummary(findings: Finding[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) out[f.knowledgeStatus] = (out[f.knowledgeStatus] ?? 0) + 1;
  return out;
}

/** K.6 — convergence label from the primary domain's report. */
export function convergenceLabel(
  report: ConflictReport,
  hasTimingLayer: boolean,
): ConvergenceLabel {
  if (report.netRead === "CONFLICTED") return "CONFLICTED";
  const natalGroups = report.groups.filter(
    (g) => (g.verdict === "SUPPORT" || g.verdict === "OPPOSES") && /^natal:|^d9:|^d7:/.test(g.independenceGroup),
  ).length;
  const total = report.independentSupportGroupCount + report.independentOpposeGroupCount;
  const directional = report.netRead === "SUPPORT" || report.netRead === "OPPOSES";
  if (directional && total >= 3 && natalGroups >= 1 && hasTimingLayer) return "HIGH CONVERGENCE";
  if (directional && total >= 2) return "MODERATE CONVERGENCE";
  if (report.netRead === "CORRELATED_NON_INDEPENDENT" || total === 1) return "LOW CONVERGENCE";
  return "INSUFFICIENT DATA";
}

export const _knowledgeStatusType: KnowledgeStatus | null = null;
