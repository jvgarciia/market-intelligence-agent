# Roadmap — HULO.ai Italian Water Utility Lead Generation

**Project context:** Marketing internship assignment at HULO.ai (AI leak-detection /
NRW monitoring for water utilities). Goal: 30+ contacts, 5+ qualified leads from
Italian drinking-water utilities and multi-utility companies, targeting
innovation / operations / asset-management / digital-transformation
decision-makers working on leakage reduction and network modernization.

This file reflects the **actual current state of the code**, not aspirations.
Checked items are genuinely built and (where noted) tested; unchecked items are
either scaffolding-only or fully missing.

---

## Foundation already in place (reusable across every step below)

- [x] 5-stage ICM-style pipeline contract (`workflows/market-opportunity/`) — one
      `CONTEXT.md` + JSON schema per stage
- [x] Dependency-free schema validator + per-artifact assertion (`lib/workflow/validate.mjs`, `schemas.mjs`)
- [x] Per-run artifact storage, inspectable as plain JSON files (`lib/workflow/runStore.mjs`)
- [x] Human review gate (approve/reject a run before trusting it) (`scripts/review-run.mjs`)
- [x] Evaluation harness — 97 automated tests, mock-safe, zero paid API calls (`evals/`)
- [x] Local Claude Code provider — runs live web research on your subscription, not
      metered API billing (`lib/workflow/providers/localCli.mjs`)
- [x] Hard safety rule: no stage may emit outreach language (email/LinkedIn/contact/
      "reach out") in its output — enforced by regex check, not just instruction
      (`lib/workflow/runWorkflow.mjs`, `evals/harness/checks/deterministic.mjs`)

---

## 1. Define lead-scoring criteria (utility size, NRW %, region, target roles)

**Status: Decided and implemented in the schema/rubric. Not yet run on real data.**

- [x] **Decision made:** the 6 generic dimensions replaced with 5 ICP-specific ones —
      `utilitySize`, `nrwEvidence`, `regionFit`, `targetRolePresence`,
      `momentumSignal` (bonus) — 0–5 scale each, `totalScore` now 0–25
      (`references/scoring-rubric.md`, `04_opportunity-scoring/schemas/opportunity-score.schema.json`,
      `04_opportunity-scoring/CONTEXT.md`)
- [x] Schema still rejects a score with no justification
- [x] Mock fixtures updated to the new dimension names and re-verified end-to-end
      (`lib/workflow/mockPipeline.mjs`, `npm test` — 97/97 pass, `npm run workflow:demo`
      produces a valid `04-scores.json`)
- [ ] Rubric itself (Stage 04 scoring) has never been run against real data —
      Stage 04 has no live code yet (see item 4). Stages 01–02 have now run live
      against real Italy data, so the evidence this rubric would score on now exists
- [ ] `location.region` on candidates is still free text; nothing yet enforces it
      matches `regionFit`'s Italy scope

---

## 2. Data sourcing (utility sites / LinkedIn / Italian water news / EU tenders)

**Status: Partially done — one real, tested source path; the rest are missing.**

- [x] Stage 01 (market-signals) has a working **live** path: local Claude Code CLI
      + web search, schema-validated output (`lib/workflow/stage01.mjs`)
- [x] Tested and approved on a real Spain run (14 sources, 13 signals,
      `runs/2026-06-15T20-05-00-105Z__2cb46f03`)
- [x] **Tested and approved on a real Italy run** — the actual target market:
      16 signals / 14 sources, 0 rejected, narrowed to Lombardia + Lazio after two
      360s timeouts on an all-regions request
      (`runs/2026-07-23T09-14-30-606Z__864fc892`, `evals/cases/06-water-utilities-italy.json`)
- [x] Stage 02 (candidate-discovery) has a **live execution path**, mirroring
      Stage 01: `lib/workflow/stage02.mjs` + `lib/workflow/runStage02Local.mjs` +
      `npm run workflow:stage02 -- --run <id>`. Requires the target run's Stage 01
      output to already be approved — refuses to run otherwise
- [x] **Stage 02 run live against Italy** — 10 candidates, 0 rejected. Correctly
      separated real water utilities (Gruppo CAP, Uniacque, MM S.p.A., Acea Ato 2,
      Acqualatina) from competitors already selling into these utilities (Aganova,
      WaterTech) and non-customer bodies (EGATO5, Regione Lombardia, ARERA).
      Reviewed and approved — recorded in that run's `review-gate.json`
- [x] `organisationType` enum extended with `multi-utility-company` to match the
      actual ICP (was missing before)
- [x] 21 new tests (119/119 passing) — mock provider only, zero real CLI calls
- [x] Found and fixed a real evidence-quality bug from the Italy run: a regional
      figure (23.4%) and a national figure (42%) were flagged as "conflicting"
      when they were just different scopes. Rule added to
      `references/evidence-standards.md` — applies to every future run automatically
- [ ] **No LinkedIn access at all.** Web search only (Tavily / Claude's built-in
      search). LinkedIn is currently only referenced as a blocked word in output
      text, not as a usable source
- [ ] No dedicated **EU tenders** integration (e.g. TED) — tenders can only turn up
      incidentally through general web search, not a targeted feed
- [ ] No curated **Italian water-sector news** source list — general web search only

---

## 3. Collection script into structured data

**Status: Partially done — solid for Stage 01, absent everywhere else.**

- [x] Full live pipeline for signals: prompt builder → CLI call → JSON parse →
      per-item schema validation → source/signal cross-reference
      (`lib/workflow/stage01.mjs`, `providers/localCli.mjs`, `runWorkflowLocal.mjs`)
- [x] Safety guards: strips paid API keys, blocks production use, flags
      insufficient-evidence runs instead of false-succeeding
- [x] Candidates (Stage 02) have the same pipeline: prompt builder → CLI call →
      JSON parse → per-item schema validation → signalId/sourceId cross-reference →
      duplicate-org check (`lib/workflow/stage02.mjs`, `runStage02Local.mjs`) —
      now proven against real Italy data (see item 2)
- [ ] No collection step exists for **people/contacts** at all (see item 5)

---

## 4. Ranking/scoring logic

**Status: Designed, not built. Never run.**

- [x] Schema + rubric defined (see item 1)
- [x] Mock fixture scores exist so the pipeline plumbing can be tested end-to-end
      for free (`lib/workflow/mockPipeline.mjs`)
- [ ] No live Stage 04 execution code exists — there is no `stage04.mjs`
      equivalent to `stage01.mjs`
- [ ] Never run on real candidates or real evidence
- [ ] Criteria don't yet reflect your ICP (depends on item 1 being finished first)

---

## 5. Contact-finding for top-ranked companies

**Status: Decided and schema/contract work done. No live code yet — never actually run.**

- [x] **Decision made (Option A):** no scraping, no login-based LinkedIn access.
      Contacts sourced via `site:linkedin.com` web search snippets, company
      team/leadership pages, Italian water-sector trade-association listings, and
      press mentions naming a person and role
- [x] New `contacts` field added to the opportunity-brief schema — own explicit
      shape (`name`, `role`, `targetRoleCategory`, `sourceUrl`, `sourceType`,
      `confidence`, `uncertainty`), not bolted onto `recommendedNextAction` or any
      existing field (`05_opportunity-brief/schemas/opportunity-brief.schema.json`)
- [x] Stage 05's contract updated to allow this one bounded exception to "no new
      research," with the approved-methods list written into `CONTEXT.md` so a
      future run can't quietly start scraping or logging into LinkedIn
      (`05_opportunity-brief/CONTEXT.md`)
- [x] A contact with no source URL is explicitly disallowed — "not a contact" per
      the contract; empty `contacts` is an accepted, honest result
- [x] Mock fixture demonstrates the new field end-to-end, schema-validated
      (`lib/workflow/mockPipeline.mjs`, confirmed via `npm run workflow:demo`)
- [ ] **No live code exists yet** — Stage 05 has no execution path at all (mock
      only), so this has never actually found a real contact
- [ ] Still true: LinkedIn has no API/login access here — the approved methods are
      all public-search-result-only, which will genuinely limit contact yield;
      worth watching once this runs for real

---

## 6. Clean output format

**Status: Designed, not built. No real deliverable yet.**

- [x] Opportunity-brief schema defined: title, why it matters, verified facts vs.
      model interpretation, uncertainties, recommended next action, required human
      verification (`05_opportunity-brief/schemas/opportunity-brief.schema.json`)
- [x] Deliberately excludes outreach instructions by design (kept, not a gap)
- [ ] No contact fields (blocked on item 5)
- [ ] No live code generates a real brief yet — mock fixtures only
- [ ] No export format for a hand-off deliverable (e.g. CSV/sheet of "30 contacts +
      5 leads") — current output is JSON files under `runs/<run-id>/`, not something
      you could hand to someone yet

---

## Honest summary

**Genuinely done, tested, and now proven on real Italy data:** Stage 01 (market
signals) and Stage 02 (candidate discovery) both have live execution paths and
have both run successfully against the actual target market — 16 signals / 14
sources → 10 candidates, 0 rejected at either stage, both reviewed and approved
(`runs/2026-07-23T09-14-30-606Z__864fc892`). The full safety/eval/review
infrastructure held up under a real run, including catching and fixing a genuine
evidence-quality bug (regional-vs-national figures wrongly flagged as conflicting).

**Decided and designed, not yet live:** the ICP scoring criteria (item 1) and the
contact-sourcing method + schema field (item 5) are locked in at the
schema/contract level and verified against the mock pipeline — but **no live code
executes Stage 03, 04, or 05 yet**. Stage 03 (evidence validation) is the next
stage in sequence and has deliberately **not** been started.

**Still missing entirely:** LinkedIn access (search-only, as decided), EU tender
integration, and a curated Italian news/trade-association source list. No stage
beyond 02 has ever produced a real (non-mock) result.

**Suggested real next step (not yet started, by instruction):** wire Stage 03
(evidence validation) live, the same pattern as Stages 01–02 — it decides which of
these 10 candidates' supporting evidence actually holds up, using the
`evidence-standards.md` rules (now including the scope-vs-conflict fix) before
Stage 04 scores anything.
