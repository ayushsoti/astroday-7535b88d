import { describe, expect, test } from "bun:test";
import { buildNatal } from "../natal";
import { activeDashaOn, buildDashaTimeline } from "../dasha";
import { SIGNS } from "../constants";
import {
  OTHER_CHARTS,
  SAHAJ_ACTIVE_2026_10_10,
  SAHAJ_ASCENDANT,
  SAHAJ_BIRTH,
  SAHAJ_CONDITIONS,
  SAHAJ_D1,
  SAHAJ_D7,
  SAHAJ_D9,
  SAHAJ_HOUSE_LORDS,
  SAHAJ_MD,
  SAHAJ_RETROGRADE,
  SAHAJ_SATURN_ADS,
} from "../fixture";

const chart = buildNatal(SAHAJ_BIRTH);
const byBody = (b: string) => chart.positions.find((p) => p.body === b)!;

describe("golden fixture: natal", () => {
  test("1. every body within 0.02 deg, retrograde flags match", () => {
    for (const [body, expected] of Object.entries(SAHAJ_D1)) {
      const lon = byBody(body).longitude;
      expect(Math.abs(lon - expected)).toBeLessThanOrEqual(0.02);
    }
    for (const p of chart.positions) {
      expect(p.retrograde).toBe(SAHAJ_RETROGRADE.includes(p.body));
    }
    expect(Math.abs(chart.ascendant.longitude - SAHAJ_ASCENDANT)).toBeLessThanOrEqual(0.02);
  });

  test("2. ascendant Aquarius; Moon Punarvasu pada 2", () => {
    expect(chart.ascendant.sign).toBe("Aquarius");
    expect(chart.moonSign).toBe("Gemini");
    expect(chart.moonNakshatra).toBe("Punarvasu");
    expect(chart.moonNakshatraPada).toBe(2);
  });

  test("3. house lords = L.3 (3rd = Mars)", () => {
    expect(chart.houseLords).toEqual(SAHAJ_HOUSE_LORDS);
    expect(chart.houseLords[2]).toBe("Mars");
  });

  test("4. planet conditions = L.4 exactly", () => {
    for (const [body, exp] of Object.entries(SAHAJ_CONDITIONS)) {
      const c = chart.conditions.find((x) => x.body === body)!;
      expect(c.dignity).toBe(exp.dignity);
      expect(c.house).toBe(exp.house);
      expect(c.score).toBe(exp.score);
      expect(c.direction).toBe(exp.direction);
      expect(c.strength).toBe(exp.strength);
    }
  });

  test("5. D9/D7 = L.6 exactly", () => {
    for (const [body, sign] of Object.entries(SAHAJ_D9)) expect(chart.varga.D9[body]).toBe(sign);
    for (const [body, sign] of Object.entries(SAHAJ_D7)) expect(chart.varga.D7[body]).toBe(sign);
  });

  test("11. Ashtakavarga totals 337 for Sahaj and two other charts", () => {
    for (const b of [SAHAJ_BIRTH, ...OTHER_CHARTS]) {
      const c = buildNatal(b);
      expect(c.ashtakavarga.grandTotal).toBe(337);
      expect(c.ashtakavarga.totals).toEqual({ Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39 });
      expect(c.ashtakavarga.invariantOk).toBe(true);
    }
  });

  test("13. reproducibility: same input twice -> identical", () => {
    const a = buildNatal(SAHAJ_BIRTH);
    const b = buildNatal(SAHAJ_BIRTH);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("14. isolation: other charts differ from Sahaj", () => {
    for (const b of OTHER_CHARTS) {
      const c = buildNatal(b);
      expect(c.ascendant.sign).not.toBe("Aquarius");
    }
  });
});

describe("golden fixture: vimshottari", () => {
  const timeline = buildDashaTimeline(chart.positions.find((p) => p.body === "Moon")!.longitude, "1998-10-12");

  test("6. Jupiter balance 10.348y; MDs per L.7", () => {
    expect(timeline.startLord).toBe("Jupiter");
    expect(Math.abs(timeline.balanceYears - 10.348)).toBeLessThan(0.01);
    for (const [lord, start, end] of SAHAJ_MD) {
      const md = timeline.mahadashas.find((m) => m.lord === lord)!;
      expect(md.start).toBe(start);
      expect(md.end).toBe(end);
    }
  });

  test("6b. Saturn AD boundaries match to the day", () => {
    const saturn = timeline.detailed.find((m) => m.lord === "Saturn")!;
    const ads = saturn.children!;
    for (const [lord, start] of SAHAJ_SATURN_ADS) {
      expect(ads.find((a) => a.lord === lord)!.start).toBe(start);
    }
  });

  test("7. active dasha 2026-10-10 = Saturn / Jupiter / Ketu", () => {
    const active = activeDashaOn(chart.positions.find((p) => p.body === "Moon")!.longitude, "1998-10-12", "2026-10-10");
    expect(active.md).toBe(SAHAJ_ACTIVE_2026_10_10.md);
    expect(active.ad).toBe(SAHAJ_ACTIVE_2026_10_10.ad);
    expect(active.pd).toBe(SAHAJ_ACTIVE_2026_10_10.pd);
  });
});

test("sanity: signs array", () => {
  expect(SIGNS[10]).toBe("Aquarius");
});
