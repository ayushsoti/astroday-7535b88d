import { describe, expect, test } from "bun:test";
import { buildNatal } from "../natal";
import { pathBFinding, pathCFinding, pathEFinding, computeTransits, d9MarriageFinding, d7ChildrenFinding } from "../paths";
import { buildConflictReport, eventSpecificityOf } from "../conflict";
import { classify } from "../query";
import { analyze } from "../analyze";
import { registryOutcome } from "../registry";
import type { Domain } from "../constants";
import { SAHAJ_BIRTH } from "../fixture";

const natal = buildNatal(SAHAJ_BIRTH);
const AS_OF = "2026-10-10";

function ceReport(domain: Domain) {
  return buildConflictReport(domain, null, AS_OF, [pathCFinding(natal, domain), pathEFinding(natal, domain)]);
}

const EXPECTED_NET: Record<Domain, string> = {
  career: "SUPPORT",
  money: "CORRELATED_NON_INDEPENDENT",
  property: "CONFLICTED",
  vehicle: "CONFLICTED",
  relationships: "CONFLICTED",
  family: "CORRELATED_NON_INDEPENDENT",
  health: "SUPPORT",
  education: "SUPPORT",
  legal: "SUPPORT",
};

describe("evidence layer", () => {
  test("8. Path C/E net reads = L.5", () => {
    for (const [domain, expected] of Object.entries(EXPECTED_NET) as [Domain, string][]) {
      expect(ceReport(domain).netRead).toBe(expected);
    }
  });

  test("8b. health has 2 independent support groups; career 1 + unvalidated", () => {
    expect(ceReport("health").independentSupportGroupCount).toBe(2);
    expect(ceReport("career").independentSupportGroupCount).toBe(1);
    const careerGroups = ceReport("career").groups.map((g) => g.verdict);
    expect(careerGroups).toContain("UNVALIDATED");
  });

  test("9. node dispositor -> NOT_TESTED + UNKNOWN_NOT_TESTED, never a score", () => {
    const e = pathEFinding(natal, "career");
    expect(e.result).toBe("NOT_TESTED");
    expect(e.knowledgeStatus).toBe("UNKNOWN_NOT_TESTED");
    expect(e.strength).toBeNull();
  });

  test("10. Path B never STRONG; Sade Sati qualifier only; Ketu direction UNKNOWN", () => {
    const transits = computeTransits(natal, AS_OF);
    const ketu = transits.find((t) => t.body === "Ketu")!;
    expect(ketu.direction).toBe("UNKNOWN");
    for (const t of transits) {
      const f = pathBFinding(natal, "career", AS_OF);
      if (f) expect(f.strength === "STRONG").toBe(false);
    }
    const saturn = transits.find((t) => t.body === "Saturn")!;
    if ([12, 1, 2].includes(saturn.houseFromMoon)) expect(saturn.note ?? "").toContain("Sade Sati");
  });

  test("10b. D9/D7 structure findings exist and are varga-scoped", () => {
    const d9 = d9MarriageFinding(natal);
    expect(d9.requiredVarga).toBe("D9");
    const d7 = d7ChildrenFinding(natal);
    expect(d7.requiredVarga).toBe("D7");
  });

  test("12. event specificity: money support != debt_closure support", () => {
    const money = pathCFinding(natal, "money", null);
    expect(eventSpecificityOf([money])).toBe("NO_EVENT_LEVEL_SUPPORT");
    const withEvent = pathCFinding(natal, "money", "income_increase");
    expect(eventSpecificityOf([withEvent])).toBe("SINGLE_EVENT_SUPPORTED");
  });

  test("registry: every technique reports an explicit outcome", () => {
    const executed = new Set(["PATH_C_NATAL_PROMISE", "PATH_E_NAKSHATRA_DISPOSITOR"]);
    expect(registryOutcome("PATH_C_NATAL_PROMISE", "career", executed)).toBe("EXECUTED");
    expect(registryOutcome("VIMSHOTTARI_SOOKSHMA", "career", executed)).toBe("NOT_IMPLEMENTED");
    expect(registryOutcome("D9_MARRIAGE_STRUCTURE", "career", executed)).toBe("NOT_APPLICABLE_TO_DOMAIN");
    expect(registryOutcome("NOT_A_REAL_TECHNIQUE", "career", executed)).toBe("NOT_IN_REGISTRY");
  });

  test("21. Hinglish routing matches Part O.3", () => {
    const cases: [string, string, string | null][] = [
      ["bhai aaj kya karu?", "DAILY DECISION", null],
      ["loan close kar du?", "MONEY / DEBT", "debt_closure"],
      ["job change karu?", "CAREER / BUSINESS", null],
      ["kab shaadi hogi?", "MARRIAGE / RELATIONSHIP", "marriage"],
      ["kab ghar lunga?", "PROPERTY", "property_purchase"],
      ["kab gaadi lunga?", "VEHICLE", "vehicle_purchase"],
      ["business ka kya karu?", "BUSINESS", null],
    ];
    for (const [q, category, eventKey] of cases) {
      const ctx = classify(q);
      expect(ctx.category).toBe(category);
      expect(ctx.eventKey).toBe(eventKey);
      expect(ctx.language).toBe("hinglish");
    }
  });

  test("analyze: full pipeline for a marriage question", () => {
    const res = analyze({ birth: SAHAJ_BIRTH, asOf: AS_OF, question: "kab shaadi hogi?" });
    expect(res.query.category).toBe("MARRIAGE / RELATIONSHIP");
    expect(res.query.domains).toEqual(["relationships"]);
    expect(res.activeDasha.md).toBe("Saturn");
    expect(res.conflictReports[0].netRead).toBe("CONFLICTED");
    expect(res.techniqueRegistry.length).toBeGreaterThan(0);
    expect(res.limitations.length).toBeGreaterThan(0);
  });
});
