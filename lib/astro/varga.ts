/**
 * Divisional charts (vargas). Only D9 and D7 are generic (Parashari uniform division).
 * Even-n vargas are NOT_AVAILABLE by design (the uniform formula is provably wrong for them).
 */

import { SIGNS, type Sign } from "./constants";

export type VargaKind = "D1" | "D9" | "D7";

export const AVAILABLE_VARGAS: VargaKind[] = ["D1", "D9", "D7"];

export function isVargaAvailable(kind: string): kind is VargaKind {
  return kind === "D1" || kind === "D9" || kind === "D7";
}

/** Uniform-division varga sign for n in {9, 7}. */
export function vargaSign(signIndex: number, degreeInSign: number, n: 9 | 7): Sign {
  const pada = Math.floor((degreeInSign * n) / 30);
  return SIGNS[(signIndex * n + pada) % 12];
}

/** House number (1..12) of a varga sign counted from the varga ascendant. */
export function vargaHouse(vargaAscIndex: number, vargaSignIndex: number): number {
  return ((vargaSignIndex - vargaAscIndex + 12) % 12) + 1;
}

export interface VargaResult {
  D9: Record<string, Sign>;
  D7: Record<string, Sign>;
  vargaHouses: { D9: Record<string, number>; D7: Record<string, number> };
}

export function computeVargas(
  entries: { body: string; signIndex: number; degreeInSign: number }[],
): VargaResult {
  const D9: Record<string, Sign> = {};
  const D7: Record<string, Sign> = {};
  for (const e of entries) {
    D9[e.body] = vargaSign(e.signIndex, e.degreeInSign, 9);
    D7[e.body] = vargaSign(e.signIndex, e.degreeInSign, 7);
  }
  const ascD9 = SIGNS.indexOf(D9.Ascendant);
  const ascD7 = SIGNS.indexOf(D7.Ascendant);
  const D9h: Record<string, number> = {};
  const D7h: Record<string, number> = {};
  for (const e of entries) {
    D9h[e.body] = vargaHouse(ascD9, SIGNS.indexOf(D9[e.body]));
    D7h[e.body] = vargaHouse(ascD7, SIGNS.indexOf(D7[e.body]));
  }
  return { D9, D7, vargaHouses: { D9: D9h, D7: D7h } };
}
