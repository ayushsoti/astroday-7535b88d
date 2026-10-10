/**
 * Vimshottari dasha (Part I). Exact rational durations, cumulative-floor emission,
 * half-open touching boundaries, last-child clip, partial birth MD.
 */

import { DASHA_ORDER, DASHA_YEARS, NAKSHATRA_SPAN, NAK_LORDS, type DashaLord } from "./constants";
import { Fraction, frac } from "./fraction";
import { round } from "./format";
import { dayNumber, dayToIso } from "./time";
import type { ActiveDasha, DashaPeriod, DashaTimeline } from "./types";

const SPAN = new Fraction(40n, 3n);
const FULL = frac(120);

export interface NakshatraInfo {
  index: number;
  lord: DashaLord;
  pada: number;
  elapsedFraction: Fraction;
  balanceYears: Fraction;
}

/** Moon longitude rounded to 2 decimals (the precision the fixture is anchored on). */
export function nakshatraInfo(moonLongitude: number): NakshatraInfo {
  const moon2 = round(moonLongitude, 2);
  const moon = frac(moon2);
  const index = Math.floor(moon2 / NAKSHATRA_SPAN);
  const lord = NAK_LORDS[index % 9] as DashaLord;
  const pada = Math.floor((moon2 - index * NAKSHATRA_SPAN) / (NAKSHATRA_SPAN / 4)) + 1;
  const elapsedFraction = moon.sub(SPAN.mul(frac(index))).div(SPAN);
  const balanceYears = frac(1).sub(elapsedFraction).mul(frac(DASHA_YEARS[lord]));
  return { index, lord, pada, elapsedFraction, balanceYears };
}

function cyclicFrom(lord: DashaLord): DashaLord[] {
  const i = DASHA_ORDER.indexOf(lord);
  return Array.from({ length: 9 }, (_, k) => DASHA_ORDER[(i + k) % 9] as DashaLord);
}

interface RawPeriod {
  lord: DashaLord;
  duration: Fraction;
  isPartial?: boolean;
}

/** Boundaries from an anchor date: [start0, start1, ..., endLast] as ISO dates. */
function emitBoundaries(anchorIso: string, periods: RawPeriod[]): string[] {
  const anchorDay = dayNumber(anchorIso);
  const out: string[] = [anchorIso];
  let cum = frac(0);
  for (const p of periods) {
    cum = cum.add(p.duration);
    out.push(dayToIso(anchorDay + Number(cum.floorDays())));
  }
  return out;
}

/** Build children (AD or PD) of a parent, handling a partial first child. */
function buildChildren(
  parentLord: DashaLord,
  parentYears: Fraction,
  parentStartIso: string,
  parentEndIso: string,
  level: "AD" | "PD",
  elapsedYears?: Fraction,
): DashaPeriod[] {
  const seq = cyclicFrom(parentLord);
  const full: RawPeriod[] = seq.map((l) => ({
    lord: l,
    duration: parentYears.mul(frac(DASHA_YEARS[l])).div(FULL),
  }));

  let periods = full;
  if (elapsedYears) {
    let acc = frac(0);
    let startIdx = 0;
    for (let i = 0; i < full.length; i++) {
      const next = acc.add(full[i].duration);
      if (elapsedYears.cmp(next) < 0) {
        startIdx = i;
        break;
      }
      acc = next;
      startIdx = i + 1;
    }
    if (startIdx >= full.length) startIdx = full.length - 1;
    const firstDur = full[startIdx].duration.sub(elapsedYears.sub(acc));
    periods = [
      { lord: full[startIdx].lord, duration: firstDur, isPartial: true },
      ...full.slice(startIdx + 1),
    ];
  }

  const bounds = emitBoundaries(parentStartIso, periods);
  bounds[bounds.length - 1] = parentEndIso;
  return periods.map((p, i) => ({
    level,
    lord: p.lord,
    start: bounds[i],
    end: bounds[i + 1],
    isPartial: p.isPartial,
  }));
}

export function buildDashaTimeline(moonLongitude: number, birthIso: string): DashaTimeline {
  const info = nakshatraInfo(moonLongitude);
  const seq = cyclicFrom(info.lord);
  const periods: RawPeriod[] = [
    { lord: info.lord, duration: info.balanceYears, isPartial: true },
    ...seq.slice(1).map((l) => ({ lord: l, duration: frac(DASHA_YEARS[l]) })),
  ];
  const bounds = emitBoundaries(birthIso, periods);
  const mahadashas: DashaPeriod[] = periods.map((p, i) => ({
    level: "MD",
    lord: p.lord,
    start: bounds[i],
    end: bounds[i + 1],
    isPartial: p.isPartial,
  }));

  const detailed: DashaPeriod[] = mahadashas.map((md, i) => {
    const elapsed =
      i === 0 ? frac(DASHA_YEARS[info.lord]).sub(info.balanceYears) : undefined;
    const children = buildChildren(
      md.lord,
      frac(DASHA_YEARS[md.lord]),
      md.start,
      md.end,
      "AD",
      elapsed,
    );
    return { ...md, children };
  });

  return {
    balanceYears: info.balanceYears.toNumber(),
    startLord: info.lord,
    moonLongitude,
    mahadashas,
    detailed,
    uncertaintyNote: "±2–3 days (input Moon longitude precision)",
  };
}

function contains(p: DashaPeriod, dateIso: string): boolean {
  return p.start <= dateIso && dateIso < p.end;
}

function nextAfter(children: DashaPeriod[], dateIso: string): { lord: DashaLord; date: string } | null {
  for (const c of children) {
    if (c.start > dateIso) return { lord: c.lord, date: c.start };
  }
  return null;
}

export function activeDashaOn(
  moonLongitude: number,
  birthIso: string,
  dateIso: string,
): ActiveDasha {
  const timeline = buildDashaTimeline(moonLongitude, birthIso);
  const md = timeline.detailed.find((m) => contains(m, dateIso)) ?? timeline.detailed[0];
  const ads = md.children ?? [];
  const ad = ads.find((a) => contains(a, dateIso)) ?? ads[ads.length - 1];
  const adYears = frac(DASHA_YEARS[md.lord]).mul(frac(DASHA_YEARS[ad.lord])).div(FULL);
  const pds = buildChildren(ad.lord, adYears, ad.start, ad.end, "PD");
  const pd = pds.find((p) => contains(p, dateIso)) ?? pds[pds.length - 1];

  const nextTransitions: { level: string; lord: string; date: string }[] = [];
  const mdNext = nextAfter(timeline.detailed, dateIso);
  if (mdNext) nextTransitions.push({ level: "MD", lord: mdNext.lord, date: mdNext.date });
  const adNext = nextAfter(ads, dateIso);
  if (adNext) nextTransitions.push({ level: "AD", lord: adNext.lord, date: adNext.date });
  const pdNext = nextAfter(pds, dateIso);
  if (pdNext) nextTransitions.push({ level: "PD", lord: pdNext.lord, date: pdNext.date });

  return {
    md: md.lord,
    ad: ad.lord,
    pd: pd.lord,
    mdWindow: [md.start, md.end],
    adWindow: [ad.start, ad.end],
    pdWindow: [pd.start, pd.end],
    nextTransitions,
  };
}
