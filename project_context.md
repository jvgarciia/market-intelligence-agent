# Project Context — Market Intelligence Agent

This file is the memory and rulebook for Claude Code. Read it at the start of every session.

---

## What This Project Is

**Market Intelligence Agent** — an AI-powered system that researches companies, markets, and competitors on demand and returns structured, actionable intelligence reports.

This is not a generic chat app. It is a purposeful AI system with a defined job: take a research query, gather and synthesize information using AI tools and structured reasoning, and produce output that is actually useful to a marketer or strategist.

**Why this project exists:**
The builder is preparing for a technical + creative marketing internship at Hulo. This project is the learning vehicle — each feature teaches a real AI engineering concept that will be valuable on the job and in every future project.

---

## Who This Is For

**Builder:** A marketing student learning to build with AI systems — not a software engineer. Code must be readable, educational, and explained clearly.

**End user of the product:** Someone who needs fast, structured market research — competitive landscape, brand positioning, trend signals — without spending hours doing it manually.

---

## Learning Roadmap

Each phase of this project is designed to teach a specific AI engineering concept:

| Phase | Concept | What gets built |
|-------|---------|-----------------|
| 1 | Claude Code workflow + Git habits | Project setup, version control, documentation |
| 2 | Claude API + API routes | Basic AI query → structured response |
| 3 | Tool calling | Agent that can use search, scrape, or other tools |
| 4 | Structured outputs | Reports with consistent, parseable JSON schemas |
| 5 | Context engineering | System prompts that produce reliable, high-quality intelligence |
| 6 | Agentic workflows | Multi-step research pipelines with intermediate reasoning |
| 7 | RAG + vector databases | Persistent knowledge base the agent can query |
| 8 | Memory systems | Agent that remembers past research sessions |
| 9 | Evaluation systems | Automated quality scoring for agent outputs |
| 10 | Human-out-of-the-loop | Scheduled, automated intelligence delivery |

**Current phase:** Phase 3 → Phase 9 transition. **V3.8 is current.** All five workflow stages (market-signals → candidate-discovery → evidence-validation → opportunity-scoring → opportunity-brief) have live execution paths, gated on the appropriate approvals, and have each run successfully against real Italian water-utility data at both regional (Lombardia/Lazio) and national scale. Both Review Gates work end-to-end (hand-edited JSON, no CLI yet — see Known Gaps below). `contacts-master.md` consolidates contacts from every Gate-2-approved run: **12/30 toward the contact target**, from 2 approved runs (regional `...736be5a4`, national `...cfa09872`). 217 tests passing. Full session-by-session detail is in Project History below (2026-06-13 through 2026-07-24 entries).

**Known gaps / next candidates:**
- No CLI for recording Gate 1/Gate 2 decisions — every approval this project has ever recorded was hand-edited via Python/bash against `metadata.json` + `0X-review-gate.json`. Error-prone (already caused one stale-approval bug, since fixed in `buildContactsMaster.mjs`). `scripts/review-run.mjs` already does this for Stage 01; extending the same pattern to gates 1/2 is the most-recommended next task.
- No CSV/spreadsheet export for a hand-off deliverable — current output is JSON + markdown under `runs/<run-id>/` plus `contacts-master.md`, not something to drop into a sales tool yet.
- No EU tenders (TED) integration or curated Italian water-news source list — general web search only.
- LinkedIn: intentionally search-snippet-only, no API/login access — a deliberate scope decision, not a gap, but it caps contact yield.
- Contact target: 12/30. Growing this further means either running more regions/markets through the pipeline or improving Stage 05's contact hit rate.

---

## Product Vision

A marketing professional opens the app, types a research question — "Who are Hulo's top three competitors and what is their brand positioning?" — and within seconds receives a structured intelligence report with source reasoning, key findings, and strategic takeaways.

The agent does not just chat. It reasons, gathers, and synthesizes. The output is designed to be dropped into a deck or brief with minimal editing.

---

## V1 Scope

V1 is the smallest thing that demonstrates the core loop:

1. User enters a research query
2. The AI processes it with a structured intelligence prompt
3. The response is returned as a formatted report (not a chat bubble)
4. The report includes: Summary, Key Findings, Strategic Implications

**V1 does NOT include:**
- Real-time web search or scraping (Phase 3+)
- Persistent memory or saved reports (Phase 7+)
- User accounts or authentication
- Database or file storage
- Automated scheduling
- Multi-step agentic pipelines
- Vector search or RAG
- Evaluation scoring

V1 proves the interaction model and report format before adding complexity.

---

## Architecture Principles

1. **All AI calls go through `lib/ai.js`** — no exceptions. Provider-switching must always be a one-line change.
2. **One file, one responsibility** — if a file needs "and" to describe what it does, split it.
3. **No premature abstraction** — build for what is needed now, not hypothetical future features.
4. **Server/client boundary is strict** — secrets and AI calls stay server-side; UI stays client-side.
5. **Structured over conversational** — outputs should be formatted reports, not chat text.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Vercel-native, frontend + backend in one project |
| Styling | Tailwind CSS | Fast, consistent, no separate CSS files |
| AI Layer | `lib/ai.js` wrapper | One place for all AI logic |
| Default AI | Anthropic Claude (`claude-sonnet-4-6`) | Best reasoning and structured output quality |
| Deployment | Vercel | Zero-config, integrates with GitHub |
| Language | JavaScript (no TypeScript) | Simpler for a learner; type safety can be added later |

---

## Rules Claude Code Must Follow

### Before writing any code
- Read this file first
- Check recent git history if context is unclear: `git log --oneline -10`
- Inspect the relevant files before proposing changes
- State the current architecture and how the change fits into it
- Propose an implementation plan with the exact files to change
- Wait for approval before making large or architectural changes

### Code quality
- Keep code simple. No over-engineering. One file does one thing.
- No TypeScript unless explicitly requested.
- No features, abstractions, or dependencies beyond what was asked for.
- No comments that explain *what* — only comments that explain *why* when it is non-obvious.

### Security
- Never hard-code API keys. Always use environment variables.
- Validate inputs at every API route before passing them further.
- Never expose internal error details to the frontend.

### Style
- Tailwind CSS for all styling. No inline `style={}` props.
- `PascalCase` for components, `camelCase` for lib files and API routes.
- `@/` path aliases for all imports.

### AI provider
- All AI calls go through `lib/ai.js`. Never import AI SDKs in components or pages.
- Default provider is Anthropic Claude.

---

## How to Explain Changes

Every time a file is created or modified, Claude Code must explain:

1. **What changed** — which file(s) and exactly what was done
2. **Why it matters** — the architectural or product reason for the decision
3. **What to learn from it** — one transferable concept written for a non-developer

Keep explanations short, plain, and jargon-free (or define the jargon in the same sentence).

---

## Browser Testing Workflow

Use Chrome browser testing after any change that affects what the user sees or interacts with.

**Trigger browser testing when:**
- A component, layout, or style was changed
- A form, button, or interactive element was added or modified
- An API route response changed and the UI depends on it
- The app was deployed and the live URL needs verification

**Skip browser testing for:**
- Pure logic or utility changes with no visual output
- Documentation edits
- Environment variable changes

**Standard sequence:**
1. Confirm dev server is running (`npm run dev`)
2. Load the page — verify no blank screen or console errors
3. Test the changed interaction end-to-end
4. Check browser console — zero red errors is the bar
5. Verify edge cases: empty input, loading state, error state

**Scope rule:** Browser testing is for validation only — not autonomous redesign. Report discovered issues before fixing anything outside the original task scope.

---

## Deployment Process

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables manually in Vercel (never uploaded from `.env.local`)
4. Vercel auto-deploys on every push to main branch

**Required variables in Vercel:**
- `AI_PROVIDER`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_NAME`

---

## What Each Key File Does

| File | Purpose |
|------|---------|
| `app/layout.js` | HTML shell — fonts, metadata, global styles |
| `app/page.js` | Homepage — composes the main UI |
| `app/api/chat/route.js` | AI backend endpoint — validates `{ company, industry, focus }`, calls AI, returns report |
| `app/api/mode/route.js` | Safe mode endpoint — returns `{ mode }` (current APP_MODE value) without exposing the env var to the browser |
| `lib/workflow/validate.mjs` | Tiny dependency-free JSON-Schema validator (supports a documented subset) |
| `lib/workflow/schemas.mjs` | Maps artifact names → schema files; validates/asserts artifacts |
| `lib/workflow/runStore.mjs` | Per-run artifact storage under `runs/<run-id>/`; thin filesystem wrapper, swappable for a DB |
| `lib/workflow/mockPipeline.mjs` | Deterministic, free sample artifacts for all five stages (mock-mode engine) |
| `lib/workflow/runWorkflow.mjs` | Orchestrator — runs stages in order, validates, runs integrity checks, persists; refuses cheap/full (no silent spend) |
| `workflows/market-opportunity/` | ICM-style staged workflow: top + per-stage `CONTEXT.md` contracts, JSON schemas, and stable `references/` (rubrics, standards) |
| `evals/cases/` | 5 realistic eval cases (water sector; no confidential data) defining expected characteristics |
| `evals/results/` | Eval run outputs (git-ignored; only `.gitkeep` is tracked) |
| `evals/harness/run.mjs` | Main eval runner — `runEvaluation(caseId, { mode })` runs both adapters and writes all results |
| `evals/harness/adapters/baseline.mjs` | Baseline adapter — mock-safe; wraps the single-report flow (throws on non-mock) |
| `evals/harness/adapters/staged.mjs` | Staged adapter — mock-safe; calls `runWorkflow` and reads back artifacts (throws on non-mock) |
| `evals/harness/adapters/local-stage01.mjs` | Local Stage 01 eval adapter — calls `runWorkflowLocal` via local CLI; used by `eval:local-stage01` only |
| `evals/harness/adapters/future-contract.mjs` | Interface contract for future multi-agent adapters; placeholder only |
| `evals/harness/normalize/` | Maps both raw outputs to a common evaluation structure; baseline mapping is lossy (prose), staged is lossless |
| `evals/harness/checks/deterministic.mjs` | Automated checks: URL validity, duplicate detection, score range, outreach language, mock labelling |
| `evals/harness/rubric/rubric.md` | Human reviewer scoring guide — 8 dimensions with 1/3/5 anchors in marketing language |
| `evals/harness/rubric/review-cli.mjs` | CLI for entering reviewer scores into `human-review.json` |
| `docs/architecture/current-state-audit.md` | The architecture audit that motivated the staged direction |
| `scripts/run-workflow-demo.mjs` | `npm run workflow:demo` — one free mock run |
| `scripts/run-workflow-local.mjs` | `npm run workflow:local -- --case <id>` — Stage 01 live via local CLI (subscription, no API billing) |
| `scripts/review-run.mjs` | `npm run workflow:review -- --run <id>` — review Stage 01 artifacts, record approve/reject |
| `scripts/run-eval-local-stage01.mjs` | `npm run eval:local-stage01 -- --case <id>` — Stage 01 local CLI evaluation with confirmation gate |
| `lib/workflow/providers/localCli.mjs` | Local CLI provider — spawns `claude --print`, strips paid API keys, uses OAuth; injected `spawnFn` for tests |
| `lib/workflow/stage01.mjs` | Stage 01 business logic — loads CONTEXT.md + evidence standards, builds prompt, parses + validates JSON output |
| `lib/workflow/runWorkflowLocal.mjs` | Async Stage-01-only orchestrator for local-cli mode — separate from `runWorkflow.mjs` (mock, unchanged) |
| `lib/workflow/stage02.mjs` | Stage 02 business logic — builds discovery prompt from Stage 01 signals/sources, parses + validates candidates, cross-checks signalId/sourceId refs, drops duplicates |
| `lib/workflow/runStage02Local.mjs` | Continues an already-approved run into Stage 02; refuses to run unless Stage 01 was explicitly approved |
| `lib/workflow/stage03.mjs` | Stage 03 business logic — judges every Stage 01 signal claim and Stage 02 relevanceEvidence claim against `evidence-standards.md`, returns `{ validated, rejected }` with nothing dropped silently |
| `lib/workflow/runStage03Local.mjs` | Continues an already-approved run into Stage 03; refuses to run unless Stage 01 was approved and Stage 02 has completed; this stage is where Review Gate 1 lives |
| `lib/workflow/stage04.mjs` | Stage 04 business logic — scores every Stage 02 candidate on the five ICP dimensions in `scoring-rubric.md`, using only Stage 03's validated evidence; recomputes `totalScore` rather than trusting the model's sum |
| `lib/workflow/runStage04Local.mjs` | Continues an already-approved run into Stage 04; refuses to run unless Stage 01 was approved, Stage 03 has completed, and `reviewGates.gate1` is `"approved"` — the first stage to enforce a human review gate in code |
| `lib/workflow/stage05.mjs` | Stage 05 business logic — writes decision-ready briefs from Stage 02/03/04 artifacts; drops any brief whose `recommendedNextAction` contains outreach language or whose contact has no real `sourceUrl`; renders `05-brief.md` for human reading; `briefAll` option (via `--brief-all`) briefs every candidate surviving Stage 03 instead of the model's curated top-pick subset |
| `lib/workflow/runStage05Local.mjs` | Continues an already-approved run into Stage 05; refuses to run unless Stage 01 was approved and Stage 04 has completed; calls the provider with `tools: ['WebSearch']` only — no WebFetch — so contact-finding cannot fetch any URL, including a LinkedIn profile page; this stage is Review Gate 2's source material |
| `lib/buildContactsMaster.mjs` | Consolidates contacts from every Gate-2-approved run into one markdown table; dedupes by name+company, merges into an existing table without overwriting a manually-set status |
| `scripts/build-contacts-master.mjs` | `npm run contacts:build` — thin CLI wrapper around `buildContactsMaster.mjs`, writes `contacts-master.md` at the project root |
| `contacts-master.md` | Generated (but hand-editable) rollup of every real contact found across Gate-2-approved runs; regenerate after each new gate2 approval — a human's "verified" status edits survive regeneration |
| `tests/` | `node:test` suites for validator, schemas, run store, and the mock pipeline |
| `runs/` | Local run artifacts (git-ignored except README) |
| `lib/ai.js` | AI wrapper (Anthropic-only) — `chat()` for single calls, `chatWithTools()` for the generic agentic loop; only place where AI SDKs are imported; exports `MODELS` (full = Sonnet, cheap = Haiku) |
| `lib/appMode.js` | Cost-control mode switch — resolves `APP_MODE` env var (`mock` / `cheap` / `full`) and per-mode settings (model, max tokens, max searches); defaults to mock in dev, full in production |
| `lib/mockReport.js` | Static sample report for mock mode — same structure as real output so the UI renders it identically; zero API cost |
| `lib/focusOptions.js` | Shared research-focus constants — imported by both form and API so they never drift |
| `lib/tools/webSearch.js` | Tavily web search — tool schema Claude sees + the fetch that executes it; one file per tool |
| `lib/prompts/marketIntelligencePrompt.js` | The analyst system prompt — report structure, data-honesty rules, depth weighting |
| `components/ResearchForm.js` | Research form — owns query/report/loading/error state |
| `components/ReportView.js` | Parses the markdown report into styled sections; copy-to-clipboard |
| `components/ChatBox.js` | Legacy chat UI — kept as reference, no longer rendered |
| `.env.local` | Real secrets — never committed |
| `project_context.md` | This file — Claude Code reads it every session |

---

## Project History

- **2026-05-09** — Created as a generic AI starter template
- **2026-06-04** — Renamed and repurposed as Market Intelligence Agent; documentation updated to define product vision, learning roadmap, V1 scope, and architecture principles
- **2026-06-04** — V1 implemented: research form (company, industry, focus) → structured seven-section report via `lib/prompts/marketIntelligencePrompt.js`; AI wrapper made Anthropic-only
- **2026-06-11** — V1.1 polish: report rendered as styled sections via `components/ReportView.js` (hand-rolled parser, zero new packages); system prompt upgraded with data-honesty rules, focus-weighted depth, and a closing confidence note; shared `lib/focusOptions.js` validates focus on both client and server; clearer loading/error states
- **2026-06-11** — V2.0 live search plumbing: `lib/tools/webSearch.js` calls Tavily via plain fetch; route runs 3 fixed parallel searches (overview, competitors, recent positioning) and injects numbered, trimmed sources into the prompt; reports cite sources inline and end with a Sources Used section; graceful fallback to model-knowledge-only when `TAVILY_API_KEY` is missing or searches fail; UI shows grounding status. No tool-use loop yet — that is V2.1
- **2026-06-11** — V2.1 agentic tool calling: `chatWithTools()` added to `lib/ai.js` — a generic tool-use loop (model requests tool → route executes → result returned → repeat until plain-text answer, hard-capped at 4 tool calls + runaway round limit). Claude now composes its own search queries instead of the fixed three; failed searches return `is_error` tool results and the model continues gracefully. Route tracks sources via closure and returns `{ reply, sourceCount, toolCallCount, sources }`; UI badge shows search count. System prompt caching enabled across loop rounds
- **2026-06-12** — Billing errors surfaced clearly: the API route maps Anthropic "credit balance too low" failures to an actionable error message instead of the generic fallback
- **2026-06-12** — Cost-control modes: one `APP_MODE` env var with three values — `mock` (static sample report from `lib/mockReport.js`, zero API calls, default in local dev), `cheap` (Haiku model, 1 search, 1.5K max tokens, brief report), `full` (unchanged complete agentic workflow, default in production). Mode resolution lives in `lib/appMode.js`; the route branches once at the top; `chat()`/`chatWithTools()` accept `model`/`maxTokens` options. UI shows an amber badge on mock/cheap reports; server logs the active mode per request. Documented in README and `.env.example`
- **2026-06-13** — Safety hardening on APP_MODE: production default changed from `full` → `cheap` with a `console.warn`; full mode now requires `APP_MODE=full` set explicitly everywhere. Added `GET /api/mode` route (`app/api/mode/route.js`) so the UI can safely display the active mode without exposing `APP_MODE` as a `NEXT_PUBLIC_` variable. `ResearchForm.js` now fetches active mode on mount and shows a pre-generation indicator; post-report badges corrected (cheap badge says "reduced-cost real AI report", full mode gets its own green badge).
- **2026-06-13** — V3.0 foundation: product direction expanded to a B2B Market Opportunity & Account Intelligence System, built baseline-first. Added the staged ICM-inspired workflow `workflows/market-opportunity/` (5 stages: market-signals → candidate-discovery → evidence-validation → opportunity-scoring → opportunity-brief), each with a `CONTEXT.md` input/process/output contract, JSON schemas, and shared stable `references/` (scoring rubric, evidence standards). New `lib/workflow/` engine: a dependency-free JSON-Schema validator, a schema loader/asserter, per-run artifact storage (`runs/<run-id>/`), a deterministic free mock pipeline, and an orchestrator that validates every artifact + runs cross-stage integrity checks and **refuses cheap/full to avoid silent API spend**. Two human review gates defined (after validation; before briefs are final). Evaluation foundation in `evals/` (12 dimensions + 5 realistic water-sector test cases, no confidential data). Tests via Node's built-in `node:test` (zero new dependencies) — 23 passing. The existing baseline report flow, UI, modes, and citations are untouched. **What's postponed:** live cheap/full stage execution, any multi-agent orchestration, a review UI, and a DB — all gated on the eval harness showing measurable improvement.
- **2026-06-14** — V3.1 eval harness: full evaluation infrastructure built. `evals/harness/` contains baseline and staged adapters (mock-safe, throw on live modes), output normalizers (lossless for structured artifacts, heuristic for prose), deterministic checks (URL validity, duplicate detection, score range, outreach language, mock labelling), a human review rubric with 1/3/5 anchors in marketing language, and a review CLI. `evals/results/` is git-ignored. `npm run eval:mock` runs all 5 cases through both adapters in ~0ms at zero cost. `npm run eval:live` is ready infrastructure with cost estimates and explicit confirmation — live stage execution wiring is the next step. Tests: 55 passing (32 new eval harness tests, 23 existing). Baseline flow unchanged.
- **2026-06-15** — V3.2 local-cli provider: clean provider abstraction for Stage 01 research using the locally-authenticated Claude Code CLI (OAuth session, no paid API billing). New files: `lib/workflow/providers/localCli.mjs` (subprocess spawner with injected spawnFn for testing, safe environment — strips ANTHROPIC_API_KEY, disabled in production), `lib/workflow/stage01.mjs` (prompt builder from CONTEXT.md + evidence standards, JSON parser, schema validator per item), `lib/workflow/runWorkflowLocal.mjs` (async Stage-01-only orchestrator, writes review-gate.json, preserves raw output). Developer scripts: `run-workflow-local.mjs`, `review-run.mjs`, `run-eval-local-stage01.mjs`. Schema updates: `run-request` and `run-metadata` schemas now accept `local-cli` as a valid mode. Tests: 87 passing (32 new, zero real CLI calls in test suite). Stages 02–05 and existing mock/baseline flows untouched.
- **2026-07-22/23** — V3.3 Stage 02 live + Italy data: `lib/workflow/stage02.mjs` + `runStage02Local.mjs` add a live candidate-discovery path, gated on Stage 01's review-gate approval — same pattern as Stage 01. `organisationType` enum extended with `multi-utility-company`. Both Stage 01 and Stage 02 then ran successfully against real Italy data (16 signals/14 sources → 10 candidates, 0 rejected), reviewed and approved. Fixed a real evidence-quality bug found on that run: regional-vs-national figures were wrongly flagged as "conflicting" when they were just different scopes — added a scope-before-conflict rule to `evidence-standards.md`. 119 tests passing.
- **2026-07-23** — V3.4 Stage 03 live: `lib/workflow/stage03.mjs` + `lib/workflow/runStage03Local.mjs` (`npm run workflow:stage03 -- --run <id>`) add a live evidence-validation path, same pattern as Stages 01–02 — refuses to run unless Stage 01 is approved and Stage 02 has completed. Judges every signal claim and candidate relevanceEvidence claim against `evidence-standards.md`'s keep/reject rules, producing `03-validation.json` (`{ validated, rejected }`); a claim can never silently disappear — it is dropped-with-warning only for schema/reference errors, otherwise it lands in exactly one of the two lists. This stage is where Review Gate 1 lives per the CONTEXT.md contract; `reviewGates.gate1` stays "pending" in `metadata.json` until a person reviews `02-candidates.json` + `03-validation.json` together (no dedicated review CLI for gate1 yet — read the JSON directly, same as Stage 02 today). 142 tests passing (23 new). Not yet run against real Italy data.
- **2026-07-23** — Stage 03 run live against Italy (`runs/...864fc892`): 8 validated, 26 rejected, 0 dropped by schema/reference checks, 309s (needed `LOCAL_CLAUDE_TIMEOUT_MS` raised to 360s — bumped from the 180s default afterward). Rejections matched evidence-standards correctly (recency, weak Tier-C sourcing, unfetchable sources, duplicates); the scope-vs-conflict rule worked end-to-end, correctly rejecting a claim that tried to frame regional-vs-national NRW figures as conflicting. Review Gate 1 approved by hand.
- **2026-07-23** — V3.5 Stage 04 live: `lib/workflow/stage04.mjs` + `lib/workflow/runStage04Local.mjs` (`npm run workflow:stage04 -- --run <id>`) — opportunity scoring, same live pattern as Stages 01–03, but with a stricter gate: refuses unless Stage 01 approved, Stage 03 completed, **and** `reviewGates.gate1` is literally `"approved"` — the first stage to enforce a human review gate in code, since scores are the first artifact a human might act on directly. Scores every candidate on the five ICP dimensions in `scoring-rubric.md` using only Stage 03's *validated* evidence; `totalScore` is recomputed server-side, never trusted from the model. 162 tests passing (20 new). Run live against Italy: all 10 candidates scored, 0 dropped, 171.6s — Uniacque (20/25), MM S.p.A. (18/25), EGATO5 (17/25) led. Review surfaced two real problems: 4 of 10 candidates weren't buyers at all (vendors Aganova/WaterTech, regulator ARERA, regional government Regione Lombardia), and `utilitySize` scored weak-to-absent everywhere because no size/scale figures survived Stage 03 validation.
- **2026-07-23** — Fixed both Stage 04 findings, same session: Stage 02's `CONTEXT.md` + `stage02.mjs` prompt gained an explicit `organisationType` scope rule tied to the run's `targetCustomerType` (regulators/competitors only valid when the run itself asks for that landscape — preserves the legitimate `evals/cases/04-leak-detection-competitors-europe.json` use case, so the schema enum wasn't narrowed), and `public-water-organisation` now requires direct water-infrastructure ownership/procurement authority, not just general government. Stage 01 gained a new `organisation-scale` signalType and an explicit instruction to search for population/network-scale figures. Enforcement is prompt-level + Gate 1 review, matching how the rest of evidence-standards works. 162 tests still passing. Verified with a fresh live Italy run (`runs/...736be5a4`, case `06-water-utilities-italy`): Stage 01 produced 5 organisation-scale signals; Stage 02 produced only 6 candidates, all genuine buyers — zero vendors/regulators/government bodies; Stage 04's `utilitySize` scores rose to 2-5 across the board. `DEFAULT_TIMEOUT_MS` in `providers/localCli.mjs` permanently raised 360s→540s afterward (the extra search query needed it).
- **2026-07-23/24** — V3.6 Stage 05 live: `lib/workflow/stage05.mjs` + `lib/workflow/runStage05Local.mjs` (`npm run workflow:stage05 -- --run <id>`) — opportunity briefs, gated on Stage 01 approval + Stage 04 completion. Writes `05-briefs.json` + human-readable `05-brief.md` (Review Gate 2's source material). Drops any brief with outreach language in `recommendedNextAction` or a contact with no real `sourceUrl`. `providers/localCli.mjs` gained an optional `tools` parameter; Stage 05 is the first caller to pass `tools: ['WebSearch']` only, so the CLI is structurally unable to fetch any URL (including a LinkedIn profile page) during contact-finding, rather than relying on the prompt alone. 190 tests passing (28 new). Run live against the regional Italy run: 4 of 6 candidates briefed, 1 real contact found safely via `linkedin-search`, the model caught and excluded its own risky contact misattribution. Review Gate 2 approved, with one correction — a brief cited a €73M total investment figure for BrianzAcque; human verification found the correct total was €60M (€50M PNRR-funded). Corrected across the run's working artifacts; raw provider logs left untouched as the honest record of what the model actually said.
- **2026-07-24** — Wider region coverage run (`runs/...cfa09872`, case `07-water-utilities-italy-national` — same ICP, region restriction dropped): full Stage 01→05 live at national scale. Stage 01: 49 signals/57 sources across 9+ regions. Stage 02: 14 candidates, zero vendors/regulators/government bodies — the Stage 02 tightening held at ~2.3x the candidate volume. Stage 03: 42 validated/43 rejected (one transient CLI connection error, clean on retry). Stage 04: all 14 scored, 0 dropped, range 14-20. Stage 05 (curated mode): 8 of 14 briefed, 1 correctly dropped for outreach language, 2 contacts found. Top candidate: SMAT (Torino), 20/25. Added `evals/cases/07-water-utilities-italy-national.json`, which broke 2 tests hardcoding the eval-case count (6→7) — fixed. 190 tests passing. Review Gate 2 approved, no corrections needed.
- **2026-07-24** — V3.7 contacts-master.md: `lib/buildContactsMaster.mjs` + `scripts/build-contacts-master.mjs` (`npm run contacts:build`, `CONTACT_TARGET=<n>`) consolidate contacts from every Gate-2-approved run into one markdown table (name, role, company, region, source, source type, status). Duplicates skipped by name+company; a manually-set `verified` status survives re-runs. Testable against a temp dir, same pattern as every workflow stage. 204 tests passing (14 new). Initial state: 3/30 contacts from 2 approved runs.
- **2026-07-24** — V3.8 Stage 05 `--brief-all` flag: `npm run workflow:stage05 -- --run <id> --brief-all` briefs every candidate that survives Stage 03 validation (has a `relevanceEvidence` sourceId also cited by a validated evidence item — a mechanical link, not text matching) instead of the model's curated top-pick subset; default behavior unchanged. 215 tests passing (11 new). Run live against the national run: all 14 briefed (vs. 8 curated), 11 contacts found (vs. 2 curated — live search is non-deterministic). This overwrote the already-Gate-2-approved curated version; backed it up to `gate2-approved-curated-backup/` first. Chose to keep the brief-all version and reset `reviewGates.gate2` to `"pending"` for re-review rather than restore the backup. That exposed a real bug in `buildContactsMaster.mjs`: it only ever added rows and never re-checked whether a contact's source run was still approved, so unreviewed contacts would have stayed in `contacts-master.md` indefinitely. Fixed: membership is recomputed from the current set of gate2-approved runs on every build; only `status` carries over. 217 tests passing (2 new). Reviewed and approved the brief-all version; `contacts-master.md` regenerated to 12/30 — the two contacts from the superseded curated version correctly dropped out.
