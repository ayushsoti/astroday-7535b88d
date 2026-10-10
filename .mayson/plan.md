# Astroday — Whole-Build Plan

## Context

**What exists today.** The workspace is the in-house **Mayson Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui** template. Only the starter shell is present: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, the full `components/ui/*` kit, `lib/utils.ts`, `hooks/use-mobile.ts`, `components.json` (aliases `@/components`, `@/lib`, `@/hooks`, `@/` → repo root). No database, no auth, no domain code yet.

**What the user brought.** Two uploaded documents:
- `ASTRODAY_MAYSON_BUILD_SPEC.md` — the single source of truth: product definition, non-negotiable "constitution" (14 principles), data model, API contract, and every astrology algorithm with exact constants (ephemeris conventions, dignity tables, combustion orbs, Vimshottari conventions, Paths C/E/B, D9/D7, Ashtakavarga), the evidence/conflict/knowledge-status model, a **golden fixture** for Sahaj's chart with expected outputs, 22 acceptance tests, and a phased build plan.
- `ASTRODAY_SESSION_HISTORY.md` — how the project got here (prior Python build, 763 tests, lost sandbox; decision to rebuild).

**Environment mismatch (must be resolved before building).** The spec assumes the **mayson.dev no-code builder** plus a **separate Python FastAPI engine using `pyswisseph`**. This workspace is a real Next.js/TypeScript repo where the app must be previewed and published as one Next app. A Python sidecar cannot be previewed/published end-to-end here. Recommended adaptation: **port the Astro Engine to TypeScript inside this app**, keeping every constant, formula, verdict and golden fixture from the spec byte-for-byte in behaviour. See "Open decision" below — this is the gating question.

**Product in one line.** Astroday is a personal Vedic-astrology + life-strategy advisor: onboard a birth profile → engine computes a real chart profile → user asks a question (English/Hinglish) → app classifies it, computes evidence, builds a conflict report → an LLM writes *only the prose* from the engine JSON. It is not a horoscope generator.

---

## Architecture (adapted to this workspace)

```
app/ (Next.js App Router — UI + API routes + Server Actions)
  onboarding · chat · today · chart · timeline · audit
  api/customers · api/ask · api/chart/[id] · api/dasha/[id]
  api/predictions · api/calibration-events
        │  (handlers call the application service only)
lib/app/ (application service: orchestration, NO astrology math)
  loadProfile → classifyQuestion → callEngine → callLLM → persistTurn
lib/astro/ (ASTRO ENGINE — pure, deterministic, server-only, unit-tested)
  ephemeris · natal · primitives · dasha · varga · ashtakavarga
  techniques/{pathC,pathE,pathB,d9,d7} · evidence · conflict
  knowledge · query · registry · analyze · types · constants
lib/llm/ (LLM boundary — imports NOTHING from lib/astro compute)
  anthropic.ts · fallback.ts · systemPrompt.ts
lib/db/ + db/schema.ts (Drizzle + libSQL, cloud ability)
```

**Boundary rules enforced in review:** API handlers call only `lib/app`; the LLM module receives a JSON payload and never imports engine modules; `supporting_finding_ids`, `uncertainty_notes`, `knowledge_status_summary`, `convergence_label` are computed from engine output and passed through unchanged — the LLM authors only `answer_text`.

**Ephemeris strategy (Phase 0 gate).** Prefer a native Swiss-Ephemeris binding for exact parity with the spec (Lahiri `SIDM_LAHIRI`, `TRUE_NODE`) — `@swisseph/node`/`swisseph-v2` ship prebuilt Linux binaries. If the native module will not install in this sandbox, fall back to pure-JS **`astronomy-engine`** + a computed Lahiri ayanamsha + osculating ascending node (h = r × v). Whichever path is taken, it must pass the golden fixture (D1 within 0.02°, 6 PDF-anchored dasha boundaries to the day, D9/D7 exact) before any UI is built.

---

## Files to change / add

### Phase 0 — deps + engine spike (de-risk before UI)
- `package.json` (add `astronomy-engine` and/or swisseph binding; `vitest` + `@vitest/...` dev; keep bun).
- `lib/astro/constants.ts` — signs, 27 nakshatras + lords, sign lords, exalt/debil/own, natural friends/enemies, combustion orbs, house groups, planet-condition weights, domain→house, dasha years, event keys, provenance labels.
- `lib/astro/types.ts` — `NatalChart`, `PlanetPosition`, `HouseLord`, `PlanetCondition`, `DashaPeriod`, `Finding`, `EvidenceBundle`, `ConflictReport`, `KnowledgeStatus`, `ConvergenceLabel`, `AnalysisResult`.
- `lib/astro/ephemeris.ts` — UTC resolution + planetary longitudes/speeds, sidereal Lahiri, whole-sign ascendant, true node, Ketu = Rahu+180.
- `lib/astro/natal.ts` — D1 chart, nakshatra/pada, whole-sign houses, house lords.
- `tests/golden.spec.ts` — Sahaj fixture: D1 ±0.02°, retro flags, Punarvasu-2, house lords (3rd = **Mars**), planet conditions table, D9/D7 exact.

### Phase 1 — classical primitives + Vimshottari
- `lib/astro/primitives.ts` — dignity (Exalted→Debilitated→Own→natural-relation fallback), combustion orbs, house categories, condition score (−4…+3, direction, strength). Moolatrikona = "Own"; Rahu/Ketu = reject.
- `lib/astro/dasha.ts` — Vimshottari MD/AD/PD with `Fraction` arithmetic, 365.2425-day year, cumulative floor at emission, touching half-open boundaries, re-anchoring, partial birth-MD, **last-child clip rule**, ±2–3 day caveat; `activeDasha(date)` + next 3 transitions.
- `tests/dasha.spec.ts` — balance 10.348 y, MD table, the 6 PDF-anchored boundaries to the day, touching, clipping, active 2026-10-10 = Sa/Ju/Ke.

### Phase 2 — techniques, evidence, conflict
- `lib/astro/varga.ts` — D9/D7 uniform formula (exact); even-n → `NOT_AVAILABLE`.
- `lib/astro/ashtakavarga.ts` — BAV/SAV tables (ported, not hand-typed) with `convention` param; invariant totals 48/49/39/54/56/52/39 = 337.
- `lib/astro/techniques/pathC.ts`, `pathE.ts`, `pathB.ts` (+ `d9.ts`, `d7.ts`) — per spec J.1–J.4 incl. node-dispositor → NOT_TESTED/UNKNOWN, Path B never STRONG, Sade Sati qualifier only, Ketu direction UNKNOWN.
- `lib/astro/evidence.ts` — `Finding`, `EvidenceBundle`, `independence_group` construction.
- `lib/astro/conflict.ts` — group verdicts, net-read priority, event specificity (money SUPPORT ≠ debt_closure support).
- `lib/astro/knowledge.ts` — 7 knowledge statuses + overrides; convergence label (K.6).
- `lib/astro/registry.ts` + `lib/astro/analyze.ts` — technique registry with explicit outcomes (EXECUTED/NOT_IMPLEMENTED/…); orchestrator producing the analyze payload.
- `tests/pathCE.spec.ts`, `tests/conflict.spec.ts`, `tests/transit.spec.ts`, `tests/ashtakavarga.spec.ts` — L.5 net reads, MONEY/FAMILY correlated, PROPERTY/VEHICLE/RELATIONSHIPS conflicted, node handling, Path B caps, isolation (two other charts).

### Phase 3 — persistence + auth (cloud ability)
- Enable the **cloud** ability → `db/schema.ts` (Drizzle), `lib/db/*`, `local.db`, drizzle config, auth-session recipe.
- Tables exactly as spec Part E: `users, customers, chart_profiles, conversations, messages, stated_facts, ai_conclusions, engine_runs, calibration_events, predictions`.

### Phase 4 — query understanding + app service
- `lib/astro/query.ts` — Hinglish/English classifier → `question_category`, `domains`, `event_key` (Part O tables + keyword hints).
- `lib/app/service.ts` — onboarding (birth → engine → profile), ask pipeline, dasha range, predictions/calibration.
- `tests/query.spec.ts` — every O.3 routing row.

### Phase 5 — LLM answer layer
- `lib/llm/systemPrompt.ts` (Part P.1 verbatim, `{language}` filled), `anthropic.ts` (Messages API, key from env), `fallback.ts` (deterministic, clearly labelled), `lib/llm/payload.ts` (P.3 shape).
- Missing key/failure → `502 ANSWER_GENERATION_UNAVAILABLE`, never a fabricated answer.

### Phase 6 — UI (App Router)
- `app/layout.tsx` (dark/light via `next-themes`, bottom tab bar mobile / sidebar desktop), `app/globals.css` (keep Tailwind v4 `@import`).
- `app/onboarding/page.tsx` — name/date/time/place + candidate-city picker + Advanced lat/lon/tz.
- `app/chat/page.tsx` — messages, quick-prompt chips, verdict chips, convergence badge, collapsible "Why" panel, uncertainty line.
- `app/chart/page.tsx` — D1, house lords, conditions, D9/D7, Ashtakavarga grid, limitations.
- `app/timeline/page.tsx` — MD→AD→PD bars + today marker + next transitions.
- `app/today/page.tsx` — active dasha, today's Moon, slow-planet transits, Sade Sati, daily plan.
- `app/audit/page.tsx` — predictions table + outcome editor, calibration events, stated facts.
- API routes under `app/api/**` (or Server Actions) matching Part F exactly.
- `app/api/engine/selftest` (dev-only) to surface golden-fixture results in the running app.

### Phase 7 — polish + verify
- Empty/loading(skeleton)/error/success states everywhere; ownership isolation; title/meta; run `verify`.

---

## Existing code to reuse

- `components/ui/*` — `button, card, badge, tabs, table, input, textarea, label, field, select, dialog, sheet, drawer, dropdown-menu, collapsible, accordion, separator, scroll-area, skeleton, sonner, tooltip, popover, calendar, progress, avatar, alert, empty, item, breadcrumb, sidebar, chart` (recharts) — cover nearly every screen.
- `lib/utils.ts` (`cn`), `hooks/use-mobile.ts` (responsive tab bar vs sidebar).
- `next-themes` (already a dependency) for the dark/light theme.
- `sonner` for toasts; `zod` (already present) for API input validation.
- `components.json` aliases and `app/globals.css` Tailwind v4 entrypoint — do not restructure.

---

## Verification

- **Engine (each phase):** `bunx vitest run` — golden fixture D1 ±0.02°; Punarvasu-2; house lords (3rd = Mars); planet-condition table exact; D9/D7 exact; even-n → NOT_AVAILABLE; balance 10.348 y; 6 PDF dasha boundaries to the day; touching/clip rules; active dasha 2026-10-10 = Sa/Ju/Ke; Path C/E net reads = L.5; MONEY/FAMILY correlated; PROPERTY/VEHICLE/RELATIONSHIPS conflicted; node dispositor NOT_TESTED; Path B never STRONG; Ketu UNKNOWN; Ashtakavarga 337 invariant on 3 charts; event specificity; reproducibility; two-chart isolation.
- **App:** `verify(full:true)` (starts preview + browser). Then exercise each flow from the rendered UI: onboard Sahaj → chart screen shows the fixture values → ask "kab shaadi hogi?" and "loan close kar du?" → verify domain chips/convergence/uncertainty lines and that stated facts don't change `natal_json`.
- **API:** `curl` `POST /api/customers`, `POST /api/ask`, `GET /api/chart/:id`, `GET /api/dasha/:id`; confirm error bodies are `{code,message,detail}` with no tracebacks, and `POST /api/ask` returns `502 ANSWER_GENERATION_UNAVAILABLE` when no LLM key is set.
- **Visual:** `ensure_preview` + screenshots at 390×844 (mobile) and desktop for each screen.
- **Isolation test:** assert `lib/llm/*` has no import path to `lib/astro/*` compute modules.

---

## Open decisions (need the user)

1. **Where the astrology math lives** — TypeScript engine inside this app (recommended, previewable/publishable) vs a separate Python service (matches the spec's wording but cannot run end-to-end here). *Asking now.*
2. **Persistence & accounts** — cloud storage (Drizzle + libSQL) with a simple login, or a single-user local store for a first pass. (App stores personal data → cloud is the default.)
3. **LLM key** — whether an Anthropic API key will be provided (else the deterministic fallback is used and clearly labelled).
4. **Scope of the first delivery** — full 6-screen app in one pass, or engine + onboarding + chat + chart first, then Today/Timeline/Audit.

## Known gaps carried from the spec (must NOT be faked)
D10/D4 and other even-n vargas → NOT_AVAILABLE; Sookshma → NOT_TESTED; Vedha/Sodhya → not implemented; Ashtakavarga not evidence-wired; fast-planet gochara display-only; degree aspects not implemented; yogas not computed; Path I not built; Ketu houses contested; Moolatrikona not implemented; historical-observation registry empty (populate only from user-confirmed calibration events).
