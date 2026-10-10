# ASTRODAY — Complete Rebuild Spec for Mayson (mayson.dev)

**Version:** 1.0 · **Prepared:** 10 Oct 2026 · **Owner:** Sahaj Sharma
**Purpose of this file:** the single source of truth for rebuilding Astroday from scratch on Mayson. It contains the product definition, the architecture, every astrology algorithm with its exact constants, the data model, the API, the LLM answer layer, the golden test fixture (with expected outputs), the known gaps, and a phase-by-phase prompt plan to paste into Mayson.

> **How to use this file**
> 1. Read Part A (how Mayson works and how to feed it).
> 2. Run the Phase 0 capability check (Part N) before anything else.
> 3. Build the Astro Engine first from Parts C, G–M (N.0), then paste the Mayson messages in Part N one at a time — each is already under Mayson's 2,000-character limit.
> 4. After every phase, run the acceptance checks in Part M against the golden fixture in Part L. Do not move to the next phase until they pass.

---

## TABLE OF CONTENTS

- A. Mayson — what it is and how to build with it
- B. Product definition
- C. Non-negotiable principles (the "constitution")
- D. System architecture
- E. Data model
- F. API contract
- G. Astrology engine — ephemeris & natal chart
- H. Astrology engine — classical primitives (lordship, dignity, combustion, house categories)
- I. Astrology engine — Vimshottari dasha
- J. Astrology engine — evidence techniques (Path C, Path E, Path B, D9/D7, Ashtakavarga)
- K. Evidence, conflict and knowledge-status model
- L. Golden fixture — Sahaj's chart with expected outputs
- M. Acceptance tests
- N. Build plan — engine first, then Mayson (prompts split under 2,000 chars)
- O. Query understanding (domains, events, Hinglish)
- P. LLM answer layer — system prompt and answer formats
- Q. Conversation memory model
- R. UI specification
- S. Known gaps — what NOT to build or fake
- T. Glossary

---

# A. MAYSON — WHAT IT IS AND HOW TO BUILD WITH IT

## A.1 What Mayson is (researched Oct 2026)

- Mayson (formerly **BackStract**) is an Indian (Noida) "true full-stack vibe coding" platform: you describe an app in a prompt, its agents build backend + frontend, and it deploys. Launches: BackStract Alpha (Feb 2025) → Mayson "no-code backend" (Sep 2025) → Mayson full-stack AI agent (Dec 2025). Raised pre-seed in March 2026.
- **Hybrid generation model:** an AI layer interprets your prompt into a structured data model (entities, relationships, auth needs, business logic); a **deterministic generator** then writes the schema, API endpoints and auth scaffolding from that structure. Same structure in → same code out.
- **Backend heritage:** the earlier Mayson generated CRUD APIs from database tables, supported Postgres/MariaDB (or a managed Mayson Cloud DB), JWT/UUID/encryption/password validation, external-API integration, custom exceptions, visual logic blocks, version control with rollback, and **export of clean Python code**. Custom Python code integration was listed; Java/Node/Go "in progress".
- **Deployment is part of generation:** it provisions a real database, sets up auth, and deploys to a live URL. You still configure env vars (API keys), custom domain, and check scaling. Region/data-residency control is limited.
- **Code ownership:** every file is exportable; no lock-in.
- **Pricing (docs.mayson.dev/subscription-plans):** Free tier 10 credits. **Go ₹699/mo** — 40 credits, 50 APIs/workspace, 5 collections, 10 GB DB, 5 cron tasks, 24 h logs. **Pro ₹2,599/mo** — 200 credits, 250 APIs, 25 collections, 20 GB DB, 20 crons (10 s interval), 7-day logs. Both include code export, custom domains, third-party integrations, **own database connection**, SSL. Top-ups: 10 credits ₹500 / 50 ₹2,500 / 100 ₹5,000. (Live Plan & Credits screen is the source of truth.)
- **Prompt limit: 2,000 characters per message.** Docs recommend splitting by topic: (1) purpose, users, workflow, screens, data, roles → (2) visual direction, UI states, accessibility, mobile → (3) integrations, storage, publishing, edge cases. One scoped change per follow-up.
- **Workspace tabs:** Code, Database, Analytics, **Endpoints** (APIs, WebSockets, Middlewares, Response Models, Deployment, **Packages**, Security Keys), Storage (DB, object storage, caches), Monitoring (logs, queues, workers), App Settings. Apps are Draft until Published.
- **Backend logic = "code blocks"** run top-to-bottom: Database (get/add/edit/delete), Logic (if/loops), Data, Utilities (math, datetime, JWT, encryption, UUID), Communication (email/SMS/WebSocket), **Integrations (REST API block, webhooks, AI Agent block)**, Infrastructure (cache, file storage, job scheduling), Errors (HTTP Exception), and a **custom Code Block** escape hatch. The docs do not state which language custom code uses or whether arbitrary pip packages (e.g., pyswisseph) can be installed → Phase 0 tests this.
- **Security:** keep keys in Security Keys, never in prompts/screenshots; define roles early in plain language.
- **Known limits from Mayson's own blog:** first prompt output is generic if the prompt is vague; multi-role permissions and intricate custom logic need patient iteration; unusual data models may need manual adjustment after generation.

Sources: mayson.dev, docs.mayson.dev (quickstart, prompting best practices, code blocks guide, subscription plans, security), mayson.dev/blog (deterministic generation, deployment, "what building was actually like"), Product Hunt launches, PRNewswire pre-seed release (23 Mar 2026).

## A.2 What this means for Astroday — the key build decision

Mayson is excellent at the **app shell**: users, auth, database tables, CRUD, chat history, UI, deployment.
Mayson's deterministic generator is **not** designed to invent astronomical/astrological math. Swiss-Ephemeris planetary positions, Vimshottari fractional arithmetic, dignity tables and conflict logic must be supplied as **hand-specified custom code** (this file gives every rule and constant) and verified against the golden fixture.

**Therefore the architecture is split into two parts:**

| Part | Who builds it | What it contains |
|---|---|---|
| **App shell** | Mayson (prompted) | Auth, users, customers/birth profiles, conversations, messages, UI, API gateway, LLM call, persistence |
| **Astro Engine** | Custom Python module (spec in Parts G–K) | Ephemeris, natal chart, dasha, techniques, evidence, conflict report |

Two deployment options for the Astro Engine — Phase 0 decides which:

- **Option A — RECOMMENDED DEFAULT: separate engine service.** Build the Astro Engine (Parts G–K) as a small Python FastAPI service with a coding agent (e.g., Claude Code) from this file, test it against Part L/M, deploy it (Render / Fly.io / Railway / VPS). Mayson's backend calls it with its **REST API block** (`POST /engine/analyze`, bearer token kept in Mayson Security Keys). Why default: Mayson prompts are capped at 2,000 characters, so ~30 pages of exact astro rules cannot be prompted reliably; the engine needs a native library (pyswisseph) and a pytest suite; and keeping it separate means the math is reusable even if you change app builders.
- **Option B — only if Phase 0 proves it:** the engine as a Mayson custom Code Block / package inside the app (requires Python custom code + installable `pyswisseph`). Even then, paste the engine source code you already built and tested under Option A; do not ask Mayson's agent to re-derive the math from prose.

The LLM answer step can use Mayson's **AI Agent block** or a REST call to the Anthropic API. Prefer the REST call to Anthropic if you need exact control of the system prompt in Part P; either way, the model receives only engine JSON.

## A.3 Prompting rules for Mayson (apply every phase)

0. **2,000 characters max per message.** Every prompt in Part N is pre-split into messages under that limit. Don't paste whole sections of this file into Mayson — this file is for you and for the engine's coding agent.
1. **One phase per prompt series.** Never ask for the whole app in one go. Mayson's own guidance: describe product, users, workflows, screens, data, roles first; then UI; then integrations/edge cases; then one scoped change at a time.
2. **Name every entity, field, type and relationship explicitly** (Part E gives them). The deterministic generator works from the structured model — the clearer the model, the better the code.
3. **State what must NOT happen** (e.g., "the LLM never computes planetary positions").
4. **Single role first.** Build single-user (Sahaj) end-to-end; add multi-customer later (multi-role is where Mayson needs most iteration).
5. **After each phase:** export code, run the acceptance tests in Part M, fix, then continue.
6. **Secrets:** `ANTHROPIC_API_KEY` (or other LLM key) and `ENGINE_URL`/`ENGINE_TOKEN` go in Mayson environment variables, never in code.

---

# B. PRODUCT DEFINITION

**Astroday** is a personal Vedic astrology + life-strategy intelligence app. It is NOT a horoscope generator.

**Primary user (v1):** Sahaj Sharma (owner). **v2:** any customer who onboards with birth date/time/place.

**Core loop:**
1. User onboards → birth data → engine computes full chart profile (onboarding = chart calculation).
2. User asks a natural question in English or Hinglish ("bhai aaj kya karu?", "kab shaadi hogi?", "loan close kar du?").
3. App classifies the question → selects domains → engine computes real evidence (natal promise, dasha, transits, divisional) → builds a conflict report.
4. LLM turns the structured evidence into a direct, practical answer — never inventing evidence, degrees, dates or rules.
5. Conversation memory stores user-stated facts and prior AI conclusions separately; neither ever alters chart math.

**Question types supported:** forecast/timing ("kab"), decision ("should I"), daily ("aaj kya karu"), diagnosis ("everything is stuck"), general period ("next 6 months").

**Domains (engine level, 9):** career, money, property, vehicle, relationships, family, health, education, legal.
**Question categories (answer level, broader):** CAREER, BUSINESS, MONEY, DEBT, PROPERTY, VEHICLE, MARRIAGE, RELATIONSHIP, BREAKUP, RECONCILIATION, FAMILY, FATHER, MOTHER, CHILDREN, EDUCATION, HEALTH, TRAVEL, LEGAL, PERSONAL GROWTH, DAILY DECISION, TIMING, GENERAL LIFE PERIOD, OTHER. Each maps to one or more engine domains (Part O).

---

# C. NON-NEGOTIABLE PRINCIPLES

These are the design rules that make Astroday different. Every phase must respect them. Put this section into every Mayson prompt that touches the engine or the answer layer.

1. **Compute, never invent.** Planetary degrees, signs, nakshatras, dasha dates, transit positions come only from the engine. The LLM receives them as data and may not add new ones.
2. **Natal promise ≠ timing activation.** A favourable transit cannot create a promise the natal chart lacks; a difficult chart does not mean "never".
3. **No single confidence number.** Use the structured verdicts (Part K) and convergence labels: HIGH CONVERGENCE / MODERATE CONVERGENCE / LOW CONVERGENCE / CONFLICTED / INSUFFICIENT DATA. No fake percentages.
4. **No double counting.** Findings that share the same underlying chart fact are grouped and counted once (independence groups).
5. **Show conflicts, don't average them.** If Path C says negative and Path E says positive, the answer says so.
6. **Domain-level support ≠ event-level support.** "Money looks supported" does not mean "debt closure is supported".
7. **Six distinct "no signal" states** are never collapsed: SUPPORTS, OPPOSES, NEUTRAL, NO_RELEVANT_ACTIVATION, UNAVAILABLE, NOT_TESTED.
8. **Timing precision is earned.** Windows, not exact dates, unless the technique supports day precision (dasha boundaries carry a ±2–3 day caveat).
9. **Label every rule's provenance:** CLASSICAL_BEDROCK, WIDELY_USED_VARIANT, TRADITION_SPECIFIC, PROJECT_DESIGN_CHOICE, COMPUTED_FACT, INTERPRETIVE_INFERENCE, UNKNOWN_NOT_TESTED.
10. **Unverified divisional charts are never used as if verified.** Only D1, D9, D7 are generic. D10/D4 are not (see Part S).
11. **Reality overrides astrology** for financial, legal, medical and safety decisions.
12. **No post-hoc rationalisation** when analysing past events: reconstruct the conditions first, ask what category of event they suggested, only then compare.
13. **User facts never become chart facts.** A user's statement or an earlier AI answer is conversation context only.
14. **Never fabricate missing techniques.** If something isn't implemented, the engine returns NOT_TESTED/UNAVAILABLE and the answer says so.

---

# D. SYSTEM ARCHITECTURE

```
┌──────────────────────────── MAYSON APP SHELL ─────────────────────────────┐
│  Web UI (onboarding, chat, chart view, timeline)                          │
│        │                                                                  │
│  API layer:  POST /api/customers   POST /api/ask   GET /api/chart/:id     │
│        │                                                                  │
│  Application service (orchestration only — NO astrology logic here)       │
│   1. load customer + birth data                                           │
│   2. classify question → QueryContext → AnalysisPlan (Part O)             │
│   3. call Astro Engine  ───────────────┐                                  │
│   4. build LLM request from engine JSON│                                  │
│   5. call LLM → answer_text            │                                  │
│   6. persist turn, StatedFacts, AIConclusion                              │
│  Postgres: users, customers, chart_profiles, conversations, messages,     │
│            stated_facts, ai_conclusions, engine_runs                      │
└────────────────────────────────────────┼──────────────────────────────────┘
                                         ▼
┌──────────────────────── ASTRO ENGINE (Python) ────────────────────────────┐
│ place_resolution → timezone → UTC instant                                 │
│ ephemeris (pyswisseph, Lahiri sidereal, TRUE node) → NatalChart           │
│ classical primitives (lordship, dignity, combustion, house categories)    │
│ vimshottari (MD/AD/PD)                                                    │
│ techniques: Path C (natal promise), Path E (nakshatra dispositor),        │
│             Path B (gochara transits), D9 marriage, D7 children           │
│ ashtakavarga (computed, not yet evidence-wired)                           │
│ evidence bundle → independence groups → conflict report                   │
│ knowledge-status tagging                                                  │
└───────────────────────────────────────────────────────────────────────────┘
```

**Boundary rules (enforce in code review):**
- The LLM-calling module imports nothing from the engine's computation modules. It only receives a JSON payload.
- `supporting_finding_ids`, `uncertainty_notes`, `knowledge_status_summary` are computed by app code from engine output and passed through to the client unchanged. The LLM authors only `answer_text`.
- API handlers call only the application service, never engine internals directly.
- Errors return a clean JSON `{code, message, detail}` — never a traceback.

**Tech stack:**
- Engine: Python 3.11+, `pyswisseph` (a C extension — needs a prebuilt wheel or a C compiler at install time; pin the version), `geonamescache` (offline cities), `timezonefinder`, `zoneinfo`, `fractions`. Tests: `pytest`.
- App shell: whatever Mayson generates (Python backend + web frontend + Postgres). Accept its defaults.
- LLM: Anthropic Claude via `ANTHROPIC_API_KEY` (any capable model). Provide a deterministic fallback generator for tests.

---

# E. DATA MODEL (reference — Mayson gets the condensed version in Message 1.1)

```
User
  id: uuid PK
  email: string unique
  password_hash: string
  display_name: string
  preferred_language: enum('english','hinglish') default 'hinglish'
  created_at: timestamp

Customer                      # a birth profile; v1 = one per user (Sahaj)
  id: uuid PK
  user_id: uuid FK -> User
  name: string
  birth_date: date            # local date
  birth_time: time            # local time, seconds optional
  birth_place_text: string    # as typed
  latitude: decimal(9,6)
  longitude: decimal(9,6)
  timezone: string            # IANA, e.g. 'Asia/Kolkata'
  birth_utc: timestamp
  created_at: timestamp

ChartProfile                  # summary only; full profile is recomputed deterministically
  id: uuid PK
  customer_id: uuid FK -> Customer
  engine_version: string
  ayanamsha: string           # 'LAHIRI'
  ayanamsha_value: decimal
  node_type: string           # 'TRUE'
  house_system: string        # 'WHOLE_SIGN'
  ascendant_sign: string
  moon_sign: string
  moon_nakshatra: string
  natal_json: jsonb           # planets, houses, nakshatras, D9, D7, ashtakavarga summary
  dasha_json: jsonb           # MD list + AD/PD for current & next MD
  readiness: enum('READY','PARTIAL','BLOCKED','FAILED')
  limitations: jsonb          # list of strings
  calculated_at: timestamp

Conversation
  id: uuid PK
  customer_id: uuid FK -> Customer
  title: string
  created_at: timestamp

Message
  id: uuid PK
  conversation_id: uuid FK -> Conversation
  role: enum('user','assistant')
  content: text
  question_category: string nullable
  domains: jsonb nullable                 # ['career','money']
  engine_run_id: uuid nullable FK -> EngineRun
  supporting_finding_ids: jsonb nullable
  uncertainty_notes: jsonb nullable
  knowledge_status_summary: jsonb nullable
  convergence_label: string nullable
  created_at: timestamp

StatedFact                    # what the user TOLD us; never fed to chart math
  id: uuid PK
  customer_id: uuid FK -> Customer
  message_id: uuid FK -> Message
  text: text
  category: string nullable   # career/relationship/money...
  event_date: date nullable   # for calibration events
  created_at: timestamp

AIConclusion                  # what the assistant concluded; never fed to chart math
  id: uuid PK
  customer_id: uuid FK -> Customer
  message_id: uuid FK -> Message
  text: text
  created_at: timestamp

EngineRun                     # audit trail of every computation
  id: uuid PK
  customer_id: uuid FK -> Customer
  as_of_date: date
  request_json: jsonb
  response_json: jsonb        # findings, conflict reports, timing windows
  engine_version: string
  duration_ms: integer
  created_at: timestamp

CalibrationEvent              # real life events for the historical-audit loop
  id: uuid PK
  customer_id: uuid FK -> Customer
  event_date: date
  date_precision: enum('day','month','year')
  category: string            # maps to EventType key (Part O)
  description: text
  confirmed_by_user: boolean
  created_at: timestamp

Prediction                    # predictions to audit later
  id: uuid PK
  customer_id: uuid FK -> Customer
  statement: text
  category: string
  window_start: date
  window_end: date
  convergence_label: string
  source: enum('app','legacy_pdf')
  outcome: enum('pending','hit','miss','partial','unknown') default 'pending'
  outcome_notes: text nullable
  created_at: timestamp
```

---

# F. API CONTRACT

### `POST /api/customers` — onboard (onboarding = chart calculation)
Request:
```json
{ "name": "Sahaj Sharma", "birth_date": "1998-10-12", "birth_time": "16:00",
  "birth_place": "Haridwar, Uttarakhand, India" }
```
Optional overrides: `latitude`, `longitude`, `timezone` (skip geocoding when supplied).
Response `201`:
```json
{ "customer_id": "...", "profile_id": "...", "status": "READY",
  "birth_identity": {"name":"...","birth_utc":"1998-10-12T10:30:00Z","place":"Haridwar","lat":29.95,"lon":78.16,"tz":"Asia/Kolkata"},
  "calculation_metadata": {"engine_version":"astro-1.0","ayanamsha":"LAHIRI","node":"TRUE","house_system":"WHOLE_SIGN"},
  "available_components": ["D1","D9","D7","VIMSHOTTARI_MD_AD_PD","GOCHARA_JU_SA_RA_KE","ASHTAKAVARGA"],
  "limitations": ["D10/D4 not computed generically", "Sookshma not available", "Vedha not evaluated", "..."] }
```
Errors: `400 INVALID_INPUT`, `422 AMBIGUOUS_BIRTH_PLACE` (return `candidates`), `422 BIRTH_PLACE_NOT_FOUND`, `422 TIMEZONE_UNRESOLVED`, `422 EPHEMERIS_RANGE`.

### `POST /api/ask`
Request:
```json
{ "customer_id": "...", "conversation_id": "... (optional)", "question": "kab shaadi hogi?",
  "stated_fact": "optional free text the user wants on record", "as_of": "2026-10-10 (optional)", "debug": false }
```
Response `200`:
```json
{ "conversation_id": "...", "question": "...", "question_category": "MARRIAGE",
  "domains": [{"domain":"relationships","net_read":"CONFLICTED","independent_support":1,"independent_oppose":1,"correlated":0}],
  "active_dasha": {"md":"Saturn","ad":"Jupiter","pd":"Ketu","pd_window":["2026-09-08","2026-11-01"]},
  "timing_windows": [{"basis":"DASHA","label":"Mercury MD / Venus AD","start":"2031-07-11","end":"2034-05-11","caveat":"±2-3 days"}],
  "answer": "...LLM text...",
  "supporting_finding_ids": ["..."], "uncertainty_notes": ["..."],
  "knowledge_status_summary": {"COMPUTED_FACT":3,"PROJECT_DESIGN_CHOICE":2,"TRADITION_SPECIFIC":1},
  "convergence_label": "CONFLICTED",
  "debug": null }
```
Errors: `400`, `404 CUSTOMER_NOT_FOUND`, `502 ANSWER_GENERATION_UNAVAILABLE`, `500 ENGINE_ERROR`.

### `GET /api/chart/:customer_id` — chart view data (natal_json, dasha_json, limitations).
### `GET /api/dasha/:customer_id?from=&to=` — dasha periods in a range (MD/AD/PD).
### `POST /api/calibration-events`, `GET /api/predictions`, `PATCH /api/predictions/:id` — audit loop.

### Engine endpoint (Option 2 only): `POST /engine/analyze`
Request: `{ birth: {date,time,lat,lon,tz}, as_of: "YYYY-MM-DD", domains: ["relationships"], event_key: "marriage"|null }`
Response: `{ natal, dasha_active, dasha_windows, transits, findings[], conflict_reports[], knowledge_status, limitations[] }`
Auth: bearer `ENGINE_TOKEN`.

---

# G. ASTRO ENGINE — EPHEMERIS & NATAL CHART

## G.1 Fixed conventions (all locked)

| Setting | Value | Status |
|---|---|---|
| Zodiac | Sidereal | CLASSICAL_BEDROCK |
| Ayanamsha | **Lahiri** (`swe.SIDM_LAHIRI`) | PROJECT_DESIGN_CHOICE (project instructions) |
| Lunar node | **TRUE node** (`swe.TRUE_NODE`) — verified by cross-validation against source chart | COMPUTED_FACT |
| House system | **Whole sign** from the Ascendant sign | PROJECT_DESIGN_CHOICE |
| Ephemeris | Swiss Ephemeris (Moshier built-in is enough; validated to ~0.004°) | COMPUTED_FACT |
| Planets used | Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu (Ketu = Rahu + 180°) | CLASSICAL_BEDROCK |
| Outer planets | Uranus/Neptune/Pluto: display only, never used in reasoning | PROJECT_DESIGN_CHOICE |

## G.2 Birth data → UTC
1. Resolve place offline (`geonamescache`, ~34k cities). **Never guess**: a bare ambiguous name returns `AMBIGUOUS_BIRTH_PLACE` with candidates. Allow lat/lon override.
2. Resolve timezone from lat/lon (`timezonefinder`) → IANA zone.
3. Local datetime → UTC with `zoneinfo` (handles historical offsets/DST).
4. Julian day: `swe.julday(y, m, d, hour_decimal_utc)`.

## G.3 Positions
```python
import swisseph as swe
swe.set_sid_mode(swe.SIDM_LAHIRI)
FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED   # Moshier fallback ok
lon, lat, dist, speed_lon, *_ = swe.calc_ut(jd, swe.SUN, FLAGS)[0]
retrograde = speed_lon < 0
# Rahu: swe.TRUE_NODE ; Ketu = (rahu + 180) % 360
# Ascendant (sidereal):
cusps, ascmc = swe.houses_ex(jd, lat_deg, lon_deg, b'W', swe.FLG_SIDEREAL)
ascendant_longitude = ascmc[0]
```
Sign index = `floor(lon / 30)`; degree in sign = `lon % 30`.
Signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces.

## G.4 Nakshatras
27 equal divisions of 13°20′ (= 40/3°). Index = `floor(lon / (40/3))`, pada = `floor((lon mod 40/3) / (10/3)) + 1`.
Names in order: Ashwini, Bharani, Krittika, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati.
Nakshatra lord = `["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"][index % 9]`.

## G.5 Houses
Whole sign: `house_of(sign) = (index(sign) − index(ascendant_sign)) mod 12 + 1`.

---

# H. ASTRO ENGINE — CLASSICAL PRIMITIVES

## H.1 Sign lords (CLASSICAL_BEDROCK)
Aries–Mars, Taurus–Venus, Gemini–Mercury, Cancer–Moon, Leo–Sun, Virgo–Mercury, Libra–Venus, Scorpio–Mars, Sagittarius–Jupiter, Capricorn–Saturn, Aquarius–Saturn, Pisces–Jupiter.
`house_lord(h, asc) = SIGN_LORD[SIGNS[(index(asc) + h − 1) mod 12]]`

> **Known source error — do not repeat:** the legacy PDF's "D1 House-by-House" table lists **Saturn** as the 3rd-house lord for Aquarius ascendant. Correct is **Mars** (3rd = Aries). The PDF's own "Aquarius-Lagna Functional Lordships" line is correct.

## H.2 Dignity (sign granularity) — returns Exalted / Debilitated / Own / Friendly / Neutral / Enemy
Priority order: Exalted → Debilitated → Own → natural-relationship fallback.

| Planet | Exalted sign | Debilitated sign | Own sign(s) |
|---|---|---|---|
| Sun | Aries | Libra | Leo |
| Moon | Taurus | Scorpio | Cancer |
| Mars | Capricorn | Cancer | Aries, Scorpio |
| Mercury | Virgo | Pisces | Gemini, Virgo |
| Jupiter | Cancer | Capricorn | Sagittarius, Pisces |
| Venus | Pisces | Virgo | Taurus, Libra |
| Saturn | Libra | Aries | Capricorn, Aquarius |

**Fallback (PROJECT_DESIGN_CHOICE, best-fit 4/5 vs source chart):** the **occupying planet's own natural (Naisargika) view of the sign's lord**: friend → Friendly, enemy → Enemy, otherwise Neutral. Full Panchadha Maitri (natural + temporal) was tested and scored worse (3/5) — not used.

| Planet | Natural friends | Natural enemies |
|---|---|---|
| Sun | Moon, Mars, Jupiter | Venus, Saturn |
| Moon | Sun, Mercury | — |
| Mars | Sun, Moon, Jupiter | Mercury |
| Mercury | Sun, Venus | Moon |
| Jupiter | Sun, Moon, Mars | Mercury, Venus |
| Venus | Mercury, Saturn | Sun, Moon |
| Saturn | Mercury, Venus | Sun, Moon, Mars |

Rahu/Ketu: no dignity in this system (reject; callers must handle). Moolatrikona: deliberately not implemented (report as "Own").

## H.3 Combustion (PROJECT_DESIGN_CHOICE orbs)
Combust if angular separation from Sun ≤ orb. Separation = `min(|a−b| mod 360, 360 − that)`.

| Planet | Direct orb | Retrograde orb |
|---|---|---|
| Moon | 12° | 12° |
| Mars | 17° | 17° |
| Mercury | 14° | 12° |
| Jupiter | 11° | 11° |
| Venus | 10° | 8° |
| Saturn | 15° | 15° |

Sun cannot combust itself; Rahu/Ketu have no combustion. Only Mercury/Venus orbs are validated against real chart data.

## H.4 House categories (CLASSICAL_BEDROCK, by house number only; overlaps are normal)
Kendra {1,4,7,10} · Trikona {1,5,9} · Upachaya {3,6,10,11} · Dusthana {6,8,12}

## H.5 Planet condition score (shared by Path C and Path E) — PROJECT_DESIGN_CHOICE
```
dignity:   Exalted +2, Own +1, Friendly +1, Neutral 0, Enemy −1, Debilitated −2
combust:   −1 (never for Sun)
placement: house in kendra or trikona → +1 (house 1 counted once)
           house in dusthana → −1
           else (2, 3, 11) → 0
score range −4 … +3
direction: score>0 POSITIVE · score<0 NEGATIVE ·
           score==0 and all parts 0 → NEUTRAL_INTENSITY · score==0 with cancelling parts → MIXED
strength:  |score| 0–1 WEAK · 2 MODERATE · 3–4 STRONG
```

## H.6 Domain → primary house (PROJECT_DESIGN_CHOICE over classical significations)
| Domain | House | Note |
|---|---|---|
| career | 10 | 6/2/11 noted, not scored |
| money | 2 | 11 noted, not scored |
| property | 4 | |
| vehicle | 4 | shares 4th with property (classical) |
| relationships | 7 | 5th noted, not scored |
| family | 2 | 4 mother, 9 father, 5 children — event-level, not scored |
| health | 6 | 1 and 8 noted |
| education | 5 | contested (2/4/5/9); 5 adopted |
| legal | 6 | 7/8/12 noted |

---

# I. ASTRO ENGINE — VIMSHOTTARI DASHA

## I.1 Constants (CLASSICAL_BEDROCK)
Order: Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus.
Years: Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17, Ketu 7, Venus 20 (sum 120).
Start lord = nakshatra lord of natal Moon.

## I.2 Formulas
```
nak_index     = floor(moon_lon / (40/3))
lord          = NAK_LORDS[nak_index % 9]
elapsed_frac  = (moon_lon − nak_index·40/3) / (40/3)
balance_years = (1 − elapsed_frac) × YEARS[lord]
AD duration   = MD_years × AD_lord_years / 120
PD duration   = AD_years × PD_lord_years / 120
sub-periods start from the parent lord and follow the cyclic order
```

## I.3 Locked project conventions (empirically validated against the source PDF — 6/6 day-precise boundaries)
- **Day length: 365.2425 days/year** (Gregorian). Convention A (360-day) is falsified.
- **Exact rational arithmetic** (`fractions.Fraction`) for all durations. Never round a duration and reuse it.
- **Cumulative floor:** a date is emitted as `anchor + floor(elapsed_years × 365.2425)` days, flooring only at emission.
- **Half-open, touching boundaries:** period N end date == period N+1 start date.
- **Anchors:** MDs anchor at birth date. ADs of a full MD anchor at that MD's emitted start date; PDs of a full AD anchor at that AD's emitted start date. (This is what reproduced the PDF.)
- **Birth (partial) MD:** recompute the exact balance from the Moon longitude; include only the AD/PD in progress at birth (marked `is_partial`) and later ones. Never restart a fresh cycle at birth.
- **Clip rule (fix for a known 1-day edge):** because children are re-anchored at a floored date, the last child's computed end can fall 1 day before the parent's end (e.g., Sa/Ju AD ends 2028-02-15 while Saturn MD ends 2028-02-16). **Set the last child's end = parent end.**
- **Uncertainty note:** every MD-balance-derived date carries "±2–3 days (input Moon longitude precision)".
- **Sookshma:** not implemented (no validated source). Return NOT_TESTED.
- Dates are day-level `date` only; never claim sub-day precision.

## I.4 Active dasha on a date
Return MD, AD, PD whose `[start, end)` contains the date, plus the next 3 transitions.

---

# J. ASTRO ENGINE — EVIDENCE TECHNIQUES

Each technique produces `Finding` objects (Part K). The orchestrator runs every **implemented** technique applicable to a domain and reports an explicit outcome for every registry technique: `EXECUTED`, `NOT_IMPLEMENTED`, `NOT_APPLICABLE_TO_DOMAIN`, `ELIGIBLE_BUT_NO_ADAPTER`, `EXCLUDED_BY_CALLER`, `NOT_IN_REGISTRY`. Nothing is silently skipped.

## J.1 Path C — Natal promise (`PATH_C_NATAL_PROMISE`)
For each domain: house = DOMAIN_HOUSE; lord = house lord; score lord with H.5.
- POSITIVE → `SUPPORTS`, NEGATIVE → `OPPOSES`, NEUTRAL_INTENSITY/MIXED → `NEUTRAL`.
- `independence_group` = `natal:<lord>`.
- Scope: lord condition only. Occupants of the house and aspects are NOT scored (known gap).

## J.2 Path E — Nakshatra dispositor (`PATH_E_NAKSHATRA_DISPOSITOR`)
For each domain: lord as in Path C → find the nakshatra lord of that lord's natal position = dispositor → score the dispositor with H.5.
- If dispositor is Rahu/Ketu → direction `UNKNOWN`, result `NOT_TESTED`, knowledge status `UNKNOWN_NOT_TESTED` (never fabricate a score).
- `independence_group` = `natal:<lord>|natal:<dispositor>` (sorted). If dispositor == lord → same group as Path C → correlated.

## J.3 Path B — Gochara / transits (`PATH_B_TRANSIT`, source id `GOCHARA_TRANSIT`)
Scope v1: **Jupiter, Saturn, Rahu, Ketu only**, whole-sign, counted **from natal Moon sign**.

| Planet | Favourable houses from Moon | Status |
|---|---|---|
| Jupiter | 2, 5, 7, 9, 11 | CLASSICAL_BEDROCK |
| Saturn | 3, 6, 11 | CLASSICAL_BEDROCK |
| Rahu | 3, 6, 11 (Saturn-like) | WIDELY_USED_VARIANT |
| Ketu | contested (3,6,10,11 vs 3,6,11) | TRADITION_SPECIFIC → direction UNKNOWN |

Rules:
- Domain mapping: reuse DOMAIN_HOUSE on the **Moon-counted** house (PROJECT_DESIGN_CHOICE). A transit only produces evidence for domains whose primary house equals the transit house.
- Favourable → SUPPORTS, unfavourable → OPPOSES; **strength capped at WEAK/MODERATE, never STRONG** (no Ashtakavarga/Vedha correction yet).
- **Sade Sati** (Saturn in 12th/1st/2nd from Moon) is a qualifier text on the Saturn finding, never a second finding. Name the phase (rising/peak/setting).
- Retrograde = qualifier text only; never changes direction/strength.
- Timing: the current occupancy window (ingress → egress) found by day-stepping the ephemeris and bisecting sign crossings. Multi-window retrograde loops: deferred.
- `independence_group` = `natal:Moon|transit:<planet>:<sign>`.
- Basis text must include "Vedha not evaluated; Ashtakavarga not applied".

Fast movers (Sun, Moon, Mars, Mercury, Venus): **display-only** in v1 (positions for the daily view), no evidence findings until their gochara rules are sourced.

## J.4 Divisional charts (Varga) — D9 and D7 ONLY are generic
Parashari uniform-division formula (validated exact for D9/D7 against source tables):
```
pada = floor(degree_in_sign × n / 30)
varga_sign_index = (sign_index × n + pada) mod 12
```
- **Do not use this formula for even n** (D2, D4, D10, D12, D16, D20, D24, D30, D40, D60). It is proven wrong: it forces Rahu and Ketu onto the same varga sign whenever gcd(n,12)>1, which is impossible. D10/D4 need a sourced classical rule — open research item. Mark them `NOT_AVAILABLE`.
- **D9_MARRIAGE_STRUCTURE** (relationships): take D1 7th lord; evaluate its dignity in its D9 sign and its D9 house category (counted from the D9 ascendant). Score with H.5 rules (no combustion in vargas). `independence_group` = `d9:<lord>`.
- **D7_CHILDREN_STRUCTURE** (family/children): same with D1 5th lord in D7.

## J.5 Ashtakavarga — computed, NOT evidence-wired
- Bhinnashtakavarga per planet + Sarvashtakavarga. Source tables cross-validated across vedastro.org, a classical textbook transcription, and PyJHora (P.V.R. Narasimha Rao). 52/56 cells agree; 4 cells differ → expose `convention` param (`vedastro_pdfcoffee_consensus` default, `pyjhora_pvr_rao`).
- **Invariant tests:** per-planet totals are chart-independent: Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39 = **337**.
- Vedha and Sodhya (reductions): not implemented.
- Implementation tip: port the tables from PyJHora (open source) and assert the invariants above. Do not hand-type tables from memory.
- Use: displayed in chart view and passed to the LLM as `COMPUTED_FACT` context only. Not used to score Path B yet.

## J.6 Technique registry (initial)
| ID | Domains | Implemented |
|---|---|---|
| PATH_C_NATAL_PROMISE | all 9 | yes |
| PATH_E_NAKSHATRA_DISPOSITOR | all 9 | yes |
| PATH_B_TRANSIT | all 9 | yes |
| D9_MARRIAGE_STRUCTURE | relationships | yes |
| D7_CHILDREN_STRUCTURE | family | yes |
| VIMSHOTTARI_MD_AD_PD | timing (all) | yes (as timing, not a SUPPORT/OPPOSE finding) |
| VIMSHOTTARI_SOOKSHMA | timing | no |
| D10_CAREER_STRUCTURE / D4_PROPERTY_STRUCTURE | career / property | no |
| CLASSICAL_MONEY_DHANA_YOGA | money | no |
| DEBT_RINA_CLASSICAL_ANALYSIS | money (debt_closure) | no |
| PATH_I_CONVERGENCE | all | no |
| classical legal/health/education/family/travel overlays | respective | no |

---

# K. EVIDENCE, CONFLICT AND KNOWLEDGE-STATUS MODEL

## K.1 Finding
```
finding_id, technique_id, domain, event_key|null, required_varga ('D1'|'D9'|'D7'),
evidence_type, validation_status, result, strength (WEAK|MODERATE|STRONG),
independence_group, explanation, provenance, knowledge_status, timing|null
```
`result` ∈ SUPPORTS, OPPOSES, NEUTRAL, NO_RELEVANT_ACTIVATION, UNAVAILABLE, NOT_TESTED (never collapse).

## K.2 EvidenceBundle
`{domain, event_key|null, evaluation_date, findings[]}` — validates domain and event_key against the ontology (Part O).

## K.3 Conflict report algorithm (implement exactly)
1. Group findings by `independence_group`.
2. Group verdict:
   - 1 finding → map result: SUPPORTS→SUPPORT, OPPOSES→OPPOSES, NEUTRAL→NEUTRAL, NO_RELEVANT_ACTIVATION→UNVALIDATED, NOT_TESTED→UNVALIDATED, UNAVAILABLE→UNAVAILABLE.
   - >1 finding, all same result → CORRELATED_NON_INDEPENDENT.
   - >1 finding, different results → CONFLICTED.
3. Net read (first rule that applies):
   1. any CONFLICTED group → CONFLICTED
   2. support groups AND oppose groups → CONFLICTED
   3. support groups → SUPPORT
   4. oppose groups → OPPOSES
   5. correlated groups → CORRELATED_NON_INDEPENDENT
   6. only unvalidated → UNVALIDATED; only unavailable → UNAVAILABLE; both → UNVALIDATED
   7. else NEUTRAL
4. Report: groups, net_read, independent_support_group_count, independent_oppose_group_count, correlated_group_count, notes. Correlated groups are never counted as independent support.

> Known limitation (document, don't hide): independence uses exact string match. Path E's group always contains Path C's fact plus one more, so partial overlaps score as independent. Open design item.

## K.4 Event specificity
Count distinct named `event_key`s on SUPPORTS findings. `event_key=null` findings never create event-level support. Output: NO_EVENT_LEVEL_SUPPORT / SINGLE_EVENT_SUPPORTED / MULTIPLE_EVENTS_SUPPORTED. Example that must hold: money domain SUPPORT + debt_closure NO_EVENT_LEVEL_SUPPORT.

## K.5 Knowledge status (7 values)
CLASSICAL_BEDROCK, WIDELY_USED_VARIANT, TRADITION_SPECIFIC, PROJECT_DESIGN_CHOICE, COMPUTED_FACT, INTERPRETIVE_INFERENCE, UNKNOWN_NOT_TESTED.
Overrides: Path E node dispositor → UNKNOWN_NOT_TESTED; Path B Ketu → TRADITION_SPECIFIC.

## K.6 Convergence label (answer-level, for the user)
Derived per question from the primary domain's conflict report + timing:
- **HIGH CONVERGENCE:** net SUPPORT (or OPPOSES) from ≥3 independent groups including at least one natal (C/E/D9/D7) and one timing (dasha lord or transit) layer, no conflicted groups.
- **MODERATE CONVERGENCE:** net SUPPORT/OPPOSES from 2 independent groups.
- **LOW CONVERGENCE:** 1 independent group, or only correlated evidence.
- **CONFLICTED:** net CONFLICTED.
- **INSUFFICIENT DATA:** UNVALIDATED/UNAVAILABLE/NEUTRAL only, or required technique not implemented.
(Thresholds are PROJECT_DESIGN_CHOICE — keep configurable.)

---

# L. GOLDEN FIXTURE — SAHAJ'S CHART WITH EXPECTED OUTPUTS

## L.1 Birth data
- Name: Sahaj Sharma · Born **12 Oct 1998, 16:00 IST** · **Haridwar, Uttarakhand, India** · lat **29.95 N**, lon **78.16 E** · tz Asia/Kolkata (UTC+5:30) → **1998-10-12 10:30 UTC**
- Ayanamsha Lahiri **23.84003°** (1998)

## L.2 D1 positions (source PDF; engine must match within 0.02°)
| Body | Sign | Degree | Abs. long. | Retro | Nakshatra-pada | Nak. lord | House |
|---|---|---|---|---|---|---|---|
| Ascendant | Aquarius | 16°41′53″ | 316.698 | – | Shatabhisha-4 | Rahu | 1 |
| Sun | Virgo | 25°03′23″ | 175.056 | D | Chitra-1 | Mars | 8 |
| Moon | Gemini | 24°42′24″ | 84.707 | D | Punarvasu-2 | Jupiter | 5 |
| Mars | Leo | 9°09′50″ | 129.164 | D | Magha-3 | Ketu | 7 |
| Mercury | Libra | 6°40′20″ | 186.672 | D | Swati-1 | Rahu | 9 |
| Jupiter | Aquarius | 26°00′48″ | 326.013 | R | Purva Bhadrapada-2 | Jupiter | 1 |
| Venus | Virgo | 20°28′58″ | 170.483 | D | Hasta-4 | Moon | 8 |
| Saturn | Aries | 7°13′08″ | 7.219 | R | Ashwini-3 | Ketu | 3 |
| Rahu (true) | Leo | 4°49′30″ | 124.825 | R | Magha-2 | Ketu | 7 |
| Ketu | Aquarius | 4°49′30″ | 304.825 | R | Dhanishta-4 | Mars | 1 |

(Display-only: Uranus Capricorn 14°59′ R, Neptune Capricorn 5°32′, Pluto Scorpio 12°20′.)

> Node note: the Full Decode PDF's table prints Rahu/Ketu at 6.50° (that is the **mean** node); the saved birth-chart data gives 4°49′30″, the **true** node. The engine uses the true node (decided by cross-validation in the earlier build). D9/D7 results are identical either way for this chart.

## L.3 House lords (Aquarius ascendant)
1 Saturn · 2 Jupiter · **3 Mars** · 4 Venus · 5 Mercury · 6 Moon · 7 Sun · 8 Mercury · 9 Venus · 10 Mars · 11 Jupiter · 12 Saturn

## L.4 Planet condition (H.5) — expected
| Planet | Dignity | Combust (sep°) | House | Score | Direction | Strength |
|---|---|---|---|---|---|---|
| Sun | Neutral | – | 8 | −1 | NEGATIVE | WEAK |
| Moon | Friendly* | no (90.4) | 5 | +2 | POSITIVE | MODERATE |
| Mars | Friendly | no (45.9) | 7 | +2 | POSITIVE | MODERATE |
| Mercury | Friendly | **yes (11.6)** | 9 | +1 | POSITIVE | WEAK |
| Jupiter | Neutral | no | 1 | +1 | POSITIVE | WEAK |
| Venus | Debilitated | **yes (4.6)** | 8 | −4 | NEGATIVE | STRONG |
| Saturn | Debilitated | no | 3 | −2 | NEGATIVE | MODERATE |

*The source PDF says Moon "Neutral"; the adopted rule gives Friendly. Documented as a probable source inconsistency — the engine follows the rule.

## L.5 Path C / Path E / combined — expected
| Domain | House → lord | Path C | Path E dispositor | Path E | Expected net read |
|---|---|---|---|---|---|
| career | 10 → Mars | POSITIVE MODERATE (SUPPORTS) | Ketu | NOT_TESTED (node) | SUPPORT (1 group) + UNVALIDATED |
| money | 2 → Jupiter | POSITIVE WEAK | Jupiter (self) | POSITIVE WEAK | **CORRELATED_NON_INDEPENDENT** |
| property | 4 → Venus | NEGATIVE STRONG (OPPOSES) | Moon | POSITIVE MODERATE | **CONFLICTED** |
| vehicle | 4 → Venus | NEGATIVE STRONG | Moon | POSITIVE MODERATE | **CONFLICTED** |
| relationships | 7 → Sun | NEGATIVE WEAK | Mars | POSITIVE MODERATE | **CONFLICTED** |
| family | 2 → Jupiter | POSITIVE WEAK | Jupiter (self) | POSITIVE WEAK | **CORRELATED_NON_INDEPENDENT** |
| health | 6 → Moon | POSITIVE MODERATE | Jupiter | POSITIVE WEAK | SUPPORT (2 groups) |
| education | 5 → Mercury | POSITIVE WEAK | Rahu | NOT_TESTED (node) | SUPPORT (1 group) |
| legal | 6 → Moon | POSITIVE MODERATE | Jupiter | POSITIVE WEAK | SUPPORT (2 groups) |

(These are C+E only. Adding Path B/D9/D7 changes counts but must keep MONEY/FAMILY correlated and PROPERTY conflicted.)

## L.6 D9 and D7 — expected (must match exactly)
| Body | D9 | D7 |
|---|---|---|
| Ascendant | Pisces | Taurus |
| Sun | Leo | Leo |
| Moon | Taurus | Scorpio |
| Mars | Gemini | Libra |
| Mercury | Sagittarius | Scorpio |
| Jupiter | Taurus | Leo |
| Venus | Cancer | Cancer |
| Saturn | Gemini | Taurus |
| Rahu | Taurus | Virgo |
| Ketu | Scorpio | Pisces |

## L.7 Vimshottari — expected
Moon 84.71° (PDF 2-decimal value), Punarvasu → Jupiter MD, **balance 10.348 y** (PDF: 10.35).

**Mahadashas (engine, Moon = 84.71°):**
| MD | Start | End |
|---|---|---|
| Jupiter (partial) | 1998-10-12 | 2009-02-15 |
| Saturn | 2009-02-15 | 2028-02-16 |
| Mercury | 2028-02-16 | 2045-02-15 |
| Ketu | 2045-02-15 | 2052-02-15 |
| Venus | 2052-02-15 | 2072-02-15 |
| Sun | 2072-02-15 | 2078-02-15 |

PDF states Mercury MD start **2028-02-18**; engine gives 2028-02-16 at 84.71° (with the arc-second Moon 84.7067° it gives 2028-02-17). The 2-day gap is fully explained by the PDF's 2-decimal Moon rounding — this is the documented ±2–3 day envelope.

**Day-precise acceptance (anchor Mercury MD at the PDF's 2028-02-18; must match exactly):**
| Period | Start | End |
|---|---|---|
| Me/Mercury AD | 2028-02-18 | 2030-07-16 |
| Me/Ketu AD | 2030-07-16 | 2031-07-13 |
| Me/Venus AD | 2031-07-13 | 2034-05-13 |
| Me/Sun AD | 2034-05-13 | 2035-03-20 |
| Me/Me/Venus PD | 2028-08-11 | 2029-01-05 |
| Me/Me/Sun PD | 2029-01-05 | 2029-02-18 |

**Saturn MD Antardashas (engine, anchored at 2009-02-15):**
Sa/Sa 2009-02-15→2012-02-18 · Sa/Me →2014-10-28 · Sa/Ke →2015-12-07 · Sa/Ve →2019-02-06 · Sa/Su →2020-01-19 · Sa/Mo →2021-08-19 · Sa/Ma →2022-09-28 · Sa/Ra →2025-08-04 · **Sa/Ju 2025-08-04→2028-02-16** (clipped to MD end).

**Sa/Ju Pratyantardashas:**
Ju 2025-08-04→2025-12-05 · Sa →2026-04-30 · Me →2026-09-08 · **Ke 2026-09-08→2026-11-01** · Ve →2027-04-05 · Su →2027-05-21 · Mo →2027-08-06 · Ma →2027-09-29 · Ra →2028-02-16.

**Active on 2026-10-10:** Saturn MD / Jupiter AD / Ketu PD (2026-09-08 → 2026-11-01).

## L.8 Legacy PDF predictions — load as `Prediction` rows (source = legacy_pdf, outcome = pending)
These are **hypotheses to audit**, not facts. Do not display them as engine output.
| Claim | Window |
|---|---|
| Career breakthrough | Feb 2028 |
| Marriage | Nov 2028 – Feb 2029 (alt: early 2032) |
| Next significant car | Oct–Dec 2028 |
| EMI manageable | ~mid-2029 |
| Property acquisition | Dec 2031 – Feb 2032 |
| Substantial debt clearance | Dec 2032 – May 2033 |
| First child | early–mid 2033 |
| Financial stability | mid-2033 |
| Sade Sati (Saturn 12th/1st/2nd from Moon: Taurus→Gemini→Cancer) | ~2030–2037 (verify with ephemeris) |
| Rahu over natal lagna/Ketu; Ketu over 7th Mars-Rahu | 2026–27 (verify with ephemeris) |

Legacy "canon event" themes for the past (to be confirmed by the user before becoming `CalibrationEvent`s): first-love/worth-wound ~2015–19 (Sa/Ve), career ignition ~2021–22 (Sa/Ma), ambition surge ~2022–25 (Sa/Ra), reinvention ~2026–28 (Sa/Ju).

---

# M. ACCEPTANCE TESTS (run after every phase)

**Engine**
1. Sahaj D1: every body within 0.02° of L.2; retrograde flags match; true node used.
2. Ascendant Aquarius; Moon nakshatra Punarvasu pada 2.
3. House lords = L.3 (3rd = Mars).
4. Planet conditions = L.4 exactly.
5. D9/D7 = L.6 exactly. Even-n vargas return NOT_AVAILABLE.
6. Dasha: Jupiter balance 10.348 y; MDs per L.7; the six PDF-anchored boundaries match to the day; adjacent periods touch; last child clipped to parent end.
7. Active dasha 2026-10-10 = Saturn / Jupiter / Ketu.
8. Path C/E table = L.5; MONEY & FAMILY → CORRELATED_NON_INDEPENDENT; PROPERTY, VEHICLE, RELATIONSHIPS → CONFLICTED.
9. Node dispositor → NOT_TESTED + UNKNOWN_NOT_TESTED; never a score.
10. Path B: never STRONG; Sade Sati only as a qualifier; Ketu direction UNKNOWN.
11. Ashtakavarga totals 48/49/39/54/56/52/39 = 337 for Sahaj and two other charts, both conventions.
12. Event specificity: money SUPPORT ≠ debt_closure support.
13. Reproducibility: the same birth input twice → identical output.
14. Isolation: two other customers (e.g., Mumbai 1990-05-01; London 2001) produce different ascendants/findings; none ever equals Sahaj's.
15. Ambiguous place ("Delhi" without country if multiple) → 422 with candidates, never auto-picked.

**App**
16. LLM module has no import path to engine computation code.
17. `supporting_finding_ids`, `uncertainty_notes`, `knowledge_status_summary` in the response equal the engine-computed values exactly.
18. A `stated_fact` does not change the chart (byte-identical natal_json before/after).
19. Asking the same question twice (with an AIConclusion in between) gives identical domain evidence.
20. Errors never contain tracebacks.
21. Hinglish routing: each sample question in Part O.3 maps to the expected category/domains.
22. Missing `ANTHROPIC_API_KEY` → deterministic fallback answer clearly labelled, or 502 — never a fake success.

---

# N. BUILD PLAN — ENGINE FIRST, THEN MAYSON (prompts pre-split under 2,000 chars)

## N.0 Order of work
1. **Engine (outside Mayson):** give Parts C, G–M of this file to a coding agent (Claude Code) and ask it to build `astro-engine` as a FastAPI service with pytest. Run every Part M engine test. Deploy it. Note `ENGINE_URL` and `ENGINE_TOKEN`.
2. **Phase 0 in Mayson:** capability probe (decides Option A vs B; default A).
3. **Mayson Phases 1–7:** paste the messages below, one at a time, checking the result after each.
4. Export Mayson code to GitHub after every phase (the last build was lost because nothing was pushed).

Engine prompt for the coding agent (no length limit there):
> Build `astro-engine`, a Python 3.11 FastAPI service, exactly from Parts C and G–M of ASTRODAY_MAYSON_BUILD_SPEC.md. Endpoints: `POST /engine/onboard` (birth → natal_json, dasha_json, limitations), `POST /engine/analyze` (birth, as_of, domains, event_key → active dasha, timing windows, transits, findings, conflict reports, event specificity, knowledge statuses, convergence label, limitations), `GET /engine/dasha` (range). Bearer-token auth. Write pytest tests for every engine item in Part M using the golden fixture in Part L; all must pass before deployment. Never invent rules not in the spec; unimplemented techniques return NOT_TESTED/NOT_AVAILABLE.

## N.1 Phase 0 — capability probe (1 message)
**Message 0.1**
```
Create a tiny test app called "Engine Probe". One backend endpoint GET /probe. Inside it, use a custom Code Block to: (1) report which programming language Code Blocks run in, (2) try to import the Python package "swisseph" (pip name: pyswisseph) and, if it imports, return the sidereal Lahiri Sun longitude for Julian day 2451545.0, (3) use a REST API block to call https://httpbin.org/get and return the status code. Return all three results as JSON. Also tell me whether I can add packages under Endpoints > Packages. Nothing else — no UI.
```
Pass criteria: Python + pyswisseph works (Sun ≈ 256.5°) → Option B possible. Otherwise Option A (default). REST call works → Option A confirmed viable.

## N.2 Phase 1 — app shell (3 messages)
**Message 1.1 — product, users, workflows, data**
```
Build "Astroday", a personal Vedic astrology + life-strategy advisor. Single role for now: Owner (logs in with email OTP or Google). Owner can create birth Profiles and chat with the advisor about one profile.

Data objects:
- Profile: name, birth_date, birth_time, birth_place, latitude, longitude, timezone, birth_utc, status (READY/BLOCKED), natal_json (json), dasha_json (json), limitations (json list), calculated_at.
- Conversation: profile, title, created_at.
- Message: conversation, role (user/assistant), content, question_category, domains (json), convergence_label, supporting_finding_ids (json), uncertainty_notes (json), knowledge_status_summary (json), engine_run, created_at.
- StatedFact: profile, message, text, category, event_date.
- AIConclusion: profile, message, text.
- EngineRun: profile, as_of_date, request_json, response_json, duration_ms.
- CalibrationEvent: profile, event_date, date_precision (day/month/year), category, description, confirmed.
- Prediction: profile, statement, category, window_start, window_end, convergence_label, source (app/legacy_pdf), outcome (pending/hit/miss/partial/unknown), outcome_notes.

Screens: Onboarding, Chat (home), Today, Chart, Timeline, Audit. Owner sees only their own records. Do not implement any astrology math in this app — all astrology comes from an external engine API added later.
```

**Message 1.2 — UI**
```
UI direction for Astroday: mobile-first, calm dark theme with light-mode option, one accent colour (deep indigo), clear typography, generous spacing. Layout: bottom tab bar on mobile (Chat, Today, Chart, Timeline, Audit), left sidebar on desktop.

Chat: message list, input box, quick-prompt chips ("Aaj kya karu?", "Next 6 months", "Kab shaadi hogi?", "Career"). Under each assistant answer show: domain chips coloured by verdict (SUPPORT green, OPPOSES red, CONFLICTED amber, CORRELATED blue-grey, UNVALIDATED/UNAVAILABLE grey), a convergence label badge, a collapsible "Why" panel listing findings with small knowledge-status tags, and one muted uncertainty line.

Onboarding: name, date, time, place; if the place is ambiguous show a list of candidate cities to pick from; optional lat/lon/timezone fields under "Advanced".

States for every screen: empty, loading (skeletons), error (plain message + retry), success. Accessible labels, focus states, good contrast, reduced motion.
```

**Message 1.3 — stubs**
```
Add a backend function call_engine(path, payload) that, for now, returns fixed sample JSON. Add these endpoints: POST /api/profiles (create profile + call_engine("/engine/onboard") and save natal_json, dasha_json, limitations, status), GET /api/profiles/:id/chart, POST /api/ask (question, optional stated_fact, optional as_of), GET /api/predictions, PATCH /api/predictions/:id, POST /api/calibration-events. Every error returns JSON {code, message, detail} with no stack traces. Keep everything else unchanged.
```

## N.3 Phase 2 — connect the engine (2 messages)
**Message 2.1**
```
Replace the stub call_engine with a real REST API block call to the external Astro Engine. Base URL from Security Key ENGINE_URL, header "Authorization: Bearer <ENGINE_TOKEN>" from Security Key ENGINE_TOKEN. Timeout 20 s. Map engine errors: 422 AMBIGUOUS_BIRTH_PLACE (pass the candidates list to the onboarding UI), 422 BIRTH_PLACE_NOT_FOUND, 422 TIMEZONE_UNRESOLVED, 422 EPHEMERIS_RANGE, anything else → 500 ENGINE_ERROR. Save every call as an EngineRun (request, response, duration). Never alter numbers returned by the engine.
```

**Message 2.2**
```
Chart screen: render natal_json as tables — (1) planets: body, sign, degree, retrograde, nakshatra-pada, nakshatra lord, house; (2) house lords 1–12; (3) planet condition: dignity, combust, score, direction, strength; (4) D9 and D7 tables; (5) Ashtakavarga grid if present; (6) a "Limitations" list from limitations. Timeline screen: horizontal bars for Mahadasha → Antardasha → Pratyantardasha from dasha_json with a "today" marker and the next 3 transitions listed. Empty/loading/error states as before.
```

## N.4 Phase 3 — ask flow with the LLM (3 messages)
**Message 3.1 — pipeline**
```
Implement POST /api/ask: (1) load the profile; (2) call engine POST /engine/analyze with birth data, as_of (default today, Asia/Kolkata), and question text — the engine returns question_category, domains, findings, conflict reports, active dasha, timing windows, transits, convergence_label, uncertainty_notes, knowledge_status_summary, limitations; (3) load the last 10 StatedFacts and AIConclusions for this profile; (4) call the LLM (step in next message) with ONLY that data; (5) save the user Message, assistant Message, EngineRun, any new StatedFact, and an AIConclusion (first 2 sentences of the answer). The fields supporting_finding_ids, uncertainty_notes, knowledge_status_summary and convergence_label are copied from the engine response unchanged — the LLM never writes them.
```

**Message 3.2 — LLM call**
```
For the LLM step use a REST API block to Anthropic's Messages API (key in Security Key ANTHROPIC_API_KEY), max_tokens 1500. System prompt is stored as an app setting named ASTRODAY_SYSTEM_PROMPT (I will paste it). User content = a JSON object: question, question_category, language, as_of, chart_summary, active_dasha, timing_windows, transits, domains (with findings), event_specificity, convergence_label, limitations, uncertainty_notes, stated_facts (labelled "user said"), prior_conclusions (labelled "your earlier opinion"). If the key is missing or the call fails, return 502 ANSWER_GENERATION_UNAVAILABLE — never a made-up answer.
```
Then paste Part P.1 (the system prompt) into the app setting by hand.

**Message 3.3 — stated facts**
```
In Chat, add a small "Add a fact about my life" button that opens a field; the text is saved as a StatedFact for the profile and sent with the next question. Show saved facts in a list on the Audit screen with edit/delete. StatedFacts and AIConclusions are only ever sent to the LLM as context — they must never be sent to the engine.
```

## N.5 Phase 4 — Today screen (1 message)
```
Today screen: on open, call engine /engine/analyze with question "daily overview" and as_of today. Show: date, active Mahadasha/Antardasha/Pratyantardasha with end dates, Moon sign and nakshatra today, Jupiter/Saturn/Rahu/Ketu house from natal Moon and from Ascendant, Sade Sati status if present, positions of fast planets (display only). Then a "Plan for today" card generated by the same LLM step with format: Main Priority, Top 3 Actions, Avoid, Astrological Weather, Practical Strategy. Cache the result per profile per day.
```

## N.6 Phase 5 — Audit loop (1 message)
```
Audit screen: table of Predictions (statement, category, window, convergence label, source, outcome) with filters by outcome and source, and an inline editor to set outcome (hit/miss/partial/unknown) with notes. Below it, CalibrationEvents list + "Add event" form (date, precision, category, description, confirmed checkbox). Seed the Predictions table for my profile from the CSV I will upload (source = legacy_pdf, outcome = pending). A Prediction's window_end passing while outcome is pending shows a "needs review" chip.
```
CSV to upload = Part L.8 rows.

## N.7 Phase 6 — polish & publish (1–2 messages)
```
Before publishing: check every screen's empty/loading/error/success states, make sure a user can only ever see their own profiles, conversations and facts, set app title "Astroday", meta description, and preview image. Then publish.
```

## N.8 Phase 7 — multi-customer (later)
```
Add a second role, Client, who can only see their own profile and chats; Owner can see all profiles. Owner can invite a client by email. Keep all existing behaviour unchanged.
```

## N.9 Debugging prompt pattern (from Mayson docs: name the layer, one change)
```
On [screen], when I [action], I expect [result] but see [actual]. The failing layer looks like [UI / endpoint / database / external API]. Fix only this; don't change layout, data model or permissions.
```

---

# O. QUERY UNDERSTANDING

> In the recommended Option A the classifier below lives in the engine service, and `/engine/analyze` returns `question_category` and `domains`.

## O.1 Category → engine domains + techniques
| Category | Domains | Key houses/karakas for the LLM to discuss |
|---|---|---|
| CAREER / BUSINESS | career (+money) | 10H/10L, 6H, 2H/11H, D10 (not available — say so) |
| MONEY / DEBT | money | 2H/11H; debt → 6H; debt_closure needs event-level evidence (none yet) |
| PROPERTY | property | 4H/4L, Venus/Mars/Moon, D4 (not available) |
| VEHICLE | vehicle | 4H/4L, Venus |
| MARRIAGE / RELATIONSHIP / BREAKUP / RECONCILIATION | relationships | 7H/7L, Venus, D9, 5H for romance |
| FAMILY / FATHER / MOTHER / CHILDREN | family | 2H; father 9H/Sun; mother 4H/Moon; children 5H/Jupiter + D7 |
| EDUCATION | education | 5H (+4H, 9H) |
| HEALTH | health | 6H, 1H, 8H — never medical advice |
| LEGAL | legal | 6H, 7H, 8H/12H — never legal advice |
| TRAVEL | none implemented → INSUFFICIENT DATA for technique evidence; dasha/transit context only |
| DAILY DECISION / TIMING / GENERAL LIFE PERIOD / PERSONAL GROWTH | scan all 9 | |

## O.2 Event keys (ontology)
career: job_change, career_switch, promotion, business_launch, business_expansion, business_contraction · money: income_increase, debt_closure, debt_accumulation, windfall, financial_restructuring, major_investment · property: property_purchase, property_sale, relocation · vehicle: vehicle_purchase · relationships: marriage, engagement, breakup, reconciliation, new_relationship · family: child_birth, family_conflict, father_related_event, mother_related_event · health: health_event, health_recovery · education: education_start, education_completion · legal: legal_dispute, legal_resolution.

## O.3 Keyword seed (extend over time) + required routing tests
| Example question | Category | Domains | Event |
|---|---|---|---|
| bhai aaj kya karu? | DAILY DECISION | all | – |
| kaam fas gaya hai | CAREER (diagnose) | career, money | – |
| ye decision sahi hai? | DAILY DECISION | all (ask what decision) | – |
| loan close kar du? | DEBT | money | debt_closure |
| business ka kya karu? | BUSINESS | career, money | business_* |
| job change karu? | CAREER | career | job_change |
| relationship ka kya scene hai? | RELATIONSHIP | relationships | – |
| kab ghar lunga? | PROPERTY | property | property_purchase |
| kab gaadi lunga? | VEHICLE | vehicle | vehicle_purchase |
| kab shaadi hogi? | MARRIAGE | relationships | marriage |
| ye opportunity accept karu? | DAILY DECISION | career, money | – |
| mere liye next 6 months kaise hain? | GENERAL LIFE PERIOD | all | – |
| abhi planets kya kar rahe hain? | TIMING | all (transit view) | – |
| why is everything stuck? | GENERAL LIFE PERIOD | all (scan, rank active) | – |

Keyword hints: shaadi/marriage/wife/rishta → relationships; ghar/flat/plot/property → property; gaadi/car/bike → vehicle; naukri/job/office/boss/promotion → career; business/dhandha/startup → career+money; paisa/salary/income/loan/EMI/karza → money; papa/father → family(father); mummy/mother → family(mother); baccha/child → family(child_birth); padhai/exam/course → education; case/court/legal → legal; health/bimari → health; aaj/today → daily; kab → timing.

---

# P. LLM ANSWER LAYER

## P.1 System prompt (use as-is; fill `{language}`)
```
You are Astroday, a Vedic astrology reasoning engine and practical life-strategy advisor.
You receive a JSON payload computed by a deterministic astrology engine. You write the answer text only.

HARD RULES
- Use ONLY positions, dates, findings and rules present in the payload. Never invent degrees,
  dasha dates, transits, yogas, divisional placements or classical quotations.
- If a needed technique is NOT_TESTED/UNAVAILABLE/NOT_IMPLEMENTED, say so plainly.
- Never upgrade UNKNOWN_NOT_TESTED or TRADITION_SPECIFIC evidence to certainty.
- Never give a percentage. Use the convergence_label provided.
- Separate NATAL PROMISE from TIMING ACTIVATION. A transit cannot create a missing promise.
- If findings conflict, explain the conflict; do not average it.
- Domain-level support is not event-level support.
- Give windows, not exact dates, unless the payload gives day-level dasha boundaries
  (then mention the ±2–3 day caveat).
- Astrology never overrides financial, legal, medical or safety reality. For decisions,
  give REAL-WORLD CASE, ASTROLOGICAL TIMING, SYNTHESIS.
- For past events: reconstruct conditions first, say what category they suggested,
  then compare. No post-hoc precision.
- stated_facts are what the user said; prior_conclusions are your earlier opinions.
  Treat both as context, not chart facts. Point out if they conflict with the evidence.
- Be direct, specific, practical. No flattery, no "trust the universe", no horoscope prose.
- If the chart does not resolve the question, say:
  "The chart does not give enough resolution to answer this reliably."
- Reply in {language}; Hinglish is fine when the user writes Hinglish.
  Address the user respectfully ("aap").
```

## P.2 Answer formats
**Forecast/timing:** Direct Answer → Why → Timing (earliest / strongest / most likely / possible delay window) → Supporting Signals (D1, Dasha, Transit, Divisional, Historical calibration) → Contradictory Signals → What It Probably Means In Real Life → What To Do → What NOT To Do → Confidence Type (label + why).

**Decision ("should I"):** Real-World Case (upside, downside, money, opportunity cost, risk, reversibility) → Astrological Timing (supportive/restrictive and why) → Synthesis → Verdict: DO IT / WAIT / DON'T DO IT / DO IT WITH MODIFICATIONS.

**Daily ("aaj kya karu"):** Today's date + active MD/AD/PD → Main Priority → Top 3 Actions → Avoid → Astrological Weather → Practical Strategy (covering career, money, relationships, communication, decisions, energy).

**Diagnosis ("stuck"):** first the real bottleneck (money, people, planning, execution, dependency, information, fear, timing) → then astrology → what's controllable → action → when it changes.

Simple questions get short answers — don't force the full structure.

## P.3 LLMAnswerRequest (payload to the LLM)
```json
{ "question": "...", "question_category": "...", "language": "hinglish",
  "as_of": "2026-10-10",
  "chart_summary": {"ascendant":"Aquarius","moon":"Gemini / Punarvasu-2","key_conditions":[...]},
  "active_dasha": {...}, "timing_windows": [...], "transits": [...],
  "domains": [{"domain":"...","net_read":"...","findings":[{"id":"...","technique":"...","result":"...","strength":"...","explanation":"...","knowledge_status":"..."}],"notes":[...]}],
  "event_specificity": "...", "convergence_label": "...",
  "limitations": [...], "uncertainty_notes": [...],
  "stated_facts": [...], "prior_conclusions": [...] }
```

---

# Q. CONVERSATION MEMORY MODEL

- **StatedFact:** verbatim user statements ("I left my job in March 2025"). Stored, shown to the LLM as labelled context. Can be promoted to a `CalibrationEvent` only when the user confirms category + date.
- **AIConclusion:** each assistant answer's core conclusion. Shown to future turns labelled as "your earlier opinion".
- **Structural guarantee:** chart/engine code never reads StatedFact or AIConclusion tables. Test this (Part M 18–19).
- **Pattern recognition:** the LLM may point out recurring patterns across StatedFacts, citing them. It must not diagnose mental-health conditions.

---

# R. UI SPECIFICATION

Mobile-first, clean, dark/light. Screens:
1. **Onboarding:** name, date, time, place with autocomplete; on ambiguity show candidate cities; optional lat/lon/tz.
2. **Chat (home):** messages; under each answer show chips per domain coloured by net read (SUPPORT green, OPPOSES red, CONFLICTED amber, CORRELATED grey-blue, UNVALIDATED/UNAVAILABLE grey), the convergence label, and a collapsible "Why / evidence" panel listing findings with knowledge-status badges and the uncertainty line. Quick prompts: "Aaj kya karu?", "Next 6 months", "Kab shaadi?", "Career".
3. **Today:** active MD/AD/PD, today's Moon, slow-planet transits from Moon/Lagna, Sade Sati status, daily plan.
4. **Chart:** D1 table (L.2 shape), house-lord table, planet conditions, D9/D7 tables, Ashtakavarga grid, "Limitations" list.
5. **Timeline:** horizontal MD → AD → PD bars, today marker, upcoming transitions.
6. **Audit:** predictions with windows and outcomes; calibration events.

Never show raw stack traces or internal IDs to the user (debug panel only when `debug=true`).

---

# S. KNOWN GAPS — DO NOT BUILD OR FAKE (YET)

| Gap | Status | What the app must do |
|---|---|---|
| D10 (career), D4 (property), all even-n vargas | No verified classical rule | Return NOT_AVAILABLE; answer says D10/D4 not used |
| D2, D3, D12, D16, D20, D24, D27, D30, D40, D45, D60 | Not sourced | NOT_AVAILABLE |
| Sookshma dasha | No validated source | NOT_TESTED |
| Vedha, Sodhya Ashtakavarga | Not implemented | Mention in Path B basis |
| Ashtakavarga → transit strength | Not wired | Path B capped below STRONG |
| Fast-planet gochara findings | Not sourced | Display only |
| Degree aspects / graha drishti | Not implemented | Path C/E are aspect-free; say so when relevant |
| House occupants in Path C/E | Not scored | LLM may mention occupants from natal_json as context, labelled INTERPRETIVE_INFERENCE |
| Yogas (Dhana, Parivartana etc.) | Not implemented | Do not claim yogas as computed. Legacy PDF mentions a Mercury–Venus parivartana — treat as unverified legacy claim |
| Path I (convergence detector) | Not built | Use K.6 label instead |
| independence_groups partial overlap | Open design item | Document limitation |
| Ketu favourable houses | Contested | direction UNKNOWN |
| Moolatrikona | Not implemented | Reported as Own |
| Historical-observation registry | Empty | Populate only from user-confirmed CalibrationEvents |

**Lessons from the previous build (don't repeat):**
- The previous sandbox was lost because code wasn't pushed anywhere durable → export from Mayson and push to GitHub after every phase.
- Prior audit docs contained inaccuracies → always run the tests; don't trust a report.
- `pyswisseph` was an undocumented dependency → pin it in requirements.
- A convergence check of "≥2 paths" was trivially satisfied because natal and transit paths are disjoint by type → convergence must require independent groups across layers (K.6), not just path count.

---

# T. GLOSSARY

- **Lagna / Ascendant:** rising sign; house 1.
- **Graha:** planet. **Rashi:** sign. **Bhava:** house.
- **Nakshatra:** one of 27 lunar mansions (13°20′ each); each has a Vimshottari lord.
- **Mahadasha (MD) / Antardasha (AD) / Pratyantardasha (PD) / Sookshma:** dasha levels 1–4.
- **Gochara:** transits, counted here from the natal Moon.
- **Sade Sati:** Saturn transiting 12th, 1st, 2nd from natal Moon (~7.5 years).
- **Varga:** divisional chart (D9 Navamsa, D7 Saptamsa, D10 Dashamsa, D4 Chaturthamsa).
- **Dispositor (nakshatra):** the lord of the nakshatra a planet occupies.
- **Combust:** too close to the Sun.
- **Kendra / Trikona / Upachaya / Dusthana:** house groups (H.4).
- **Independence group:** the underlying chart fact a finding depends on; findings sharing one count once.
- **Convergence:** multiple independent layers pointing the same way.
