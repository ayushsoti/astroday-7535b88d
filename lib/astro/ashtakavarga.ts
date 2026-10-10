/**
 * Ashtakavarga (Part J.5). Bhinnashtakavarga per planet + Sarvashtakavarga.
 * Tables follow BPHS Ch. 66 (consensus transcription). Invariant totals are
 * chart-independent: Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52,
 * Saturn 39 = 337. Ashtakavarga is computed and displayed but NOT evidence-wired.
 */

import type { AshtakavargaResult } from "./types";

export const CONTRIBUTORS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Lagna",
] as const;
export type Contributor = (typeof CONTRIBUTORS)[number];

export const ASHTAKA_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
] as const;
export type AshtakaPlanet = (typeof ASHTAKA_PLANETS)[number];

export const EXPECTED_TOTALS: Record<AshtakaPlanet, number> = {
  Sun: 48,
  Moon: 49,
  Mars: 39,
  Mercury: 54,
  Jupiter: 56,
  Venus: 52,
  Saturn: 39,
};

type Rows = Record<Contributor, number[]>;

/** Houses (counted from the contributor's sign) that receive a bindu. */
export const BAV_TABLES: Record<AshtakaPlanet, Rows> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 2, 4, 7, 8, 10, 11],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

export const CONVENTIONS = ["vedastro_pdfcoffee_consensus", "pyjhora_pvr_rao"] as const;
export type AshtakavargaConvention = (typeof CONVENTIONS)[number];

export function computeAshtakavarga(
  signIndexByBody: Record<string, number>,
  convention: AshtakavargaConvention = "vedastro_pdfcoffee_consensus",
): AshtakavargaResult {
  const bhinna: Record<string, number[]> = {};
  const totals: Record<string, number> = {};

  for (const planet of ASHTAKA_PLANETS) {
    const counts = new Array<number>(12).fill(0);
    for (const c of CONTRIBUTORS) {
      const cSign = signIndexByBody[c];
      if (cSign === undefined) continue;
      for (const h of BAV_TABLES[planet][c]) {
        counts[(cSign + h - 1) % 12] += 1;
      }
    }
    bhinna[planet] = counts;
    totals[planet] = counts.reduce((a, b) => a + b, 0);
  }

  const sarva = new Array<number>(12).fill(0);
  for (const p of ASHTAKA_PLANETS) {
    for (let i = 0; i < 12; i++) sarva[i] += bhinna[p][i];
  }
  const grandTotal = sarva.reduce((a, b) => a + b, 0);

  const invariantOk =
    grandTotal === 337 &&
    ASHTAKA_PLANETS.every((p) => totals[p] === EXPECTED_TOTALS[p]);

  return { convention, bhinna, sarva, totals, grandTotal, invariantOk };
}
