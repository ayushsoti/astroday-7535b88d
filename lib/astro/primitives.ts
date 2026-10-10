/**
 * Classical primitives: dignity (H.2), combustion (H.3), house categories (H.4),
 * planet condition score (H.5). All shared by Path C and Path E.
 */

import {
  COMBUSTION_ORBS,
  DEBILITATED,
  DIGNITY_SCORE,
  DUSTHANA,
  EXALTED,
  KENDRA,
  NATURAL_ENEMIES,
  NATURAL_FRIENDS,
  OWN_SIGNS,
  SIGN_LORD,
  TRIKONA,
  type Sign,
} from "./constants";
import type { ConditionPart, Direction, DignityResult, PlanetCondition, Strength } from "./types";

const norm360 = (x: number): number => ((x % 360) + 360) % 360;

export type DignityName = DignityResult["dignity"];

export function dignityOf(body: string, sign: Sign): DignityResult {
  if (body === "Rahu" || body === "Ketu") {
    throw new Error(`dignityOf: nodes have no dignity (${body})`);
  }
  if (EXALTED[body] === sign) return { dignity: "Exalted", reason: `exalted in ${sign}` };
  if (DEBILITATED[body] === sign) return { dignity: "Debilitated", reason: `debilitated in ${sign}` };
  if (OWN_SIGNS[body]?.includes(sign)) return { dignity: "Own", reason: `own sign ${sign}` };
  const lord = SIGN_LORD[sign];
  if ((NATURAL_FRIENDS[body] ?? []).includes(lord)) {
    return { dignity: "Friendly", reason: `${lord} is a natural friend of ${body}` };
  }
  if ((NATURAL_ENEMIES[body] ?? []).includes(lord)) {
    return { dignity: "Enemy", reason: `${lord} is a natural enemy of ${body}` };
  }
  return { dignity: "Neutral", reason: `${lord} is neutral to ${body}` };
}

export function angularSeparation(a: number, b: number): number {
  const d = Math.abs(norm360(a - b));
  return d > 180 ? 360 - d : d;
}

export interface CombustionResult {
  combust: boolean;
  orb: number | null;
  separation: number | null;
}

export function combustionOf(
  body: string,
  bodyLon: number,
  sunLon: number,
  retrograde: boolean,
): CombustionResult {
  if (body === "Sun" || body === "Rahu" || body === "Ketu") {
    return { combust: false, orb: null, separation: null };
  }
  const orbs = COMBUSTION_ORBS[body];
  if (!orbs) return { combust: false, orb: null, separation: null };
  const orb = retrograde ? orbs[1] : orbs[0];
  const sep = angularSeparation(bodyLon, sunLon);
  return { combust: sep <= orb, orb, separation: sep };
}

export function houseCategories(house: number): string[] {
  const cats: string[] = [];
  if (KENDRA.includes(house)) cats.push("Kendra");
  if (TRIKONA.includes(house)) cats.push("Trikona");
  if (DUSTHANA.includes(house)) cats.push("Dusthana");
  return cats;
}

function placementDelta(house: number): number {
  if (KENDRA.includes(house) || TRIKONA.includes(house)) return 1;
  if (DUSTHANA.includes(house)) return -1;
  return 0;
}

export function strengthFromScore(score: number): Strength {
  const a = Math.abs(score);
  if (a <= 1) return "WEAK";
  if (a === 2) return "MODERATE";
  return "STRONG";
}

export interface ConditionInput {
  body: string;
  dignity: DignityName;
  combust: boolean;
  house: number;
}

export function conditionOf(input: ConditionInput): {
  parts: ConditionPart[];
  score: number;
  direction: Direction;
  strength: Strength;
  categories: string[];
} {
  const parts: ConditionPart[] = [];
  const dScore = DIGNITY_SCORE[input.dignity] ?? 0;
  parts.push({ label: "dignity", value: dScore, detail: input.dignity });
  const cScore = input.body === "Sun" ? 0 : input.combust ? -1 : 0;
  parts.push({ label: "combustion", value: cScore, detail: input.combust ? "combust" : "not combust" });
  const pScore = placementDelta(input.house);
  parts.push({ label: "placement", value: pScore, detail: `house ${input.house}` });

  const score = parts.reduce((s, p) => s + p.value, 0);
  let direction: Direction;
  if (score > 0) direction = "POSITIVE";
  else if (score < 0) direction = "NEGATIVE";
  else if (parts.every((p) => p.value === 0)) direction = "NEUTRAL_INTENSITY";
  else direction = "MIXED";
  return { parts, score, direction, strength: strengthFromScore(score), categories: houseCategories(input.house) };
}

export function buildCondition(
  body: string,
  sign: Sign,
  house: number,
  bodyLon: number,
  sunLon: number,
  retrograde: boolean,
): PlanetCondition {
  const node = body === "Rahu" || body === "Ketu";
  const dig: DignityResult = node ? { dignity: "Neutral", reason: "nodes carry no dignity" } : dignityOf(body, sign);
  const comb = node
    ? { combust: false, orb: null, separation: null }
    : combustionOf(body, bodyLon, sunLon, retrograde);
  const c = conditionOf({ body, dignity: dig.dignity, combust: comb.combust, house });
  return {
    body,
    dignity: node ? null : dig.dignity,
    dignityReason: dig.reason,
    combust: comb.combust,
    combustionOrb: comb.orb,
    sunSeparation: comb.separation,
    house,
    parts: c.parts,
    score: c.score,
    direction: c.direction,
    strength: c.strength,
    houseCategories: c.categories,
  };
}
