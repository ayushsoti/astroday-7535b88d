import type { Domain, DashaLord, KnowledgeStatus, Sign } from "./constants";

/* --------------------------------------------------------------- G.2/G.3 */

export interface BirthInput {
  name: string;
  /** Local civil date, YYYY-MM-DD. */
  birthDate: string;
  /** Local civil time, HH:MM (24h). */
  birthTime: string;
  placeText: string;
  latitude: number;
  longitude: number;
  /** IANA zone, e.g. Asia/Kolkata. */
  timezone: string;
}

export interface BirthIdentity {
  name: string;
  birthUtc: string;
  place: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface Position {
  body: string;
  /** Absolute sidereal longitude, 0–360. */
  longitude: number;
  sign: Sign;
  signIndex: number;
  degreeInSign: number;
  /** Formatted as D°M'S". */
  degreeText: string;
  retrograde: boolean;
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  nakshatraLord: string;
  house: number;
  displayOnly: boolean;
}

export interface DignityResult {
  dignity: "Exalted" | "Debilitated" | "Own" | "Friendly" | "Neutral" | "Enemy";
  reason: string;
}

export interface ConditionPart {
  label: string;
  value: number;
  detail: string;
}

export type Direction =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL_INTENSITY"
  | "MIXED"
  | "UNKNOWN";

export type Strength = "WEAK" | "MODERATE" | "STRONG";

export interface PlanetCondition {
  body: string;
  dignity: DignityResult["dignity"] | null;
  dignityReason: string;
  combust: boolean;
  combustionOrb: number | null;
  sunSeparation: number | null;
  house: number;
  parts: ConditionPart[];
  score: number;
  direction: Direction;
  strength: Strength;
  houseCategories: string[];
}

/* ------------------------------------------------------------------- G.5 */

export interface NatalChart {
  ascendant: Position;
  positions: Position[];
  /** House number → sign occupying it. */
  houseSigns: Sign[];
  /** House number → ruling planet. */
  houseLords: string[];
  conditions: PlanetCondition[];
  varga: { D9: Record<string, Sign>; D7: Record<string, Sign> };
  vargaHouses: { D9: Record<string, number>; D7: Record<string, number> };
  ashtakavarga: AshtakavargaResult;
  moonSign: Sign;
  moonNakshatra: string;
  moonNakshatraPada: number;
  ayanamsha: number;
  julianDay: number;
}

/* ------------------------------------------------------- I. dasha periods */

export interface DashaPeriod {
  level: "MD" | "AD" | "PD";
  lord: DashaLord;
  start: string;
  /** Half-open: equals the next period's start. */
  end: string;
  isPartial?: boolean;
  children?: DashaPeriod[];
}

export interface DashaTimeline {
  balanceYears: number;
  startLord: DashaLord;
  moonLongitude: number;
  mahadashas: DashaPeriod[];
  /** MD list with AD children and the current MD's PD children. */
  detailed: DashaPeriod[];
  uncertaintyNote: string;
}

export interface ActiveDasha {
  md: DashaLord;
  ad: DashaLord;
  pd: DashaLord | null;
  mdWindow: [string, string];
  adWindow: [string, string];
  pdWindow: [string, string] | null;
  nextTransitions: { level: string; lord: string; date: string }[];
}

/* ----------------------------------------------------------------- J/K */

export type FindingResult =
  | "SUPPORTS"
  | "OPPOSES"
  | "NEUTRAL"
  | "NO_RELEVANT_ACTIVATION"
  | "UNAVAILABLE"
  | "NOT_TESTED";

export type GroupVerdict =
  | "SUPPORT"
  | "OPPOSES"
  | "NEUTRAL"
  | "CORRELATED_NON_INDEPENDENT"
  | "CONFLICTED"
  | "UNVALIDATED"
  | "UNAVAILABLE";

export type NetRead = GroupVerdict;

export interface Finding {
  findingId: string;
  techniqueId: string;
  domain: Domain;
  eventKey: string | null;
  requiredVarga: "D1" | "D9" | "D7";
  evidenceType: string;
  validationStatus: string;
  result: FindingResult;
  strength: Strength | null;
  independenceGroup: string;
  explanation: string;
  provenance: string;
  knowledgeStatus: KnowledgeStatus;
  basis?: string;
  timing?: { start: string; end: string; label: string } | null;
}

export interface ConflictGroup {
  independenceGroup: string;
  verdict: GroupVerdict;
  findings: string[];
}

export interface ConflictReport {
  domain: Domain;
  eventKey: string | null;
  evaluationDate: string;
  groups: ConflictGroup[];
  netRead: NetRead;
  independentSupportGroupCount: number;
  independentOpposeGroupCount: number;
  correlatedGroupCount: number;
  notes: string[];
  findings: Finding[];
}

export type ConvergenceLabel =
  | "HIGH CONVERGENCE"
  | "MODERATE CONVERGENCE"
  | "LOW CONVERGENCE"
  | "CONFLICTED"
  | "INSUFFICIENT DATA";

export type EventSpecificity =
  | "NO_EVENT_LEVEL_SUPPORT"
  | "SINGLE_EVENT_SUPPORTED"
  | "MULTIPLE_EVENTS_SUPPORTED";

export interface AshtakavargaResult {
  convention: string;
  bhinna: Record<string, number[]>;
  sarva: number[];
  totals: Record<string, number>;
  grandTotal: number;
  invariantOk: boolean;
}

/* ----------------------------------------------------------- F. /engine */

export interface AnalyzeRequest {
  birth: BirthInput;
  asOf: string;
  question?: string;
  domains?: Domain[];
  eventKey?: string | null;
  debug?: boolean;
}

export interface QueryContext {
  question: string;
  category: string;
  domains: Domain[];
  eventKey: string | null;
  language: "english" | "hinglish";
  notes: string[];
}

export interface TransitInfo {
  body: string;
  sign: Sign;
  houseFromMoon: number;
  houseFromLagna: number;
  favourable: boolean | null;
  status: string;
  direction: "SUPPORTS" | "OPPOSES" | "UNKNOWN";
  note?: string;
  window: { start: string; end: string } | null;
}

/* ---------------------------------------------- P. guidance (why/long/do) */

export interface GuidanceCause {
  step: string;
  basis: string;
}

export interface GuidanceAction {
  planet: string;
  theme: string;
  daily: string[];
  traditional: string[];
  caution: string;
}

export interface GuidanceDomainAction {
  domain: string;
  house: number;
  steps: string[];
}

export interface Guidance {
  why: GuidanceCause[];
  duration: { headline: string; window: { start: string; end: string }; caveat: string };
  actions: GuidanceAction[];
  domainActions: GuidanceDomainAction[];
  note: string;
}

export interface AnalyzeResponse {
  engineVersion: string;
  calculationMetadata: {
    engineVersion: string;
    ayanamsha: string;
    ayanamshaValue: number;
    node: string;
    houseSystem: string;
  };
  birthIdentity: BirthIdentity;
  query: QueryContext;
  natal: NatalChart;
  activeDasha: ActiveDasha;
  timingWindows: {
    basis: string;
    label: string;
    start: string;
    end: string;
    caveat: string;
  }[];
  transits: TransitInfo[];
  conflictReports: ConflictReport[];
  eventSpecificity: EventSpecificity;
  convergenceLabel: ConvergenceLabel;
  knowledgeStatusSummary: Record<string, number>;
  uncertaintyNotes: string[];
  supportingFindingIds: string[];
  limitations: string[];
  techniqueRegistry: { techniqueId: string; outcome: string }[];
  guidance: Guidance;
}
