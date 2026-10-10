/** Orchestrator (Part F /engine/analyze): runs every implemented technique and reports outcomes. */

import { DOMAIN_HOUSE, ENGINE_VERSION, LIMITATIONS, AYANAMSHA, HOUSE_SYSTEM, NODE_TYPE, type Domain } from "./constants";
import { buildNatal, resolveBirth } from "./natal";
import { activeDashaOn } from "./dasha";
import {
  computeTransits,
  d7ChildrenFinding,
  d9MarriageFinding,
  pathBFinding,
  pathCFinding,
  pathEFinding,
} from "./paths";
import { buildConflictReport, convergenceLabel, eventSpecificityOf, knowledgeStatusSummary } from "./conflict";
import { techniqueRegistryReport } from "./registry";
import { classify } from "./query";
import type { AnalyzeRequest, AnalyzeResponse, ConflictReport, Finding } from "./types";

function findingsForDomain(natal: ReturnType<typeof buildNatal>, domain: Domain, asOf: string, eventKey: string | null): { findings: Finding[]; executed: Set<string> } {
  const executed = new Set<string>();
  const findings: Finding[] = [];

  findings.push(pathCFinding(natal, domain, eventKey));
  executed.add("PATH_C_NATAL_PROMISE");
  findings.push(pathEFinding(natal, domain, eventKey));
  executed.add("PATH_E_NAKSHATRA_DISPOSITOR");

  const b = pathBFinding(natal, domain, asOf, eventKey);
  if (b) {
    findings.push(b);
    executed.add("PATH_B_TRANSIT");
  }

  if (domain === "relationships") {
    findings.push(d9MarriageFinding(natal, eventKey));
    executed.add("D9_MARRIAGE_STRUCTURE");
  }
  if (domain === "family") {
    findings.push(d7ChildrenFinding(natal, eventKey));
    executed.add("D7_CHILDREN_STRUCTURE");
  }
  return { findings, executed };
}

export function analyze(req: AnalyzeRequest): AnalyzeResponse {
  const natal = buildNatal(req.birth);
  const { utcIso } = resolveBirth(req.birth);
  const asOf = req.asOf;
  const moonLon = natal.positions.find((p) => p.body === "Moon")!.longitude;
  const activeDasha = activeDashaOn(moonLon, req.birth.birthDate, asOf);

  const query = req.question ? classify(req.question) : {
    question: "",
    category: "GENERAL LIFE PERIOD",
    domains: [...(req.domains ?? [])] as Domain[],
    eventKey: req.eventKey ?? null,
    language: "english" as const,
    notes: ["No question provided — domain-driven analysis."],
  };

  const domains: Domain[] = (req.domains && req.domains.length > 0 ? req.domains : query.domains) as Domain[];
  const eventKey = req.eventKey ?? query.eventKey ?? null;

  const allFindings: Finding[] = [];
  const conflictReports: ConflictReport[] = [];
  const executed = new Set<string>();

  for (const domain of domains) {
    const { findings, executed: ex } = findingsForDomain(natal, domain, asOf, domain === (domains[0]) ? eventKey : null);
    ex.forEach((e) => executed.add(e));
    allFindings.push(...findings);
    conflictReports.push(buildConflictReport(domain, domain === domains[0] ? eventKey : null, asOf, findings));
  }

  const primary = conflictReports[0];
  const hasTimingLayer = activeDasha.pd !== null;
  const label = primary ? convergenceLabel(primary, hasTimingLayer) : "INSUFFICIENT DATA";
  const eventSpecificity = eventSpecificityOf(allFindings);
  const transits = computeTransits(natal, asOf);

  const uncertaintyNotes = [
    "Vimshottari boundaries carry ±2–3 days (input Moon longitude precision).",
    "Path B is capped below STRONG; Vedha and Ashtakavarga-to-transit are not applied.",
    "The node longitude follows the fixture's convention (see limitations).",
  ];

  const timingWindows = activeDasha.pdWindow
    ? [{
        basis: "Vimshottari PD window",
        label: `${activeDasha.md}/${activeDasha.ad}/${activeDasha.pd}`,
        start: activeDasha.pdWindow[0],
        end: activeDasha.pdWindow[1],
        caveat: "±2–3 days (input Moon longitude precision)",
      }]
    : [];

  return {
    engineVersion: ENGINE_VERSION,
    calculationMetadata: {
      engineVersion: ENGINE_VERSION,
      ayanamsha: AYANAMSHA,
      ayanamshaValue: natal.ayanamsha,
      node: NODE_TYPE,
      houseSystem: HOUSE_SYSTEM,
    },
    birthIdentity: {
      name: req.birth.name,
      birthUtc: utcIso,
      place: req.birth.placeText,
      lat: req.birth.latitude,
      lon: req.birth.longitude,
      tz: req.birth.timezone,
    },
    query,
    natal,
    activeDasha,
    timingWindows,
    transits,
    conflictReports,
    eventSpecificity,
    convergenceLabel: label,
    knowledgeStatusSummary: knowledgeStatusSummary(allFindings),
    uncertaintyNotes,
    supportingFindingIds: allFindings.filter((f) => f.result === "SUPPORTS").map((f) => f.findingId),
    limitations: [...LIMITATIONS],
    techniqueRegistry: techniqueRegistryReport(domains, executed),
  };
}

export const _domainHouse = DOMAIN_HOUSE;
