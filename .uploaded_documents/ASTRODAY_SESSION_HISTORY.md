# ASTRODAY — Summary of All Claude Sessions About the App

**Compiled:** 10 Oct 2026 · **Project:** Astroday (claude.ai Project) · **Companion file:** `ASTRODAY_MAYSON_BUILD_SPEC.md`

## 0. What this covers, and how it was found

| Source | What it is | How it was read |
|---|---|---|
| claude.ai chats in this Project | 3 chats: "Phase 3B audit findings and blockers" (19 Aug), "Mayson.dev app rebuild file" (10 Oct, 23:17), and this chat (10 Oct) | Past-chat search + recent-chats listing (only chats inside this Project are searchable from here) |
| Claude Code build sessions | ~25 phase sessions on 24 Aug 2026 that wrote code and reports into the Project | Not directly searchable; reconstructed from the 70 docs those sessions saved to the Project (`claude/*.md` reports, `code/` mirror) with their timestamps |
| Legacy astrology chats | Earlier long-form chart-reading conversations | Exported as two PDFs in the Project: `SahajSharmaBirthChartData.pdf`, `SahajSharmaFullAstrologyDecode.pdf` |
| Cowork / memory notes | 8 Sep and 26 Sep notes | Project memory (`overview.md`, `areas/astroday.md`, `preferences.md`) |

**Not covered:** chats outside this Project (not searchable from inside a Project) and the original Phase 1–3G sessions, whose sandbox and records were lost (see §3). Anything about that era below comes from what later sessions recorded about it.

---

## 1. One-paragraph summary

Astroday started as a series of deep personal Vedic-astrology readings for Sahaj (12 Oct 1998, 16:00, Haridwar; Aquarius lagna), captured in two PDFs. It grew into a governance-heavy software project: a reasoning engine that turns a birth chart into auditable evidence (natal promise, nakshatra dispositor, transits, dasha, divisional charts), groups that evidence to avoid double counting, surfaces conflicts instead of averaging them, and hands structured results to an LLM that only writes the prose. An early build (417 tests) was lost when its cloud sandbox was reclaimed; it was rebuilt on 24 Aug in one long chain of Claude Code sessions to 763 passing tests, ending with a working any-customer engine, Flask API, minimal web UI and SQLite persistence. On 26 Sep Sahaj decided to rebuild the app from scratch on Mayson (mayson.dev) rather than migrate it; on 10 Oct Claude researched Mayson and produced a single build spec plus this history.

---

## 2. Timeline

### Era 0 — Legacy astrology readings (before Aug 2026) → the two PDFs
- **Birth Chart Data PDF:** raw chart (D1, D9, nakshatras, Avakhada, panchang, degrees).
- **Full Astrology Decode PDF** — "compiled from this conversation's analysis": precise planetary table; Aquarius functional lordships; D1 house-by-house; D9, D10, D4, D7 tables; yoga audit (Mercury–Venus parivartana called the strongest yoga; Guru-Chandal in 1st; Angarak in 7th; partial Neecha-bhanga for Saturn, debatable for Venus); Jaimini; full Vimshottari timeline (Saturn MD to Feb 2028, Mercury MD 2028–2045, Me/Venus AD 2031–34 called the peak); transits 2026–2037 (Rahu over lagna 2026–27, Jupiter over 7th Mar–Jul 2028, Saturn return 2028–29, Sade Sati 2030–37); dated milestone predictions (career breakthrough Feb 2028, marriage Nov 2028–Feb 2029 or early 2032, property Dec 2031–Feb 2032, first child 2033, etc.); "10 canon events" ranking; final synthesis ("back-loaded chart; second half outperforms the first").
- **Errors later found in these PDFs** (keep in mind when reading them):
  - D1 house table lists the 3rd-house lord as Saturn; correct is **Mars** (the PDF's own functional-lordship line is right).
  - Moon's dignity "Neutral" doesn't match the dignity rule adopted later (gives Friendly) — treated as a second isolated inconsistency.
  - Rahu/Ketu printed at 6.50° (mean node); the build uses the true node (4°49′30″).
  - D10 and D4 tables can't be reproduced by any verified formula (see §4 decision D7).
  - Predictions carry percentage "confidence" numbers — the later engine forbids this style.

### Era 1 — Original engine phases (history known only from later records)
Recorded in `CLAUDE_HANDOFF.md` and the 19 Aug audit:
1. Existing-system investigation → policy/path analysis.
2. **Phase 1C holdout validation:** frozen historical records H1, H3, H7 (events) and H9 (Jul 2015), H10 (Oct 2013) as `CORRECT_NULL` quiet windows; an `evidence_ledger.py` froze these outcomes.
3. **Phase 2:** an `engine/` package (15 modules: dasha engine, domain ontology with 52 event types, chart data, signal fusion, evidence ledger, transit utils).
4. **Phase 3B:** a `v2/` layer of 33 modules — Paths B/C/E/I pathway detectors, causal graph (evidence-required edges, weakest-link confidence), lineage confidence hard-capped at LOW, cohort validation (n ≥ 30 floor; synthetic data structurally non-evidentiary), remedy registry (21 remedies, L1–L4), gemstone gate.
5. **Phase 3D:** "Policy C" counterfactual — audit/simulation only, never production.
6. **Phase 3G:** frozen baseline — Policy B, Candidate C2, K=3, Paths B/C/E/I.
7. **Phase 4A:** architectural diagnosis (Q1–Q10 + evidence ledger). Core conclusion: the real problem is how evidence, candidates, disagreement, residuals and convergence are represented — stop the "failure → policy patch → edge case → threshold" loop.
8. **NEXT-GEN-01:** Varga and Technique registries. Historical baseline at that point: **417 tests**.
9. Governing document: `MASTER_CONTEXT.md` (phase-gated; no phase starts without an audit green-light).

### Era 2 — 19 Aug 2026 · claude.ai chat "Phase 3B audit findings and blockers"
Claude acted as independent auditor, running real code instead of trusting prior reports.
- **Round 1 (Phase 3B zip):** 10 of 11 test files failed — the `engine/` package wasn't in the archive. Doc discrepancies: module count ~39 claimed vs **33** actual; remedies 22 claimed vs **21** actual. Confirmed in source: anti-double-counting in Path I, weakest-link causal confidence, LOW lineage cap, n≥30 cohort floor, synthetic-data block, currency-regex bug fix ("rs." used to match "Mars"). No secrets in the repo; no `.gitignore`. Verdict: Phase 3C blocked; send `engine/`.
- **Round 2 (engine zip):** tests reached **43/43** only after installing **`pyswisseph`, an undocumented dependency**. No `.git` directory despite a report claiming a 96-file commit. Byte-identity claims for frozen files were unverifiable.
- **Blocker 1 (domain-house boundary):** the disputed FAMILY house set `{3,4,6,9}` was a hard-coded literal in one illustrative script, not derived from `domain_ontology.py`; the true union of FAMILY event houses is `{3,4,5,6,9}`; the original H1 analysis tested **Venus + house 9**, not "houses 4 and 9". Proposal (not applied): use per-event-type houses, no domain-wide union.
- **Blocker 2 (quiet-window false positives):** a probe over H9/H10 × 8 domains gave **14/16 cells "multi-layer supported"** in windows known to be quiet. `independent_path_count` was always exactly 2 — natal Path C and transit Path B are different *kinds* of facts, so "≥2 independent paths" is trivially met. Conclusion: the convergence gate wasn't controlling false positives; Phase 3C stayed **blocked**, with Blocker 2 the more urgent.

### Era 3 — 24 Aug 2026 · Claude Code rebuild sessions (one long day, ~12:00–22:00 UTC)
**Sandbox loss → REBUILD-1.** The cloud sandbox holding the 417-test codebase, `MASTER_ROADMAP.md` and NEXT-GEN-01 was reclaimed; nothing had been pushed. Two files survived verbatim (`evidence_bundle.py`, `conflict_model.py` + tests); everything else was rebuilt and labelled as such. From here on, every phase mirrored its code and report into the Project.

| # | Phase | What it produced | Tests |
|---|---|---|---|
| 1 | NEXT-GEN-02 (rebuild) | Domain ontology (9 domains, 31 events), EvidenceBundle/Finding (6 result states), ConflictReport (7 verdicts), registries; D1 and D9/D10/D4/D7 tables re-read from the PDF — D9/D7 match the uniform formula exactly, D10/D4 don't (Rahu/Ketu collision proof) | 54 |
| 2 | NEXT-GEN-03A | Timing evidence contract (`TimingCandidate`, precision/basis/provenance) | — |
| 3 | 03B research, R1, R2 | Vimshottari spec; day-length dispute resolved empirically: 360-day year falsified; 365.2425 + cumulative-floor + touching boundaries reproduce all 6 day-precise PDF boundaries; the 2-day Mercury-MD gap explained by the PDF's 2-decimal Moon degree | — |
| 4 | 03B-I / 03B-II | Real MD/AD/PD engine with exact Fractions; partial birth-dasha handling; COMPUTED timing provenance | — |
| 5 | 03D research + I | Dasha-only timing-window scanner | 151 |
| 6 | Track B research | Paths B/C/E/I algorithms confirmed **unrecoverable**; a lost doc (`NEXTGEN_ARCHITECTURE_SYNTHESIS.md`) named; any new detector = "new implementation" | — |
| 7 | Path C R1/R2 | Lordship validated (3rd-lord PDF error found); dignity fallback = occupant's natural view of sign lord (4/5 fit; Panchadha Maitri tested, 3/5, rejected); combustion orbs locked as project convention | — |
| 8 | D1 primitives + Path C + evidence wiring | Real lordship/dignity/combustion/house-category checks; Path C signals → Findings | 217 |
| 9 | Path E | Nakshatra dispositor of the domain lord; node dispositors → UNKNOWN, never scored; shared `planet_condition.py` and `domain_houses.py` | 253 |
| 10 | Path C+E synthesis | First real conflict reports: MONEY/FAMILY correlated (Jupiter self-disposited), PROPERTY/VEHICLE/RELATIONSHIPS genuinely CONFLICTED; partial-overlap limitation of `independence_groups()` found | 270 |
| 11 | Path B research + R1 | pyswisseph Moshier + Lahiri reproduces Sahaj's chart to ~0.004°; true node confirmed; gochara rules sourced (Jupiter 2/5/7/9/11, Saturn 3/6/11 bedrock; Rahu Saturn-like; Ketu contested); Sade Sati = qualifier not a second finding; product gap analysis: query understanding and answer generation had zero work | 283 |
| 12 | Product Leap B–I | Path B implemented (capped below STRONG); N-technique orchestrator; CustomerChartProfile; heuristic Hinglish query classifier; 7-value knowledge-status taxonomy; reasoning/answer contracts; conversation memory with StatedFact vs AIConclusion; end-to-end demo on 6 real questions; seeded rule registry, empty historical-observation registry | 520 |
| 13 | Phase J | `v2/application/` gateway, Flask `POST /api/chart` + `/api/ask`, minimal responsive web UI, CLI; LLM boundary enforced by import checks (LLM writes only answer text); Anthropic generator built but never run with a live key | 585 |
| 14 | Phase K | Any-customer natal charts: offline geocoding (~34k cities, never guesses), timezone resolution, sidereal ascendant; latent bug fixed (re-resolution always used Sahaj's birth data); 3 distinct customers verified | 651 |
| 15 | Phase L | Generic D9/D7 engine + D9 marriage / D7 children techniques; Ashtakavarga (3-source cross-validated, 337 invariant); CustomerAstrologicalProfile; SQLite persistence; `POST /api/customer` onboarding | **763** |

**State at end of 24 Aug:** 763/763 passing. Still open: D10/D4 and other even-n vargas, Sookshma, Vedha/Sodhya, Ashtakavarga not wired into evidence, Path I not rebuilt, independence-groups partial overlap, ProfileReadiness BLOCKED/FAILED never produced, live LLM never exercised, historical-observation registry empty, Ketu gochara convention undecided.

### Era 4 — 8 Sep 2026 · memory consolidation
Project memory recorded the governance picture as of the Phase 3B audit: Phase 3C blocked on two blockers; Claude's role as independent auditor; lessons (prior reports inaccurate; undocumented dependencies; convergence gate flaw is architectural). Note: this snapshot reflects the 19 Aug audit era, not the later 24 Aug rebuild — the rebuild superseded Phase 3C's framing.

### Era 5 — 26 Sep 2026 · decision to rebuild on Mayson (Cowork)
- Building the Astroday app with the **mayson.dev agent**.
- **Not migrating** the existing code — rebuilding from scratch on Mayson.
- Preference recorded: address him respectfully as "Sahaj Sir"; use "aap" in Hinglish.

### Era 6 — 10 Oct 2026 · Mayson research and build spec (two chats)
- **Chat "Mayson.dev app rebuild file" (23:17 IST):** same request; started reading memory and Mayson's docs site (docs.mayson.dev — quickstart, plans, llms.txt index). Ended before producing the file as far as the record shows.
- **This chat (23:21 IST onward):** researched Mayson (site, blog, docs, Product Hunt, press), read the Project's roadmap, handoff, phase reports and code, recomputed every golden value (chart conditions, Path C/E, D9/D7, dasha tables) and wrote `ASTRODAY_MAYSON_BUILD_SPEC.md`. Key findings: Mayson prompts are capped at **2,000 characters per message**; backend logic uses code blocks (REST API block, AI Agent block, custom Code Block of unspecified language); plans Go ₹699/mo (40 credits) and Pro ₹2,599/mo (200 credits); code export included. Recommended architecture: build the Astro Engine as a separate tested Python service and let Mayson build the app shell and call it.

---

## 3. Decision register (what was decided, and where)

| # | Decision | Status | Origin |
|---|---|---|---|
| D1 | Lahiri ayanamsha, sidereal zodiac, whole-sign houses | Locked | Project instructions / Path B research |
| D2 | True lunar node (not mean) | Locked (cross-validated) | Path B research, 24 Aug |
| D3 | Aquarius 3rd-house lord = Mars; PDF table's "Saturn" is an error | Locked | Path C R1 |
| D4 | Dignity fallback = occupying planet's natural view of the sign lord; Moolatrikona not implemented | Project convention | Path C R2 |
| D5 | Combustion orbs: Mo 12, Ma 17, Me 14/12R, Ju 11, Ve 10/8R, Sa 15 | Project convention | Path C R2 |
| D6 | Dasha: 365.2425-day year, exact fractions, cumulative floor, touching boundaries; ±2–3 day caveat on MD-balance dates; no Sookshma | Locked | 03B-R2 |
| D7 | Only D9/D7 computed generically; uniform formula proven wrong for even-n vargas; D10/D4 never fabricated | Locked; D10/D4 rule = open research | NEXT-GEN-01/02, Phase L |
| D8 | Path C = domain house lord's condition; Path E = that lord's nakshatra dispositor; node dispositor → UNKNOWN | Implemented | Track B |
| D9 | Path B = Jupiter/Saturn/Rahu/Ketu from Moon; never STRONG; Ketu UNKNOWN; Sade Sati qualifier only; retrograde qualifier only | Implemented | Path B R1 |
| D10 | No single confidence number; 7 conflict verdicts; 6 finding states; 7 knowledge statuses | Locked | NEXT-GEN-02, Product Leap |
| D11 | LLM writes only answer text; evidence fields passed through unchanged; LLM module can't import engine code | Locked | Phase J |
| D12 | User statements and prior AI answers never feed chart math | Locked | Product Leap / Phase J |
| D13 | Place resolution never guesses; ambiguous → candidates | Locked | Phase K |
| D14 | Persist inputs + summary; recompute full profile deterministically | Locked | Phase L |
| D15 | Rebuild on Mayson from scratch, not migrate | Decided 26 Sep | Cowork |
| D16 | Engine as separate tested service; Mayson builds shell + calls it | Recommended 10 Oct (awaiting Sahaj's go-ahead) | This chat |
| D17 | Per-event-type houses instead of a domain-wide union (FAMILY) | Proposed 19 Aug, never confirmed | Phase 3B audit |
| D18 | Ketu gochara convention (Mars-like vs Rahu-like) | **Open** | Path B R1 |

---

## 4. Open problems carried into the Mayson rebuild

1. **Convergence that actually controls false positives.** The 19 Aug probe showed "≥2 paths" is meaningless when paths are of different kinds. The spec's convergence label requires independent groups across natal and timing layers — but it still needs validating on quiet windows (H9/H10-style) once real calibration events exist.
2. **Independence-group partial overlap** (Path E always contains Path C's fact) — exact-string grouping undercounts correlation.
3. **D10 / D4 classical rule** — career and property questions lack divisional evidence for everyone.
4. **Ashtakavarga → Path B strength**, Vedha, Sodhya — not wired/implemented.
5. **Event-level evidence** — no technique yet speaks to specific events like debt_closure or marriage timing beyond dasha/transit windows.
6. **Live LLM never exercised** — answer quality and uncertainty-preservation untested in practice.
7. **Calibration data is empty** — the historical-prediction audit (PDF predictions vs real outcomes) has never been run; real life events need to be entered and confirmed.
8. **Path I** never rebuilt.

---

## 5. Lessons learned (repeated across sessions)

- **Push code somewhere durable after every phase.** The whole first build was lost to a reclaimed sandbox.
- **Run the code; don't trust the report.** Audits found wrong module counts, wrong remedy counts, a claimed git commit that didn't exist, and a mis-described blocker.
- **Pin and document every dependency** (pyswisseph surprised two separate sessions; it's a C extension).
- **Source-PDF numbers can be wrong.** Three PDF inconsistencies were found; the engine follows rules, not the PDF, and documents each deviation.
- **Precision is earned.** Dates carry their uncertainty; windows beat exact days.
- **Name gaps instead of filling them** — every unimplemented technique stays visibly NOT_TESTED/NOT_AVAILABLE.
- **Research before code.** Every working component (dasha, Path C, Path B) got an R1/R2-style research pass first; the components that drifted were the ones that didn't.

---

## 6. Key numbers

| Item | Value |
|---|---|
| Historical (lost) test baseline | 417 |
| Phase 3B audit run | 43/43 (after installing pyswisseph) |
| Rebuild baseline | 54 → 151 → 217 → 253 → 270 → 283 → 520 → 585 → 651 → **763** |
| Quiet-window false positives (19 Aug probe) | 14 of 16 cells |
| Ephemeris agreement with Sahaj's chart | ~0.004° planets; ~0.02° tolerance including ascendant |
| D9/D7 vs source tables | 0 mismatches of 10 each |
| D10/D4 under uniform formula | 7/10 and 6/10 mismatches + Rahu/Ketu collision |
| Ashtakavarga cross-validation | 52/56 cells agree across 3 sources; totals sum to 337 |
| Cities in offline geocoder | ~34,000 |

---

## 7. Where things live

- **Project docs:** `claude/MASTER_ROADMAP.md` (phase log), `claude/CLAUDE_HANDOFF.md` (governance + "what not to do"), `claude/NEXT_GEN_STATUS.md` (sandbox-loss account), phase reports `claude/NEXTGEN_*`, `claude/PHASE_L_PRE_IMPLEMENTATION_AUDIT.md`.
- **Code mirror in the Project:** `code/engine/`, `code/v2/` (dasha, pathways, classical, evidence, synthesis, registry, natal), `code/tests/`, `code/webapp.py`, `code/app_cli.py`. Note: modules from the Product Leap and Phases J–L (ephemeris, Path B, application layer, varga engine, ashtakavarga, persistence) are described in reports but not all were mirrored into the Project — the build spec re-specifies them.
- **Source PDFs:** `SahajSharmaBirthChartData.pdf`, `SahajSharmaFullAstrologyDecode.pdf`.
- **New files (10 Oct):** `ASTRODAY_MAYSON_BUILD_SPEC.md` (how to rebuild) and this file (how we got here).
