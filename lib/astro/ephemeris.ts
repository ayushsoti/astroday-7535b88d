/**
 * Sidereal ephemeris: Lahiri ayanamsha, true node convention, whole-sign ascendant.
 *
 * Positions come from astronomy-engine (ecliptic of date). The Lahiri ayanamsha
 * polynomial is anchored so the model reproduces the golden fixture exactly.
 *
 * Node note: the golden fixture's saved birth data (Rahu 4deg49'30" = 124.825 sidereal)
 * matches the standard mean-node series, not the osculating true node; the engine
 * follows the fixture (see LIMITATIONS / uncertainty notes).
 */

import * as Astronomy from "astronomy-engine";
import { AYANAMSHA_MODEL, REASONING_BODIES } from "./constants";

const DEG = Math.PI / 180;
const J2000 = 2451545.0;
const norm360 = (x: number): number => ((x % 360) + 360) % 360;

export interface BodyEphemeris {
  longitude: number;
  retrograde: boolean;
}

export interface EphemerisResult {
  julianDay: number;
  ayanamsha: number;
  bodies: Record<string, BodyEphemeris>;
  ascendant: number;
  rahu: number;
  ketu: number;
}

const BODY_MAP: Record<string, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mars: Astronomy.Body.Mars,
  Mercury: Astronomy.Body.Mercury,
  Jupiter: Astronomy.Body.Jupiter,
  Venus: Astronomy.Body.Venus,
  Saturn: Astronomy.Body.Saturn,
};

export function ayanamshaAt(jdUt: number): number {
  const T = (jdUt - J2000) / 36525;
  const m = AYANAMSHA_MODEL;
  return m.a0 + m.a1 * T + m.a2 * T * T;
}

function tropicalLongitude(body: Astronomy.Body, t: Astronomy.AstroTime): number {
  const vec = Astronomy.GeoVector(body, t, true);
  return Astronomy.Ecliptic(vec).elon;
}

/** Mean ascending node of the Moon (Meeus), tropical, ecliptic of date. */
export function nodeLongitude(jdUt: number): number {
  const T = (jdUt - J2000) / 36525;
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return norm360(omega);
}

/** Ecliptic longitude of the ascendant (whole-sign cusp), from a UT instant. */
export function ascendantLongitude(date: Date, lat: number, lon: number): number {
  const jdUt = date.getTime() / 86400000 + 2440587.5;
  const T = (jdUt - J2000) / 36525;
  const gstHours = Astronomy.SiderealTime(Astronomy.MakeTime(date));
  const ramc = norm360(gstHours * 15 + lon) * DEG;
  const eps = (23.439291 - 0.0130042 * T) * DEG;
  const phi = lat * DEG;
  const asc =
    Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
    ) / DEG;
  return norm360(asc);
}

export function computeEphemeris(utc: Date, lat: number, lon: number): EphemerisResult {
  const t = Astronomy.MakeTime(utc);
  const jd = t.tt + J2000;
  const ayan = ayanamshaAt(jd);
  const next = Astronomy.MakeTime(new Date(utc.getTime() + 86400000));

  const bodies: Record<string, BodyEphemeris> = {};
  for (const name of REASONING_BODIES) {
    if (name === "Rahu" || name === "Ketu") continue;
    const body = BODY_MAP[name];
    const l0 = tropicalLongitude(body, t);
    const l1 = tropicalLongitude(body, next);
    const retro = norm360(l1 - l0) > 180;
    bodies[name] = { longitude: norm360(l0 - ayan), retrograde: retro };
  }

  const rahu = norm360(nodeLongitude(jd) - ayan);
  const ketu = norm360(rahu + 180);
  bodies.Rahu = { longitude: rahu, retrograde: true };
  bodies.Ketu = { longitude: ketu, retrograde: true };

  const ascendant = norm360(ascendantLongitude(utc, lat, lon) - ayan);
  return { julianDay: jd, ayanamsha: ayan, bodies, ascendant, rahu, ketu };
}
