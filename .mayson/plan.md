# ASTRODAY — Whole-Build Plan

## Context

**What Astroday is.** A personal Vedic-astrology + life-strategy advisor. A *deterministic
engine* turns a birth chart into auditable evidence (natal promise, nakshatra dispositor,
transits, Vimshottari dasha, divisional charts), groups that evidence so the same chart fact
is never double-counted, surfaces **conflicts instead of averaging them**, and hands the
structured result to an LLM that writes **prose only**. Evidence fields (findings, conflict
verdicts, knowledge statuses, convergence label) are computed by the engine and passed through
**unchanged**; the LLM can never invent a degree, a date, or a yoga.

**Source of truth.** `.uploaded_documents/ASTRODAY_MAYSON_BUILD_SPEC.md` (Parts A–T: product,
principles, architecture, data model, API, every algorithm with its exact constants, the golden
fixture, acceptance tests, LLM layer, UI, and known gaps). `.uploaded_documents/ASTRODAY_SESSION_HISTORY.md`
supplies the decision register (D1–D18) and the lessons (run the code, don't trust reports;
push durably; name gaps instead of faking them).

**Decisions locked with the user this session:**
1. **Engine lives inside this app, in TypeScript** (not a Python sidecar). Every rule and
   constant from Parts G–K is ported, and it is **proven against the golden fixture (Part L)
   before any screen is built**.
2. **Two-sided product:** a customer app *and* an admin dashboard, with subscription tiers.
3. **Admin-managed plans only** — no live payments. Admin sets free/paid per user; users see
   their plan and can file an upgrade request.

**What already exists in the workspace.** The in-house Mayson Next.js 16 starter: App Router,
React 19, TypeScript strict, Tailwind v4 (CSS-first, `@import "tailwindcss"` in `app/globals.css`),
shadcn/ui already installed (`components/ui/*`), `@/` → project root, `lib/utils.ts`, `hooks/`.
Current `app/page.tsx` is the Mayson welcome placeholder and will be replaced by the Astroday
landing page. Nothing astrology-related exists yet.

**Why persistence + auth is required.** The app stores personal birth profiles, conversations,
and admin plan state that must survive restarts and be isolated per user → the **cloud ability**
(Drizzle + libSQL `file:local.db`, Server Actions / route handlers) with the bundled
**auth-session** recipe (email/password). This replaces the in-memory data layer entirely.

---

## Architecture at a glance

```
Browser ── Next.js 16 App Router ─────────────────────────────────────────────┐
  (user app: Onboarding · Chat · Today · Chart · Timeline · Audit · Plan)     │
  (admin app: Users · Plans · Upgrade requests · Stats)                       │
        │  route handlers / server actions                                    │
        ▼                                                                     │
  app service layer (orchestration only — NO astrology math in routes)        │
   1 load customer+birth · 2 classify question → AnalysisPlan · 3 run engine │
   4 build LLM request · 5 call LLM → answer_text · 6 persist turn/facts     │
        │                                        │                            │
        ▼ (in-process, TypeScript)               ▼ (server-only)              │
  lib/astro/*  engine (pure, deterministic)   lib/llm/* answer layer        │
        │                                                                    │
        ▼ libSQL (Drizzle): users, customers, chart_profiles, conversations, │
          messages, stated_facts, ai_conclusions, engine_runs,               │
          calibration_events, predictions, upgrade_requests                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Boundary rules enforced in code review (spec Part D):**
- `lib/llm/*` imports nothing from `lib/astro/*` computation modules — it receives a JSON payload only.
- `supporting_finding_ids`, `uncertainty_notes`, `knowledge_status_summary`, `convergence_label`
  are computed from engine output and passed to the client unchanged.
- Route handlers call the app service, never engine internals directly.
- Errors return clean JSON `{code, message, detail}` — never a traceback.

---

## Key technical decisions & risks

- **Ephemeris.** The spec uses `pyswisseph` (Swiss Ephemeris). To reproduce the golden fixture
  with the *same* library, use **`swisseph-wasm`** (Swiss Ephemeris C v2.10.x compiled to WASM,
  zero runtime deps) — it exposes `set_sid_mode(SIDM_LAHIRI)`, `calc_ut`, `houses_ex`, `TRUE_NODE`.
  **Fallback if WASM init misbehaves in the Node server runtime:** `astronomy-engine` (pure TS,
  ~1 arcmin) for positions, with Lahiri ayanamsha applied and the true node computed from the
  lunar orbit. Whichever wins, the golden fixture test is the gate. This is resolved in Phase 1,
  before any UI work.
- **Exact dasha arithmetic.** Spec requires exact rationals (`fractions.Fraction`) and a
  cumulative-floor emission rule. Port with a small `Fraction` helper over `bigint` (no float
  rounding, ever). Tests 6–7 in Part M prove it.
- **Place resolution.** The Python build used `geonamescache` (~34k cities). We cannot ship that
  here; bundle a **curated offline city index** (India-heavy + world majors) plus lat/lon/tz
  override fields. **Never guess:** a bare ambiguous name returns `AMBIGUOUS_BIRTH_PLACE` with
  candidates. Recorded as a known limitation.
- **LLM key.** `ANTHROPIC_API_KEY` (server-only). When absent, a **deterministic fallback answer**
  is returned, clearly labelled — never a fake success (Part M test 22).
- **Timezone.** `Intl`/`Temporal`-style zone math from the resolved IANA zone → UTC; historical
  offsets handled. No new heavy deps.
- **WASM + Turbopack.** Load the WASM module in a server-only module and mark engine routes
  `runtime = "nodejs"`. Verify early (Phase 1) that the WASM asset loads under `next build`/`next start`.

---

## Files to change / create

### Data + auth (cloud ability — generated + edited)
- `lib/db/schema.ts` — Drizzle schema: `users` (+ `role` admin|user, `plan` free|paid,
  `preferredLanguage`), `customers`, `chart_profiles`, `conversations`, `messages`,
  `stated_facts`, `ai_conclusions`, `engine_runs`, `calibration_events`, `predictions`,
  `upgrade_requests` (id, userId, message, status pending|approved|declined, createdAt).
- `lib/db/index.ts` — libSQL client (`file:local.db`) per cloud ability rules.
- `drizzle.config.ts`, migration/seed scripts.
- `lib/auth/*` — auth-session recipe (sign up, sign in, session cookie, `requireUser`, `requireAdmin`).
- Seed: one **admin** account + a demo customer, so the dashboard is usable immediately.

### Engine (pure, deterministic — `lib/astro/`)
- `constants.ts` — signs, 27 nakshatras + lords, sign lords, dasha order/years (120), dignity
  (exalted/debilitated/own), natural friends/enemies, combustion orbs, house categories,
  domain→primary house, keyword seed, event-key ontology.
- `fraction.ts` — exact rational helper (bigint numerator/denominator).
- `ephemeris.ts` — WASM singleton; Lahiri sidereal; TRUE node; Ketu = (Rahu+180)%360; retro flag.
- `place.ts` — offline city index, ambiguity handling, lat/lon/tz override, tz→UTC.
- `natal.ts` — positions, sign/degree, nakshatra-pada + lord, whole-sign houses, house lords.
- `primitives.ts` — H.2 dignity, H.3 combustion, H.5 condition score/direction/strength, H.4 categories.
- `dasha.ts` — Vimshottari MD/AD/PD with exact fractions, cumulative floor, touching boundaries,
  partial birth MD, last-child clip; `activeDasha(date)`, `dashaRange(from,to)`.
- `varga.ts` — D9/D7 uniform formula; **even-n → NOT_AVAILABLE**; D9/D7 structure techniques.
- `ashtakavarga.ts` — Bhinnashtakavarga + Sarvashtakavarga, `convention` param, 337 invariants.
- `paths.ts` — Path C (natal promise), Path E (nakshatra dispositor), Path B (gochara transits:
  Jupiter/Saturn/Rahu/Ketu from Moon, never STRONG, Ketu UNKNOWN, Sade Sati qualifier,
  ingress→egress window via day-stepping + bisection).
- `conflict.ts` — independence groups, K.3 conflict report (7 verdicts), K.4 event specificity,
  K.5 knowledge status (7 values), K.6 convergence label.
- `registry.ts` — technique registry + explicit outcome for every technique (EXECUTED /
  NOT_IMPLEMENTED / NOT_APPLICABLE_TO_DOMAIN / … ) — nothing silently skipped.
- `query.ts` — Part O classifier: question → category → domains + event keys (Hinglish keyword seed).
- `onboard.ts` — birth → `{natal_json, dasha_json, limitations, status}`.
- `analyze.ts` — orchestrator: `{active_dasha, timing_windows, transits, domains[], event_specificity,
  convergence_label, uncertainty_notes, knowledge_status_summary, limitations}`.
- `fixture.ts` — the Part L golden data (Sahaj: 1998-10-12 16:00, Haridwar, 29.95N/78.16E, Asia/Kolkata).
- `__tests__/` (run with `bun test`) — **all 15 Part M engine tests**, incl. D1 within 0.02°,
  Aquarius lagna / Punarvasu-2, 3rd lord = Mars, planet conditions = L.4, D9/D7 = L.6,
  dasha balance 10.348y + day-precise boundaries, active 2026-10-10 = Sa/Ju/Ke,
  C/E table = L.5 (money/family CORRELATED, property/vehicle/relationships CONFLICTED),
  node dispositor → NOT_TESTED/UNKNOWN_NOT_TESTED, Path B never STRONG, Ashtakavarga = 337,
  event specificity, reproducibility, and 2-customer isolation.

### LLM answer layer (`lib/llm/`)
- `system-prompt.ts` — Part P.1 verbatim (fill `{language}`).
- `build-request.ts` — Part P.3 `LLMAnswerRequest` from engine output (no engine imports).
- `answer.ts` — Anthropic call (server-only) + deterministic fallback labelled clearly;
  P.2 answer formats; returns `answer_text` only.

### App service + API (`lib/services/`, `app/api/`)
- `services/onboard.ts`, `services/ask.ts` (full pipeline incl. StatedFact/AIConclusion/EngineRun
  persistence), `services/chart.ts`, `services/audit.ts`, `services/admin.ts`.
- Routes: `POST/GET /api/customers`, `GET /api/chart/[id]`, `POST /api/ask`,
  `GET /api/dasha/[id]`, `POST /api/calibration-events`, `GET /api/predictions`,
  `PATCH /api/predictions/[id]`, `POST /api/upgrade-requests`,
  admin: `GET /api/admin/users`, `PATCH /api/admin/users/[id]`, `GET/PATCH /api/admin/upgrade-requests`.

### UI (App Router, mobile-first, calm dark + light, indigo accent)
- `app/layout.tsx`, `app/globals.css` — theme tokens (indigo accent, verdict colours), fonts.
- `app/page.tsx` — **landing/marketing** with plans (Free / Pro) and CTA (replaces placeholder).
- Auth: `app/(auth)/login`, `app/(auth)/signup`.
- User app `app/(app)/…`: `onboarding`, `chat` (home), `today`, `chart`, `timeline`, `audit`, `account`.
  Shared shell: bottom tab bar (mobile) / left sidebar (desktop).
  Chat answer card: domain chips coloured by verdict (SUPPORT green · OPPOSES red · CONFLICTED
  amber · CORRELATED grey-blue · UNVALIDATED/UNAVAILABLE grey), convergence badge, collapsible
  "Why" evidence panel with knowledge-status tags, one muted uncertainty line.
  Every screen has empty / loading (skeletons) / error (plain + retry) / success states,
  accessible labels, focus states, reduced-motion.
- Admin `app/admin/…`: dashboard, users (set plan/role), upgrade requests (approve/decline), stats.
- Reuse shadcn components from `components/ui/*` (button, card, input, table, tabs, badge, dialog,
  sheet, select, sonner, skeleton, tooltip, sidebar, etc.).

---

## Existing code to reuse
- `components/ui/*` — the full shadcn set is already installed; do not re-install.
- `lib/utils.ts` — `cn()` class helper.
- `hooks/use-mobile.ts` — responsive shell (tab bar vs sidebar).
- `app/globals.css` — keep the `@import "tailwindcss"` line; extend tokens (indigo accent, verdict colours).
- `app/layout.tsx` — keep the `Google_Sans` font wiring; swap metadata to Astroday.
- `next.config.ts` — already Turbopack (`turbopack.root`); leave as-is.
- Cloud ability — its injected rules govern Drizzle/libSQL + the auth-session recipe (replaces
  the in-memory data-layer guidance entirely).

---

## Build phases (each ends with its acceptance tests green before moving on)

- **P0 — Foundation.** Enable cloud ability; Drizzle schema + `local.db`; auth (email/password);
  seed admin + demo user; role/plan guards; landing page shell + auth pages.
- **P1 — Engine core + golden fixture (the gate).** Ephemeris spike → natal → primitives →
  dasha → varga → ashtakavarga. Run **Part M tests 1–15** with `bun test`. No UI until this is green.
- **P2 — Evidence layer.** Paths C/E/B, registry, conflict model, event specificity, knowledge
  status, convergence label, Part O classifier, `analyze` orchestrator. Extend tests for
  L.5 verdicts and registry outcomes.
- **P3 — Onboarding + Chart + Timeline.** `POST/GET /api/customers`, `GET /api/chart/[id]`,
  `GET /api/dasha/[id]`; onboarding UI (ambiguity → candidate list); chart tables (D1, house lords,
  conditions, D9/D7, Ashtakavarga, limitations); timeline bars + today marker + next transitions.
- **P4 — Ask flow + LLM + memory.** `POST /api/ask` full pipeline; LLM answer layer with fallback;
  StatedFact / AIConclusion capture; chat UI with evidence chips, convergence badge, "Why" panel.
  Tests 16–22 (boundary, pass-through, stated_fact immutability, error hygiene, Hinglish routing, missing key).
- **P5 — Today + Audit loop.** Today screen (active MD/AD/PD, Moon, slow transits, Sade Sati);
  Audit screen (predictions + calibration events); seed the **L.8 legacy PDF predictions** as
  `source=legacy_pdf, outcome=pending`.
- **P6 — Admin + plans.** Admin dashboard: users list, set plan/role, upgrade requests approve/decline,
  stats; user account screen shows plan + "request upgrade".
- **P7 — Polish + publish.** Responsive/visual pass (screenshot 390×844 + desktop), a11y, then
  `verify(full:true)` and publish.

---

## Verification

- **Engine:** `bun test` — all Part M engine tests 1–15 pass (golden fixture within tolerances:
  D1 ±0.02°, D9/D7 exact, dasha day-precise boundaries, verdicts exact).
- **App build + preview:** the `verify` tool once with `full:true` (starts preview + browser);
  must pass before finishing.
- **API flows (curl, from the rendered app):** `POST /api/customers` (Sahaj → 201 READY, Aquarius
  lagna) · ambiguous place → 422 with candidates · `POST /api/ask` ("kab shaadi hogi?" → MARRIAGE,
  relationships CONFLICTED, pass-through fields equal engine values) · `GET /api/chart/[id]` ·
  `GET /api/dasha/[id]?from=&to=` · `PATCH /api/admin/users/[id]` (plan change) · upgrade request
  round-trip · missing `ANTHROPIC_API_KEY` → labelled fallback, never fake success.
- **Isolation:** two customers (Mumbai 1990-05-01; London 2001) differ from Sahaj; a user never
  sees another's records; non-admin blocked from `/admin` and admin APIs.
- **Visual:** screenshots at 390×844 and desktop; fix layout/spacing/contrast issues.
- **Durability:** commit/push after each phase (lesson from the lost sandbox).

---

## Out of scope / known gaps (do NOT build or fake — spec Part S)
D10/D4 and all even-n vargas → `NOT_AVAILABLE`; Sookshma → `NOT_TESTED`; Vedha/Sodhya and
Ashtakavarga→transit strength not wired (Path B stays below STRONG); fast-planet gochara =
display-only; aspects/graha drishti not implemented (Path C/E are aspect-free); yogas not claimed;
Path I not built (use the K.6 label); Moolatrikona reported as "Own"; historical-observation
registry starts empty (populated only from user-confirmed calibration events). **No live payments**
(admin-managed plans only). Place resolution uses a curated index, not the full geonames dataset.
