/** Evidence techniques: Path C (natal promise), Path E (nakshatra dispositor), Path B (gochara transits). */

import {
  DOMAIN_HOUSE,
  GOCHARA,
  SIGNS,
  SLOW_MOVERS,
  type Domain,
} from "./constants";
import { computeEphemeris } from "./ephemeris";
import { dignityOf } from "./primitives";
import type { Finding, FindingResult, NatalChart, Strength, TransitInfo } from "./types";

const norm360 = (x: number): number => ((x % 360) + 360) % 360;

function resultFromDirection(direction: string): FindingResult {
  if (direction === "POSITIVE") return "SUPPORTS";
  if (direction === "NEGATIVE") return "OPPOSES";
  if (direction === "UNKNOWN") return "NOT_TESTED";
  return "NEUTRAL";
}

function houseLord(natal: NatalChart, domain: Domain): string {
  return natal.houseLords[DOMAIN_HOUSE[domain] - 1];
}

/** Path C — natal promise from the domain house lord's condition (H.5). */
export function pathCFinding(natal: NatalChart, domain: Domain, eventKey: string | null = null): Finding {
  const house = DOMAIN_HOUSE[domain];
  const lord = houseLord(natal, domain);
  const c = natal.conditions.find((x) => x.body === lord)!;
  const result = resultFromDirection(c.direction);
  return {
    findingId: `PATH_C:${domain}:natal:${lord}`,
    techniqueId: "PATH_C_NATAL_PROMISE",
    domain,
    eventKey,
    requiredVarga: "D1",
    evidenceType: "natal_promise",
    validationStatus: "CLASSICAL_BEDROCK",
    result,
    strength: c.strength,
    independenceGroup: `natal:${lord}`,
    explanation: `${house}H lord ${lord} sits in house ${c.house} — dignity ${c.dignity ?? "n/a"}, condition score ${c.score} (${c.direction}, ${c.strength}).`,
    provenance: "Path C: domain-house lord condition (H.5)",
    knowledgeStatus: "CLASSICAL_BEDROCK",
    basis: "Path C is aspect-free; house occupants are not scored.",
  };
}

/** Path E — nakshatra dispositor of the domain house lord. */
export function pathEFinding(natal: NatalChart, domain: Domain, eventKey: string | null = null): Finding {
  const house = DOMAIN_HOUSE[domain];
  const lord = houseLord(natal, domain);
  const lp = natal.positions.find((p) => p.body === lord)!;
  const dispositor = lp.nakshatraLord;
  const group = [...new Set([`natal:${lord}`, `natal:${dispositor}`])].sort().join("|");

  if (dispositor === "Rahu" || dispositor === "Ketu") {
    return {
      findingId: `PATH_E:${domain}:${group}`,
      techniqueId: "PATH_E_NAKSHATRA_DISPOSITOR",
      domain,
      eventKey,
      requiredVarga: "D1",
      evidenceType: "nakshatra_dispositor",
      validationStatus: "TRADITION_SPECIFIC",
      result: "NOT_TESTED",
      strength: null,
      independenceGroup: group,
      explanation: `${lord} is in ${lp.nakshatra}-${lp.pada}, whose dispositor is the node ${dispositor}. Nodes carry no dignity in this system, so no score is fabricated.`,
      provenance: "Path E: nakshatra dispositor (H.2 node override)",
      knowledgeStatus: "UNKNOWN_NOT_TESTED",
      basis: "Node dispositors return UNKNOWN_NOT_TESTED by design.",
    };
  }

  const c = natal.conditions.find((x) => x.body === dispositor)!;
  const result = resultFromDirection(c.direction);
  return {
    findingId: `PATH_E:${domain}:${group}`,
    techniqueId: "PATH_E_NAKSHATRA_DISPOSITOR",
    domain,
    eventKey,
    requiredVarga: "D1",
    evidenceType: "nakshatra_dispositor",
    validationStatus: "CLASSICAL_BEDROCK",
    result,
    strength: c.strength,
    independenceGroup: group,
    explanation: `${lord} is in ${lp.nakshatra}-${lp.pada}; its dispositor ${dispositor} sits in house ${c.house} (score ${c.score}, ${c.direction}).`,
    provenance: "Path E: nakshatra dispositor condition (H.5)",
    knowledgeStatus: "CLASSICAL_BEDROCK",
    basis: dispositor === lord ? "Dispositor equals the lord — correlated with Path C." : undefined,
  };
}

export interface TransitSnapshot {
  body: string;
  signIndex: number;
  sign: string;
  retrograde: boolean;
}

/** Slow-mover transit positions at an instant (geocentric signs are location-independent). */
export function computeTransitSnapshot(asOfIso: string): TransitSnapshot[] {
  const [y, m, d] = asOfIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const eph = computeEphemeris(date, 0, 0);
  return SLOW_MOVERS.map((body) => {
    const b = eph.bodies[body];
    const signIndex = Math.floor(b.longitude / 30);
    return { body, signIndex, sign: SIGNS[signIndex], retrograde: b.retrograde };
  });
}

const WINDOW_CACHE = new Map<string, { start: string; end: string }>();

function signWindow(body: string, asOfIso: string, signIndex: number): { start: string; end: string } {
  const key = `${body}|${asOfIso}|${signIndex}`;
  const cached = WINDOW_CACHE.get(key);
  if (cached) return cached;
  const [y, m, d] = asOfIso.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d, 12);
  const signAt = (offsetDays: number): number => {
    const eph = computeEphemeris(new Date(base + offsetDays * 86400000), 0, 0);
    return Math.floor(eph.bodies[body].longitude / 30);
  };
  let back = 0;
  while (back < 1200 && signAt(-back) === signIndex) back += 1;
  let fwd = 0;
  while (fwd < 1200 && signAt(fwd) === signIndex) fwd += 1;
  const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
  const result = { start: iso(base - back * 86400000), end: iso(base + fwd * 86400000) };
  WINDOW_CACHE.set(key, result);
  return result;
}

const TRANSIT_CACHE = new Map<string, TransitInfo[]>();

export function computeTransits(natal: NatalChart, asOfIso: string): TransitInfo[] {
  const cacheKey = `${natal.moonSign}|${natal.ascendant.signIndex}|${asOfIso}`;
  const cached = TRANSIT_CACHE.get(cacheKey);
  if (cached) return cached;
  const moonSignIndex = SIGNS.indexOf(natal.moonSign);
  const ascSignIndex = natal.ascendant.signIndex;
  const snapshot = computeTransitSnapshot(asOfIso);
  const result = snapshot.map((t) => {
    const houseFromMoon = ((t.signIndex - moonSignIndex + 12) % 12) + 1;
    const houseFromLagna = ((t.signIndex - ascSignIndex + 12) % 12) + 1;
    const rule = GOCHARA[t.body];
    const isKetu = t.body === "Ketu";
    const favourable = isKetu ? null : rule.favourable.includes(houseFromMoon);
    const direction: TransitInfo["direction"] = isKetu ? "UNKNOWN" : favourable ? "SUPPORTS" : "OPPOSES";
    let note: string | undefined;
    if (t.body === "Saturn" && [12, 1, 2].includes(houseFromMoon)) {
      const phase = houseFromMoon === 12 ? "rising" : houseFromMoon === 1 ? "peak" : "setting";
      note = `Sade Sati (${phase} phase): Saturn transits the ${houseFromMoon}${houseFromMoon === 1 ? "st" : houseFromMoon === 2 ? "nd" : "th"} from the natal Moon.`;
    }
    if (t.retrograde) note = `${note ? `${note} ` : ""}Retrograde (qualifier only).`;
    return {
      body: t.body,
      sign: t.sign as TransitInfo["sign"],
      houseFromMoon,
      houseFromLagna,
      favourable,
      status: rule.status,
      direction,
      note,
      window: signWindow(t.body, asOfIso, t.signIndex),
    };
  });
  TRANSIT_CACHE.set(cacheKey, result);
  return result;
}

/** Path B — gochara transit finding for a domain, or null when no transit hits the domain house. */
export function pathBFinding(
  natal: NatalChart,
  domain: Domain,
  asOfIso: string,
  eventKey: string | null = null,
): Finding | null {
  const targetHouse = DOMAIN_HOUSE[domain];
  const transits = computeTransits(natal, asOfIso);
  const hit = transits.find((t) => t.houseFromMoon === targetHouse);
  if (!hit) return null;

  const strength: Strength = "MODERATE";
  const result: FindingResult = hit.direction === "UNKNOWN" ? "NOT_TESTED" : hit.direction === "SUPPORTS" ? "SUPPORTS" : "OPPOSES";
  const window = hit.window;
  return {
    findingId: `PATH_B:${domain}:natal:Moon|transit:${hit.body}:${hit.sign}`,
    techniqueId: "PATH_B_TRANSIT",
    domain,
    eventKey,
    requiredVarga: "D1",
    evidenceType: "gochara_transit",
    validationStatus: hit.status,
    result,
    strength: result === "NOT_TESTED" ? null : strength,
    independenceGroup: `natal:Moon|transit:${hit.body}:${hit.sign}`,
    explanation: `${hit.body} transits ${hit.sign} (${hit.houseFromMoon} from the natal Moon). ${hit.note ?? ""}`.trim(),
    provenance: "Path B: gochara, whole-sign, from natal Moon",
    knowledgeStatus: hit.body === "Ketu" ? "TRADITION_SPECIFIC" : "CLASSICAL_BEDROCK",
    basis: "Vedha not evaluated; Ashtakavarga not applied — strength capped below STRONG.",
    timing: window ? { start: window.start, end: window.end, label: `${hit.body} in ${hit.sign}` } : null,
  };
}

/** D9 marriage structure: D1 7th lord's dignity/house in D9. */
export function d9MarriageFinding(natal: NatalChart, eventKey: string | null = null): Finding {
  const lord = natal.houseLords[6];
  return vargaStructureFinding(natal, "relationships", lord, "D9", "D9_MARRIAGE_STRUCTURE", eventKey);
}

/** D7 children structure: D1 5th lord's dignity/house in D7. */
export function d7ChildrenFinding(natal: NatalChart, eventKey: string | null = null): Finding {
  const lord = natal.houseLords[4];
  return vargaStructureFinding(natal, "family", lord, "D7", "D7_CHILDREN_STRUCTURE", eventKey);
}

function vargaStructureFinding(
  natal: NatalChart,
  domain: Domain,
  lord: string,
  varga: "D9" | "D7",
  techniqueId: string,
  eventKey: string | null,
): Finding {
  const vargaSign = natal.varga[varga][lord];
  const vargaSignIndex = SIGNS.indexOf(vargaSign);
  const house = natal.vargaHouses[varga][lord];
  const dignity = dignityOfSign(lord, vargaSign);
  const score = dignityScore(dignity) + placementDelta(house);
  const result: FindingResult = score > 0 ? "SUPPORTS" : score < 0 ? "OPPOSES" : "NEUTRAL";
  const strength: Strength = Math.abs(score) <= 1 ? "WEAK" : Math.abs(score) === 2 ? "MODERATE" : "STRONG";
  return {
    findingId: `${techniqueId}:${domain}:${varga.toLowerCase()}:${lord}`,
    techniqueId,
    domain,
    eventKey,
    requiredVarga: varga,
    evidenceType: "varga_structure",
    validationStatus: "PROJECT_DESIGN_CHOICE",
    result,
    strength,
    independenceGroup: `${varga.toLowerCase()}:${lord}`,
    explanation: `D1 lord ${lord} falls in ${vargaSign} (${varga} house ${house}) — dignity ${dignity}, structure score ${score}.`,
    provenance: `${varga} structure technique (J.4); no combustion in vargas.`,
    knowledgeStatus: "PROJECT_DESIGN_CHOICE",
  };
}

function dignityOfSign(body: string, sign: string): string {
  try {
    return dignityOf(body, sign as never).dignity;
  } catch {
    return "Neutral";
  }
}

function dignityScore(dignity: string): number {
  return { Exalted: 2, Own: 1, Friendly: 1, Neutral: 0, Enemy: -1, Debilitated: -2 }[dignity] ?? 0;
}

function placementDelta(house: number): number {
  if ([1, 4, 7, 10, 5, 9].includes(house)) return 1;
  if ([6, 8, 12].includes(house)) return -1;
  return 0;
}

export const _norm360 = norm360;
