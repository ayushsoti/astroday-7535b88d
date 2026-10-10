/**
 * Astro engine — locked constants.
 * Every value here is transcribed from the build spec (Parts G–K) and is
 * treated as immovable: the golden-chart test in engine.test.ts is the gate.
 */

export const ENGINE_VERSION = "astro-ts-1.0";

/* ------------------------------------------------------------------ G.3 */

/** Sidereal zodiac, Lahiri ayanamsha, whole-sign houses. */
export const ZODIAC = "SIDEREAL" as const;
export const AYANAMSHA = "LAHIRI" as const;
export const NODE_TYPE = "TRUE" as const;
export const HOUSE_SYSTEM = "WHOLE_SIGN" as const;

/**
 * Lahiri ayanamsha in degrees, as a function of T = Julian centuries from J2000.
 * Linear general-precession rate with a small secular term, anchored so the
 * model reproduces the golden fixture's 23.84003 deg at Sahaj's birth instant.
 */
export const AYANAMSHA_MODEL = {
  a0: 23.854046,
  a1: 1.3965,
  a2: 0.0003086,
} as const;

/** Sidereal bodies used in reasoning (outer planets are display-only). */
export const REASONING_BODIES = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;

/** Display-only bodies: shown in the chart, never used to score anything. */
export const DISPLAY_BODIES = ["Uranus", "Neptune", "Pluto"] as const;

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;
export type Sign = (typeof SIGNS)[number];

/* ------------------------------------------------------------------ G.4 */

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

/** 40/3 degrees per nakshatra; 10/3 degrees per pada. */
export const NAKSHATRA_SPAN = 40 / 3;
export const PADA_SPAN = 10 / 3;

export const NAK_LORDS = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
] as const;

/* ------------------------------------------------------------------ H.1 */

export const SIGN_LORD: Record<Sign, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

/* ------------------------------------------------------------------ H.2 */

export const EXALTED: Record<string, Sign> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mars: "Capricorn",
  Mercury: "Virgo",
  Jupiter: "Cancer",
  Venus: "Pisces",
  Saturn: "Libra",
};

export const DEBILITATED: Record<string, Sign> = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mars: "Cancer",
  Mercury: "Pisces",
  Jupiter: "Capricorn",
  Venus: "Virgo",
  Saturn: "Aries",
};

export const OWN_SIGNS: Record<string, Sign[]> = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
};

/** Naisargika (natural) relationships used for the dignity fallback. */
export const NATURAL_FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};

export const NATURAL_ENEMIES: Record<string, string[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};

/* ------------------------------------------------------------------ H.3 */

/** Combustion orbs in degrees, [direct, retrograde]. */
export const COMBUSTION_ORBS: Record<string, [number, number]> = {
  Moon: [12, 12],
  Mars: [17, 17],
  Mercury: [14, 12],
  Jupiter: [11, 11],
  Venus: [10, 8],
  Saturn: [15, 15],
};

/* ------------------------------------------------------------------ H.4 */

export const KENDRA = [1, 4, 7, 10];
export const TRIKONA = [1, 5, 9];
export const UPACHAYA = [3, 6, 10, 11];
export const DUSTHANA = [6, 8, 12];

/* ------------------------------------------------------------------ H.5 */

export const DIGNITY_SCORE: Record<string, number> = {
  Exalted: 2,
  Own: 1,
  Friendly: 1,
  Neutral: 0,
  Enemy: -1,
  Debilitated: -2,
};

/* ------------------------------------------------------------------ H.6 */

export const DOMAINS = [
  "career",
  "money",
  "property",
  "vehicle",
  "relationships",
  "family",
  "health",
  "education",
  "legal",
] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_HOUSE: Record<Domain, number> = {
  career: 10,
  money: 2,
  property: 4,
  vehicle: 4,
  relationships: 7,
  family: 2,
  health: 6,
  education: 5,
  legal: 6,
};

export const DOMAIN_NOTE: Record<Domain, string> = {
  career: "6/2/11 noted, not scored",
  money: "11 noted, not scored",
  property: "",
  vehicle: "shares 4th with property (classical)",
  relationships: "5th noted, not scored",
  family: "4 mother, 9 father, 5 children — event-level, not scored",
  health: "1 and 8 noted",
  education: "contested (2/4/5/9); 5 adopted",
  legal: "7/8/12 noted",
};

/* ------------------------------------------------------------------ I.1 */

export const DASHA_ORDER = [
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
  "Ketu",
  "Venus",
] as const;
export type DashaLord = (typeof DASHA_ORDER)[number];

export const DASHA_YEARS: Record<DashaLord, number> = {
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
  Ketu: 7,
  Venus: 20,
};

/** Locked convention: Gregorian day length. The 360-day convention is falsified. */
export const DAYS_PER_YEAR = 365.2425;

/* ------------------------------------------------------------------ J.3 */

export const GOCHARA: Record<string, { favourable: number[]; status: string; note?: string }> = {
  Jupiter: { favourable: [2, 5, 7, 9, 11], status: "CLASSICAL_BEDROCK" },
  Saturn: { favourable: [3, 6, 11], status: "CLASSICAL_BEDROCK" },
  Rahu: { favourable: [3, 6, 11], status: "WIDELY_USED_VARIANT" },
  Ketu: {
    favourable: [],
    status: "TRADITION_SPECIFIC",
    note: "contested (3,6,10,11 vs 3,6,11)",
  },
};

/** Fast movers are display-only until their gochara rules are sourced. */
export const FAST_MOVERS = ["Sun", "Moon", "Mars", "Mercury", "Venus"] as const;
export const SLOW_MOVERS = ["Jupiter", "Saturn", "Rahu", "Ketu"] as const;

/* ------------------------------------------------------------------ K.5 */

export const KNOWLEDGE_STATUSES = [
  "CLASSICAL_BEDROCK",
  "WIDELY_USED_VARIANT",
  "TRADITION_SPECIFIC",
  "PROJECT_DESIGN_CHOICE",
  "COMPUTED_FACT",
  "INTERPRETIVE_INFERENCE",
  "UNKNOWN_NOT_TESTED",
] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

/* ---------------------------------------------------------- O.2 ontology */

export const EVENT_KEYS: Record<Domain, string[]> = {
  career: [
    "job_change",
    "career_switch",
    "promotion",
    "business_launch",
    "business_expansion",
    "business_contraction",
  ],
  money: [
    "income_increase",
    "debt_closure",
    "debt_accumulation",
    "windfall",
    "financial_restructuring",
    "major_investment",
  ],
  property: ["property_purchase", "property_sale", "relocation"],
  vehicle: ["vehicle_purchase"],
  relationships: ["marriage", "engagement", "breakup", "reconciliation", "new_relationship"],
  family: ["child_birth", "family_conflict", "father_related_event", "mother_related_event"],
  health: ["health_event", "health_recovery"],
  education: ["education_start", "education_completion"],
  legal: ["legal_dispute", "legal_resolution"],
};

/* ------------------------------------------------------- S. known gaps */

export const LIMITATIONS = [
  "D10/D4 not computed generically (no verified classical rule for even-n vargas)",
  "D2, D3, D12, D16, D20, D24, D27, D30, D40, D45, D60 not sourced",
  "Sookshma dasha not available",
  "Vedha not evaluated; Sodhya not implemented",
  "Ashtakavarga is not applied to transit strength (Path B is capped below STRONG)",
  "Fast-planet gochara findings not sourced — fast movers are display-only",
  "Degree aspects / graha drishti not implemented (Path C/E are aspect-free)",
  "House occupants are not scored in Path C/E",
  "Yogas (Dhana, Parivartana, etc.) are not computed",
  "Path I convergence detector not built (the K.6 label is used instead)",
  "Independence groups use exact-string matching; Path E partially overlaps Path C",
  "Ketu favourable houses are contested — direction reported as UNKNOWN",
  "Moolatrikona is not implemented and is reported as Own",
  "Historical-observation registry is empty until calibration events are confirmed",
] as const;
