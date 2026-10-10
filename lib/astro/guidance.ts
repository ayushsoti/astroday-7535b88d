/**
 * Deterministic guidance layer (Part P support).
 *
 * Turns engine output into the three things a person actually asks for:
 *   1. WHY this is happening  — the causal chain (natal promise → period → trigger)
 *   2. HOW LONG               — the controlling window, with its caveat
 *   3. WHAT TO DO             — concrete daily-life actions + customary measures
 *
 * Everything here is computed from values the engine already produced. The LLM
 * may explain these, but it must not invent remedies — so the material is fixed
 * here, not improvised in prose.
 */

import type { AnalyzeResponse, Guidance, GuidanceCause, GuidanceAction, GuidanceDomainAction } from "./types";
import { DOMAIN_HOUSE, type Domain } from "./constants";

/* ---------------------------------------------------------------- P.2 sets */

/**
 * Planet → practical and customary measures.
 *
 * `daily` steps are ordinary life adjustments anyone can start this week.
 * `traditional` steps are customary Vedic upaya, labelled as tradition-specific.
 * `caution` is the honest caveat for each (e.g. gemstones are contested).
 */
const PLANET_MEASURES: Record<
  string,
  { theme: string; daily: string[]; traditional: string[]; caution: string }
> = {
  Sun: {
    theme: "authority, confidence, visibility, father-figures",
    daily: [
      "Set a fixed morning routine and keep one visible commitment consistently.",
      "Handle dealings with bosses, officials and elders directly and respectfully.",
      "Note where you feel unseen and take one concrete step to be accountable for it.",
    ],
    traditional: [
      "Offer water to the rising Sun and give wheat or jaggery in charity.",
      "Recite the Aditya Hridayam or a Sun mantra on Sundays.",
    ],
    caution: "Ruby is traditionally linked to the Sun but is contested; do not wear one without an astrologer's read.",
  },
  Moon: {
    theme: "emotions, mind, sleep, home, mother-figures",
    daily: [
      "Protect a consistent sleep schedule and cut late-night screen time.",
      "Name your feelings in writing before reacting to a difficult message.",
      "Spend regular, unhurried time at home with the people you trust.",
    ],
    traditional: [
      "Give rice or milk in charity, especially on Mondays.",
      "Offer water or milk to Shiva; keep white items as a gentle reminder.",
    ],
    caution: "Pearl is linked to the Moon but is contested; treat it as optional, not a fix.",
  },
  Mars: {
    theme: "drive, courage, conflict, property, siblings",
    daily: [
      "Channel restlessness into daily physical exercise or sport.",
      "Pause before arguments; decide one rule you will not break when angry.",
      "Break big goals into a weekly physical action, not just planning.",
    ],
    traditional: [
      "Give red lentils (masoor dal) in charity; recite the Hanuman Chalisa on Tuesdays.",
      "Avoid starting confrontations on impulse.",
    ],
    caution: "Red coral is associated with Mars but is contested and can overheat a strong Mars.",
  },
  Mercury: {
    theme: "speech, learning, trade, paperwork, negotiation",
    daily: [
      "Put agreements and money in writing; keep your records tidy.",
      "Practise one negotiation or communication skill deliberately each week.",
      "Read or study something that sharpens a skill you use at work.",
    ],
    traditional: [
      "Give green moong in charity; recite a Vishnu mantra on Wednesdays.",
      "Keep your accounts and promises clear and honest.",
    ],
    caution: "Emerald is linked to Mercury but is contested; verify before any purchase.",
  },
  Jupiter: {
    theme: "wisdom, growth, mentors, ethics, finances",
    daily: [
      "Seek a mentor or a course that raises your judgement, not just your income.",
      "Act generously once a week — time, advice or money.",
      "Review a big decision against your values, not only the upside.",
    ],
    traditional: [
      "Give turmeric or chana dal in charity; honour teachers and elders on Thursdays.",
      "Recite a Guru or Vishnu mantra.",
    ],
    caution: "Yellow sapphire is linked to Jupiter but is contested; it is not a shortcut to growth.",
  },
  Venus: {
    theme: "relationships, comfort, art, values, money-pleasure",
    daily: [
      "Give relationships consistent, unglamorous attention: time, listening, small gestures.",
      "Cut one comfort that has become a drain (spending, indulgence, avoidance).",
      "Make room for art, beauty or rest that restores you.",
    ],
    traditional: [
      "Give white sweets or rice in charity; honour Lakshmi on Fridays.",
      "Keep your promises in relationships scrupulously.",
    ],
    caution: "Diamond is linked to Venus but is contested; it is not a substitute for relationship work.",
  },
  Saturn: {
    theme: "discipline, patience, delay, service, hard structure",
    daily: [
      "Commit to one disciplined routine and keep it even when it feels unrewarded.",
      "Serve someone who cannot repay you — elderly, ill or struggling.",
      "Stop shortcutting; do the honest, slower version of the task.",
      "Treat delay as a build-up phase and document your steady progress.",
    ],
    traditional: [
      "Give black sesame, iron, oil or blankets in charity; recite the Shani mantra on Saturdays.",
      "Practise honesty and avoid deception of any kind.",
    ],
    caution: "Blue sapphire is strongly contested and can misfire; never wear one without expert advice.",
  },
  Rahu: {
    theme: "ambition, obsession, foreign, shortcuts, illusion",
    daily: [
      "Name the shortcut or escape you are tempted by and refuse it once this week.",
      "Ground yourself daily: routine, exercise, sleep, fewer intoxicants.",
      "Choose one deep focus over many scattered ambitions.",
    ],
    traditional: [
      "Give dark-coloured items (sesame, blankets) in charity; worship Durga.",
      "Meditate daily to steady a restless mind.",
    ],
    caution: "Rahu has no universally agreed gemstone; avoid speculative 'remedy' purchases.",
  },
  Ketu: {
    theme: "detachment, spirituality, loss, insight, moksha",
    daily: [
      "Let go of one thing you are gripping too tightly.",
      "Keep a short daily meditation or reflective practice.",
      "Turn confusion into study — learn about what unsettles you.",
    ],
    traditional: [
      "Give blankets or warm clothes in charity; worship Ganesha.",
      "Practise contentment and detachment from outcomes.",
    ],
    caution: "Ketu has no agreed gemstone; focus on practice, not purchases.",
  },
};

/** Domain → practical steps grounded in ordinary life, not astrology. */
const DOMAIN_ACTIONS: Record<Domain, string[]> = {
  career: [
    "Improve one marketable skill deliberately each month.",
    "Build a mentor or network relationship rather than only applying.",
    "Document your results so progress is visible when timing turns.",
  ],
  money: [
    "Set a written budget and an automatic monthly saving.",
    "Avoid speculation and get-rich-quick schemes during uncertain periods.",
    "Keep an emergency fund before any big commitment.",
  ],
  property: [
    "Do full legal and title diligence before any property step.",
    "Keep all paperwork and payments documented.",
    "Do not rush a purchase because of pressure or impatience.",
  ],
  vehicle: [
    "Prioritise safety and maintenance over upgrades.",
    "Delay a major purchase until the timing window clears if it feels forced.",
  ],
  relationships: [
    "Invest in communication and consistency, not just grand gestures.",
    "Consider counselling or an honest conversation before any drastic step.",
    "Give the relationship time; do not decide in a low phase.",
  ],
  family: [
    "Set clear, kind boundaries with family where needed.",
    "Attend to the health and needs of parents or dependents.",
    "Avoid making family decisions under emotional pressure.",
  ],
  health: [
    "See a qualified doctor first — astrology does not replace medical care.",
    "Fix sleep, diet, exercise and stress basics.",
    "Track symptoms so you can give a doctor real information.",
  ],
  education: [
    "Build a fixed study routine and remove one daily distraction.",
    "Seek a teacher or structured course rather than self-study alone.",
    "Prepare early rather than relying on last-minute effort.",
  ],
  legal: [
    "Get real legal counsel; document everything in writing.",
    "Avoid confrontation; prefer mediation where possible.",
    "Do not sign anything under pressure without review.",
  ],
};

/* --------------------------------------------------------------- P.3 build */

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** Bodies implicated: the running period lords, plus planets opposing the read, plus triggers. */
function implicatedBodies(analysis: {
  activeDasha: AnalyzeResponse["activeDasha"];
  transits: AnalyzeResponse["transits"];
  conflictReports: AnalyzeResponse["conflictReports"];
}): string[] {
  const bodies: string[] = [analysis.activeDasha.md, analysis.activeDasha.ad];
  if (analysis.activeDasha.pd) bodies.push(analysis.activeDasha.pd);

  for (const r of analysis.conflictReports) {
    for (const f of r.findings) {
      if (f.result === "OPPOSES" && f.basis) {
        // basis strings name bodies; keep only known planet names
        for (const name of Object.keys(PLANET_MEASURES)) {
          if (f.basis.includes(name)) bodies.push(name);
        }
      }
    }
  }
  for (const t of analysis.transits) {
    if (t.direction === "OPPOSES" && t.favourable !== true) bodies.push(t.body);
  }
  return unique(bodies.filter((b) => PLANET_MEASURES[b])).slice(0, 3);
}

export function buildGuidance(input: {
  activeDasha: AnalyzeResponse["activeDasha"];
  transits: AnalyzeResponse["transits"];
  conflictReports: AnalyzeResponse["conflictReports"];
  timingWindows: AnalyzeResponse["timingWindows"];
  query: AnalyzeResponse["query"];
}): Guidance {
  const { activeDasha, transits, conflictReports, timingWindows, query } = input;

  /* --- 1. WHY: natal promise → period activation → current trigger --- */
  const causes: GuidanceCause[] = [];

  const promiseFindings = conflictReports.flatMap((r) =>
    r.findings.filter((f) => f.result === "SUPPORTS" || f.result === "OPPOSES"),
  );
  if (promiseFindings.length > 0) {
    const top = promiseFindings.slice(0, 3);
    causes.push({
      step: "What your chart carries (the promise)",
      basis: top.map((f) => `${f.explanation}`).join(" "),
    });
  } else {
    causes.push({
      step: "What your chart carries (the promise)",
      basis: "No strong natal promise was resolved for this question — the chart is not specific here.",
    });
  }

  const period = `${activeDasha.md} / ${activeDasha.ad}${activeDasha.pd ? ` / ${activeDasha.pd}` : ""}`;
  causes.push({
    step: "What is switching it on now (the period)",
    basis: `The ${period} period is running (${activeDasha.md} period ${activeDasha.mdWindow[0]} to ${activeDasha.mdWindow[1]}; ${activeDasha.ad} sub-period ${activeDasha.adWindow[0]} to ${activeDasha.adWindow[1]}). A period lord activates the matters its planets govern, which is why this surfaces now rather than at another time.`,
  });

  const triggers = transits.filter((t) => t.direction !== "UNKNOWN");
  if (triggers.length > 0) {
    causes.push({
      step: "What is triggering it right now (the transit)",
      basis: triggers
        .slice(0, 3)
        .map(
          (t) =>
            `${t.body} is in ${t.sign} (house ${t.houseFromMoon} from your Moon), which ${t.direction === "OPPOSES" ? "presses against" : "supports"} this${t.note ? ` — ${t.note}` : ""}.`,
        )
        .join(" "),
    });
  }

  /* --- 2. HOW LONG: the controlling window --- */
  const window = activeDasha.pdWindow ?? activeDasha.adWindow;
  const duration = {
    headline: `The controlling window is ${activeDasha.pd ? "the " + activeDasha.pd + " sub-period" : "the " + activeDasha.ad + " sub-period"}, running ${window[0]} to ${window[1]}.`,
    window: { start: window[0], end: window[1] },
    caveat: timingWindows[0]?.caveat ?? "Vimshottari boundaries carry ±2–3 days; treat the end as a fade, not a switch.",
  };

  /* --- 3. WHAT TO DO: practical daily-life actions + customary measures --- */
  const actions: GuidanceAction[] = implicatedBodies({ activeDasha, transits, conflictReports }).map((body) => ({
    planet: body,
    theme: PLANET_MEASURES[body].theme,
    daily: PLANET_MEASURES[body].daily,
    traditional: PLANET_MEASURES[body].traditional,
    caution: PLANET_MEASURES[body].caution,
  }));

  const domainActions: GuidanceDomainAction[] = query.domains.map((d) => ({
    domain: d,
    house: DOMAIN_HOUSE[d],
    steps: DOMAIN_ACTIONS[d],
  }));

  return {
    why: causes,
    duration,
    actions,
    domainActions,
    note: "The daily-life steps are ordinary, practical measures. The customary measures are traditional Vedic practices (tradition-specific, not proven) — offered as support, never as a substitute for real-world decisions, medical care or professional advice.",
  };
}
