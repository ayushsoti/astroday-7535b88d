/** Golden fixture (Part L): Sahaj Sharma's chart with expected outputs. */

import type { BirthInput } from "./types";

export const SAHAJ_BIRTH: BirthInput = {
  name: "Sahaj Sharma",
  birthDate: "1998-10-12",
  birthTime: "16:00",
  placeText: "Haridwar, India",
  latitude: 29.95,
  longitude: 78.16,
  timezone: "Asia/Kolkata",
};

export const SAHAJ_ASCENDANT = 316.698;

export const SAHAJ_D1: Record<string, number> = {
  Sun: 175.056,
  Moon: 84.707,
  Mars: 129.164,
  Mercury: 186.672,
  Jupiter: 326.013,
  Venus: 170.483,
  Saturn: 7.219,
  Rahu: 124.825,
  Ketu: 304.825,
};

export const SAHAJ_RETROGRADE = ["Jupiter", "Saturn", "Rahu", "Ketu"];

export const SAHAJ_HOUSE_LORDS = [
  "Saturn", "Jupiter", "Mars", "Venus", "Mercury", "Moon",
  "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
];

export const SAHAJ_CONDITIONS: Record<string, { dignity: string; house: number; score: number; direction: string; strength: string }> = {
  Sun: { dignity: "Neutral", house: 8, score: -1, direction: "NEGATIVE", strength: "WEAK" },
  Moon: { dignity: "Friendly", house: 5, score: 2, direction: "POSITIVE", strength: "MODERATE" },
  Mars: { dignity: "Friendly", house: 7, score: 2, direction: "POSITIVE", strength: "MODERATE" },
  Mercury: { dignity: "Friendly", house: 9, score: 1, direction: "POSITIVE", strength: "WEAK" },
  Jupiter: { dignity: "Neutral", house: 1, score: 1, direction: "POSITIVE", strength: "WEAK" },
  Venus: { dignity: "Debilitated", house: 8, score: -4, direction: "NEGATIVE", strength: "STRONG" },
  Saturn: { dignity: "Debilitated", house: 3, score: -2, direction: "NEGATIVE", strength: "MODERATE" },
};

export const SAHAJ_D9: Record<string, string> = {
  Ascendant: "Pisces", Sun: "Leo", Moon: "Taurus", Mars: "Gemini", Mercury: "Sagittarius",
  Jupiter: "Taurus", Venus: "Cancer", Saturn: "Gemini", Rahu: "Taurus", Ketu: "Scorpio",
};

export const SAHAJ_D7: Record<string, string> = {
  Ascendant: "Taurus", Sun: "Leo", Moon: "Scorpio", Mars: "Libra", Mercury: "Scorpio",
  Jupiter: "Leo", Venus: "Cancer", Saturn: "Taurus", Rahu: "Virgo", Ketu: "Pisces",
};

export const SAHAJ_MD: [string, string, string][] = [
  ["Jupiter", "1998-10-12", "2009-02-15"],
  ["Saturn", "2009-02-15", "2028-02-16"],
  ["Mercury", "2028-02-16", "2045-02-15"],
  ["Ketu", "2045-02-15", "2052-02-15"],
  ["Venus", "2052-02-15", "2072-02-15"],
  ["Sun", "2072-02-15", "2078-02-15"],
];

export const SAHAJ_SATURN_ADS: [string, string][] = [
  ["Saturn", "2009-02-15"], ["Mercury", "2012-02-18"], ["Ketu", "2014-10-28"],
  ["Venus", "2015-12-07"], ["Sun", "2019-02-06"], ["Moon", "2020-01-19"],
  ["Mars", "2021-08-19"], ["Rahu", "2022-09-28"], ["Jupiter", "2025-08-04"],
];

export const SAHAJ_ACTIVE_2026_10_10 = { md: "Saturn", ad: "Jupiter", pd: "Ketu" };

export const OTHER_CHARTS: BirthInput[] = [
  { name: "Mumbai", birthDate: "1990-05-01", birthTime: "08:30", placeText: "Mumbai, India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { name: "London", birthDate: "2001-03-15", birthTime: "14:00", placeText: "London, UK", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
];
