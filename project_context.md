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

**Current phase:** Phase 3 → Phase 9 transition. V2.1: Claude agentic tool-use loop (max 4 searches). V2.2: APP_MODE safety hardening. **V3.0 (foundation):** B2B Market Opportunity workflow in mock mode, ICM-inspired staged pipeline, evaluation foundation. **V3.1 (eval harness):** Full evaluation infrastructure built and passing 55 tests. **V3.2 (local-cli provider):** Clean provider abstraction for Stage 01 local research. **V3.3 (Stage 02 live):** `lib/workflow/stage02.mjs` + `runStage02Local.mjs` — candidate discovery, gated on Stage 01 approval; proven on real Italy data (10 candidates, 0 rejected). **V3.4 (Stage 03 live):** `lib/workflow/stage03.mjs` + `lib/workflow/runStage03Local.mjs` (`npm run workflow:stage03 -- --run <id>`) — evidence validation, gated on Stage 01 approval + Stage 02 completion. Judges every Stage 01 signal claim and Stage 02 relevanceEvidence claim against `evidence-standards.md`, producing `03-validation.json` (`{ validated, rejected }`) with nothing dropped silently. This stage is where Review Gate 1 lives (per `03_evidence-validation/CONTEXT.md`) — a person reviews `02-candidates.json` + `03-validation.json` together; `metadata.json → reviewGates.gate1` stays "pending" until that review happens (no CLI for recording gate1 yet — reviewed by reading the JSON directly). 142 tests passing (23 new). **Run live against Italy** (`runs/2026-07-23T09-14-30-606Z__864fc892`): 8 validated, 26 rejected, 0 dropped by schema/reference checks; took 309s (needed the timeout raised to 360s — the default `DEFAULT_TIMEOUT_MS` in `providers/localCli.mjs` was bumped from 180s to 360s afterward since later stages carry more upstream context). Rejections matched the evidence-standards rules correctly (recency, weak Tier-C-only sourcing, unfetchable sources, duplicates), and the scope-vs-conflict fix worked end-to-end — a claim that tried to frame the regional-vs-national NRW figures as conflicting was itself rejected as `unsupported-assumption`. Review Gate 1 was then approved by hand for that run (`metadata.json → reviewGates.gate1 = "approved"`). **V3.5 (Stage 04 live):** `lib/workflow/stage04.mjs` + `lib/workflow/runStage04Local.mjs` (`npm run workflow:stage04 -- --run <id>`) — opportunity scoring, same live pattern as Stages 01–03, but with a stricter gate: it refuses unless Stage 01 is approved, Stage 03 has completed, **and** `metadata.json → reviewGates.gate1` is literally `"approved"` (Stages 02→03 only checked prior-stage completion; Stage 04 is the first stage to enforce a human review gate in code, since scores are the first artifact a human might act on directly). Scores every Stage 02 candidate on the five ICP dimensions in `scoring-rubric.md`, using only Stage 03's *validated* evidence (rejected evidence is excluded from the prompt entirely, not just instructed against). `totalScore` is never trusted from the model — the orchestrator recomputes it from the five dimension scores and corrects/warns if they disagree. Produces `04-scores.json` (array of `opportunity-score`, one per candidate). 162 tests passing (20 new). **Run live against Italy** (`runs/2026-07-23T09-14-30-606Z__864fc892`): all 10 candidates scored, 0 dropped, 171.6s — Uniacque (20/25), MM S.p.A. (18/25), and EGATO5 (17/25) led. Review surfaced two real problems: (1) 4 of the 10 candidates were not buyers at all — two technology vendors/competitors (Aganova, WaterTech) and a regulator + a regional government body (ARERA, Regione Lombardia) — Stage 02 correctly scored them near-zero but shouldn't have surfaced them as candidates in the first place; (2) `utilitySize` was weak-to-absent across all 10 candidates, capping every score's ceiling, because no population-served/network-scale figures survived Stage 03 validation. **Fix applied (same session, no version bump):** Stage 02's `CONTEXT.md` + `stage02.mjs` prompt now carry an explicit `organisationType` scope rule tied to the run's `targetCustomerType` — regulators/competitors are only valid candidates when the run itself is asking for that kind of landscape mapping (this preserves the legitimate `evals/cases/04-leak-detection-competitors-europe.json` use case, so the schema enum was *not* narrowed) — and `public-water-organisation` now requires direct water-infrastructure ownership/operation/procurement authority (an ATO, not a general regional government funding conduit). Stage 01 gained a new `organisation-scale` signalType and an explicit instruction to search for population-served/network-scale figures per organisation, since Stage 04's scoring depends on them. Enforcement is prompt-level + Gate 1 review, same as the rest of the evidence-standards rules — not hard-coded, since "does this org fit targetCustomerType" is a judgment call. 162 tests still passing (schema enum addition, not a breaking change). **Verified with a fresh live Italy run** (`runs/2026-07-23T15-29-14-971Z__736be5a4`, case `06-water-utilities-italy`): both fixes held. Stage 01 produced 26 signals including 5 tagged `organisation-scale` (population/network-length figures for Gruppo CAP, Acea Ato 2, BrianzAcque) — the new signalType and instruction worked. Stage 02 produced only 6 candidates, all genuine buyers: 4 `water-utility` + 2 `public-water-organisation` (both real ATOs with procurement authority) — zero vendors, zero regulators, zero general-government bodies (Aganova, ARERA, and Regione Lombardia-equivalent entities did not appear at all, vs. 4-of-10 non-buyers in the prior run). Stage 03: 22 validated / 16 rejected (mostly dedup), and every organisation-scale claim survived validation. Stage 04: all 6 scored, 0 dropped — `utilitySize` now scores 2-5 across the board (vs. mostly 0-2 "inference — no validated evidence" before), because the size claims are now sourced and validated rather than missing. Ranked: Acea Ato 2 (20/25), BrianzAcque (19/25), Gruppo CAP (18/25), Uniacque (17/25), the two ATOs (14/25 each). Required bumping `LOCAL_CLAUDE_TIMEOUT_MS` to 540000 for Stage 01 (the extra organisation-scale search query pushed it past the 360s default on one run) — `DEFAULT_TIMEOUT_MS` in `providers/localCli.mjs` was then permanently raised 360s→540s, with matching updates to every script's displayed/fallback default.

**V3.6 (Stage 05 live, scoped against the current 6 candidates):** `lib/workflow/stage05.mjs` + `lib/workflow/runStage05Local.mjs` (`npm run workflow:stage05 -- --run <id>`) — opportunity briefs, gated on Stage 01 approval + Stage 04 completion (Gate 1 is implied, since Stage 04 already hard-required it). Writes `05-briefs.json` (machine) and `05-brief.md` (human-readable — this is **Review Gate 2**'s source material; the gate decision itself is still recorded by hand in `metadata.json → reviewGates.gate2`, same hand-off pattern as gate1). Drops any brief whose `recommendedNextAction` contains outreach language (mirrors the eval harness's existing outreach-language pattern) or whose contact has no real `sourceUrl` — these are hard rules from CONTEXT.md, enforced the same drop-and-warn way as every other stage's verification checks. `providers/localCli.mjs` gained an optional `tools` parameter (default unchanged: `WebSearch,WebFetch`); Stage 05 is the first caller to pass `tools: ['WebSearch']` only, so the CLI is *structurally* unable to fetch any URL — including a LinkedIn profile page — rather than relying on the prompt instruction alone (Stage 02's `targetCustomerType` scope rule, by contrast, stays prompt-level, since that judgment can't be reduced to a mechanical filter the way "can this tool open a URL" can). 190 tests passing (28 new). Region coverage stays fixed at Lombardia/Lazio for now — wider Italy coverage is deliberately deferred until contact-finding is proven live.

**Run live** (`runs/2026-07-23T15-29-14-971Z__736be5a4`): 152s, 4 of 6 candidates briefed, 0 dropped, 0 warnings. The model briefed the top 4 utilities (Acea Ato 2 20/25, BrianzAcque 19/25, Gruppo CAP 18/25, Uniacque 17/25) and correctly skipped the two lower-scored ATO governance bodies (14/25 each) — a sensible cutoff since they're not the direct technology buyer the way a utility is. One real contact found and kept (Andrea Aliscioni, Direttore Generale at Acea Ato 2, via `linkedin-search` — a public search-result snippet, not a profile visit). Notably, the model caught its own near-miss: a candidate name ("Andrea Casnati") turned up for Uniacque's Infrastructure & Innovation role, but a follow-up search found a LinkedIn profile under that name at an unrelated company, so it excluded the contact rather than risk misattribution — exactly the honesty behavior CONTEXT.md asks for. No outreach language anywhere in `recommendedNextAction`, and `05-brief.md` reads as genuinely decision-ready. **Review Gate 2: approved**, with one correction — BrianzAcque's brief (cand-3) cited a €73 million total investment plan; human verification found the correct total is €60 million (of which €50 million is PNRR-funded). Corrected consistently across the run's working artifacts (`01-market-signals.json` sig-21, `02-candidates.json` cand-3, `03-validation.json` ev-21/ev-35, `05-briefs.json`, `05-brief.md`) — raw provider logs (`*-raw-output.json`) were left untouched as the honest record of what the model actually said. `metadata.json → reviewGates.gate2` is now `"approved"`; the correction and decision are recorded in `05-review-gate.json` (a new per-run file, same pattern as `review-gate.json` for gate1 — no CLI for gate2 yet either). This is the first real evidence that a human catches something the pipeline itself didn't (Stage 03 validated the €73M claim as internally consistent — it never had a way to know the number itself was wrong). **Wider region coverage run** (`runs/2026-07-24T08-49-42-948Z__cfa09872`, case `07-water-utilities-italy-national` — same ICP, region restriction dropped): full Stage 01→05 pipeline run end-to-end at national scale. Stage 01: 49 signals / 57 sources across 9+ regions (Puglia, Lombardia, Emilia-Romagna, Sardegna, Sicilia, Campania, Veneto, Piemonte, Toscana, Marche/Abruzzo, Liguria), 12 organisation-scale signals (up from 5 regionally). Stage 02: 14 candidates, **zero** vendors/regulators/general-government bodies — the Stage 02 tightening held at ~2.3x the candidate volume, the real stress test it hadn't seen yet. Stage 03: 42 validated / 43 rejected (mostly duplicates, consistent with the regional run's pattern); one transient `Connection closed mid-response` CLI error on the first attempt, succeeded cleanly on retry — not a code issue. Stage 04: all 14 scored, 0 dropped, range 14-20 across 9 distinct regions, no outliers. Stage 05: 8 of 14 briefed, 1 correctly dropped for outreach language (the brief said "before preparing outreach materials" — the word "outreach" tripped the guard; a conservative false positive, not a bug, and the right failure direction), 2 real named contacts found safely via `linkedin-search` (Paolo Lanza at AQP, Daniele Granato at GORI). Top candidate: SMAT (Torino), 20/25, €66.1M PNRR AI-monitoring project through 2030. Adding the new eval case (`evals/cases/07-water-utilities-italy-national.json`) broke 2 tests that hardcoded the eval-case count (6→7); fixed in `tests/eval.harness.test.mjs`. 190 tests passing. **Review Gate 2: approved** for the national run, no corrections needed this time. `metadata.json → reviewGates.gate2` is `"approved"`; decision recorded in `05-review-gate.json`. The pipeline is now validated end-to-end at both regional and national scale, with two Gate-2-approved runs on record (`...736be5a4` regional, `...cfa09872` national) and 3 real contacts found across them.

**V3.7 (contacts-master.md):** `lib/buildContactsMaster.mjs` + `scripts/build-contacts-master.mjs` (`npm run contacts:build`, `CONTACT_TARGET=<n> npm run contacts:build`) consolidate every contact from Gate-2-approved runs into `contacts-master.md` at the project root — columns: name, role, company, region, source, source type, status. Only rows with a real named contact appear (a brief with zero contacts contributes nothing), duplicates (same name+company, case-insensitive) are skipped, and re-running preserves any status a human has manually changed to `verified` — new contacts merge in, existing rows are never overwritten. Business logic lives in `lib/buildContactsMaster.mjs` with injectable `runsDir`/`existingText` so it's testable against a temp dir, same pattern as every workflow stage; the script is a thin wrapper wiring it to the real `runs/` dir. Contact target defaults to 30, configurable via `CONTACT_TARGET`. Current state: 3/30 contacts from 2 approved runs. 204 tests passing (14 new).

**V3.8 (Stage 05 `--brief-all` flag):** `npm run workflow:stage05 -- --run <id> --brief-all` briefs every candidate that survives Stage 03 validation (has ≥1 `relevanceEvidence` sourceId also cited by a validated evidence item's `supportingSourceIds` — a mechanical link reusing existing source IDs, not text matching) instead of the model's curated top-pick subset. Default behavior is unchanged — omitting the flag is identical to before. `lib/workflow/stage05.mjs` gained `filterCandidatesSurvivingValidation()` plus a `briefAll` option threaded through `buildSystemPrompt`, `buildUserMessage`, and `runStage05`; `runStage05Local.mjs` and the CLI script pass it through. `05_opportunity-brief/CONTEXT.md` documents the flag as an alternative to step 1's selection only — steps 2-5 (fact/interpretation split, contact-finding rules, etc.) apply identically either way. 215 tests passing (11 new).

**Run live** (`--brief-all` against the national run `...cfa09872`): all 14 candidates briefed (vs. 8 curated), 0 dropped, 0 warnings, 233s. 11 contacts found this run (vs. 2 for the same run in curated mode) — live web search is non-deterministic, so contacts differ run to run even for the same candidate (e.g. AQP surfaced Paolo Lanza in curated mode, Sebastiano Lopez in brief-all mode; both are plausible, neither independently confirmed). **Important caveat:** this overwrote `05-briefs.json`/`05-brief.md` for a run whose Gate 2 was already recorded `"approved"` against the curated 8-brief version — the original approved content is backed up at `runs/...cfa09872/gate2-approved-curated-backup/`, but `metadata.json → reviewGates.gate2` still says `"approved"` even though the current `05-briefs.json` is now the unreviewed brief-all output. This needs a decision: either restore the curated backup (keeping gate2's approval valid) or treat the brief-all version as pending re-review. Not yet resolved.

`contacts-master.md` regenerated: **14/30 contacts** (up from 3), all correctly deduped by name+company — no manual status was lost. Since the source run's gate2 status is stale (see caveat above), these 11 new contacts are technically drawn from unreviewed content even though the file currently reads as approved.

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
