/** Technique registry (Part J.6): explicit outcome for every technique — nothing silently skipped. */

import type { Domain } from "./constants";

const ALL_DOMAINS: Domain[] = [
  "career", "money", "property", "vehicle", "relationships",
  "family", "health", "education", "legal",
];

export interface TechniqueDef {
  techniqueId: string;
  domains: Domain[];
  implemented: boolean;
}

export const TECHNIQUES: TechniqueDef[] = [
  { techniqueId: "PATH_C_NATAL_PROMISE", domains: ALL_DOMAINS, implemented: true },
  { techniqueId: "PATH_E_NAKSHATRA_DISPOSITOR", domains: ALL_DOMAINS, implemented: true },
  { techniqueId: "PATH_B_TRANSIT", domains: ALL_DOMAINS, implemented: true },
  { techniqueId: "D9_MARRIAGE_STRUCTURE", domains: ["relationships"], implemented: true },
  { techniqueId: "D7_CHILDREN_STRUCTURE", domains: ["family"], implemented: true },
  { techniqueId: "VIMSHOTTARI_MD_AD_PD", domains: ALL_DOMAINS, implemented: true },
  { techniqueId: "VIMSHOTTARI_SOOKSHMA", domains: ALL_DOMAINS, implemented: false },
  { techniqueId: "D10_CAREER_STRUCTURE", domains: ["career"], implemented: false },
  { techniqueId: "D4_PROPERTY_STRUCTURE", domains: ["property"], implemented: false },
  { techniqueId: "CLASSICAL_MONEY_DHANA_YOGA", domains: ["money"], implemented: false },
  { techniqueId: "DEBT_RINA_CLASSICAL_ANALYSIS", domains: ["money"], implemented: false },
  { techniqueId: "PATH_I_CONVERGENCE", domains: ALL_DOMAINS, implemented: false },
  { techniqueId: "CLASSICAL_LEGAL_OVERLAY", domains: ["legal"], implemented: false },
  { techniqueId: "CLASSICAL_HEALTH_OVERLAY", domains: ["health"], implemented: false },
  { techniqueId: "CLASSICAL_EDUCATION_OVERLAY", domains: ["education"], implemented: false },
  { techniqueId: "CLASSICAL_FAMILY_OVERLAY", domains: ["family"], implemented: false },
  { techniqueId: "CLASSICAL_TRAVEL_OVERLAY", domains: [], implemented: false },
];

export type RegistryOutcome =
  | "EXECUTED"
  | "NOT_IMPLEMENTED"
  | "NOT_APPLICABLE_TO_DOMAIN"
  | "ELIGIBLE_BUT_NO_ADAPTER"
  | "EXCLUDED_BY_CALLER"
  | "NOT_IN_REGISTRY";

export function registryOutcome(
  techniqueId: string,
  domain: Domain,
  executed: Set<string>,
): RegistryOutcome {
  const def = TECHNIQUES.find((t) => t.techniqueId === techniqueId);
  if (!def) return "NOT_IN_REGISTRY";
  if (!def.domains.includes(domain)) return "NOT_APPLICABLE_TO_DOMAIN";
  if (!def.implemented) return "NOT_IMPLEMENTED";
  if (executed.has(techniqueId)) return "EXECUTED";
  return "ELIGIBLE_BUT_NO_ADAPTER";
}

export function techniqueRegistryReport(
  domains: Domain[],
  executed: Set<string>,
): { techniqueId: string; outcome: string }[] {
  const out: { techniqueId: string; outcome: string }[] = [];
  for (const t of TECHNIQUES) {
    for (const d of domains) {
      out.push({ techniqueId: `${t.techniqueId}:${d}`, outcome: registryOutcome(t.techniqueId, d, executed) });
    }
  }
  return out;
}
