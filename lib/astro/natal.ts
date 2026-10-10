/**
 * Natal chart assembly (Part G): positions, nakshatra-pada + lord, whole-sign houses,
 * house lords, planet conditions, D9/D7, Ashtakavarga.
 */

import {
  NAKSHATRA_SPAN,
  NAK_LORDS,
  NAKSHATRAS,
  PADA_SPAN,
  SIGNS,
  SIGN_LORD,
  type Sign,
} from "./constants";
import { buildCondition } from "./primitives";
import { computeEphemeris } from "./ephemeris";
import { computeVargas } from "./varga";
import { computeAshtakavarga } from "./ashtakavarga";
import { formatDms } from "./format";
import { zonedToUtc } from "./time";
import { resolvePlace } from "./place";
import type { BirthInput, NatalChart, Position } from "./types";

const norm360 = (x: number): number => ((x % 360) + 360) % 360;

function buildPosition(body: string, longitude: number, retrograde: boolean, ascSignIndex: number): Position {
  const lon = norm360(longitude);
  const signIndex = Math.floor(lon / 30);
  const degreeInSign = lon - signIndex * 30;
  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN);
  const pada = Math.floor((lon - nakshatraIndex * NAKSHATRA_SPAN) / PADA_SPAN) + 1;
  const house = ((signIndex - ascSignIndex + 12) % 12) + 1;
  return {
    body,
    longitude: lon,
    sign: SIGNS[signIndex],
    signIndex,
    degreeInSign,
    degreeText: formatDms(degreeInSign),
    retrograde,
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraIndex,
    pada,
    nakshatraLord: NAK_LORDS[nakshatraIndex % 9],
    house,
    displayOnly: body === "Uranus" || body === "Neptune" || body === "Pluto",
  };
}

export interface ResolvedBirth {
  input: BirthInput;
  utc: Date;
  utcIso: string;
}

export function resolveBirth(input: BirthInput): ResolvedBirth {
  const utc = zonedToUtc(input.birthDate, input.birthTime, input.timezone);
  return { input, utc, utcIso: utc.toISOString().replace(".000Z", "Z") };
}

export function buildNatal(input: BirthInput): NatalChart {
  const { utc } = resolveBirth(input);
  const eph = computeEphemeris(utc, input.latitude, input.longitude);

  const ascSignIndex = Math.floor(eph.ascendant / 30);
  const ascendant = buildPosition("Ascendant", eph.ascendant, false, ascSignIndex);

  const order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const positions = order.map((body) => {
    const b = eph.bodies[body];
    return buildPosition(body, b.longitude, b.retrograde, ascSignIndex);
  });

  const houseSigns: Sign[] = Array.from({ length: 12 }, (_, i) => SIGNS[(ascSignIndex + i) % 12]);
  const houseLords: string[] = houseSigns.map((s) => SIGN_LORD[s]);

  const sunLon = eph.bodies.Sun.longitude;
  const conditions = positions.map((p) =>
    buildCondition(p.body, p.sign, p.house, p.longitude, sunLon, p.retrograde),
  );

  const vargaEntries = [
    { body: "Ascendant", signIndex: ascendant.signIndex, degreeInSign: ascendant.degreeInSign },
    ...positions.map((p) => ({ body: p.body, signIndex: p.signIndex, degreeInSign: p.degreeInSign })),
  ];
  const varga = computeVargas(vargaEntries);

  const moon = positions.find((p) => p.body === "Moon")!;
  const ashtakavarga = computeAshtakavarga({
    ...Object.fromEntries(positions.map((p) => [p.body, p.signIndex])),
    Lagna: ascendant.signIndex,
  });

  return {
    ascendant,
    positions,
    houseSigns,
    houseLords,
    conditions,
    varga: { D9: varga.D9, D7: varga.D7 },
    vargaHouses: varga.vargaHouses,
    ashtakavarga,
    moonSign: moon.sign,
    moonNakshatra: moon.nakshatra,
    moonNakshatraPada: moon.pada,
    ayanamsha: eph.ayanamsha,
    julianDay: eph.julianDay,
  };
}

/** Resolve a place query and produce a full BirthInput. Throws typed place errors. */
export function birthFromPlace(
  name: string,
  birthDate: string,
  birthTime: string,
  placeText: string,
): BirthInput {
  const place = resolvePlace(placeText);
  return {
    name,
    birthDate,
    birthTime,
    placeText: `${place.name}, ${place.country}`,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  };
}
