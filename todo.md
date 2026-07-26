# Roadmap — HULO.ai Italian Water Utility Lead Generation

**Project context:** Marketing internship assignment at HULO.ai (AI leak-detection /
NRW monitoring for water utilities). Goal: 30+ contacts, 5+ qualified leads from
Italian drinking-water utilities and multi-utility companies, targeting
innovation / operations / asset-management / digital-transformation
decision-makers working on leakage reduction and network modernization.

This file reflects the **actual current state of the code**, not aspirations.
Checked items are genuinely built and tested; unchecked items are either
scaffolding-only or fully missing.

---

## Foundation already in place (reusable across every step below)

- [x] 5-stage ICM-style pipeline contract (`workflows/market-opportunity/`) — one
      `CONTEXT.md` + JSON schema per stage
- [x] Dependency-free schema validator + per-artifact assertion (`lib/workflow/validate.mjs`, `schemas.mjs`)
- [x] Per-run artifact storage, inspectable as plain JSON files (`lib/workflow/runStore.mjs`)
- [x] Human review gates (Gate 1 after Stage 03, Gate 2 after Stage 05) — both work,
      **but only via hand-edited JSON**; `scripts/review-run.mjs` only covers Stage 01's
      initial approval, not gates 1/2 (see item 7, the top open gap)
- [x] Evaluation harness — 9 realistic eval cases, mock-safe, zero paid API calls (`evals/`)
- [x] Local Claude Code provider — runs live web research on your subscription, not
      metered API billing (`lib/workflow/providers/localCli.mjs`)
- [x] Hard safety rule: no stage may emit outreach language (email/LinkedIn/contact/
      "reach out") in its output — enforced by regex check, not just instruction, in
      both Stage 05 (`lib/workflow/stage05.mjs`) and the eval harness
      (`evals/harness/checks/deterministic.mjs`)
- [x] 217 automated tests passing, `node --test`, zero new dependencies

---

## 1. Define lead-scoring criteria (utility size, NRW %, region, target roles)

**Status: Done — designed, live, and run three times against real data.**

- [x] 5 ICP-specific dimensions — `utilitySize`, `nrwEvidence`, `regionFit`,
      `targetRolePresence`, `momentumSignal` (bonus) — 0–5 scale each, `totalScore`
      0–25 (`references/scoring-rubric.md`, `04_opportunity-scoring/`)
- [x] Schema rejects a score with no justification; `totalScore` is recomputed
      server-side and corrected if the model's sum is wrong — never trusted blindly
- [x] Live execution path: `lib/workflow/stage04.mjs` + `runStage04Local.mjs`
      (`npm run workflow:stage04 -- --run <id>`), hard-gated on Review Gate 1
      being `"approved"` in code — not just a completion check like every other stage
- [x] **Run three times against real Italy data**, scoring 10, 6, and 14 candidates
      respectively across the regional and national runs — all clean, 0 drops
- [x] Fixed a real gap found on the first run: `utilitySize` was scoring near-zero
      everywhere because Stage 01 wasn't specifically hunting for population/
      network-scale figures — fixed at the source (item 2), not patched in Stage 04
- [ ] `location.region` on candidates is still free text; nothing yet enforces it
      matches `regionFit`'s Italy scope beyond prompt instruction

---

## 2. Data sourcing (utility sites / LinkedIn / Italian water news / EU tenders)

**Status: Stages 01–02 fully live, tested at regional and national scale.**

- [x] Stage 01 (market-signals): live CLI + web search, schema-validated
      (`lib/workflow/stage01.mjs`) — includes a dedicated `organisation-scale`
      signalType and explicit instruction to hunt for population/network-length
      figures, since Stage 04 scoring depends on them
- [x] Stage 02 (candidate-discovery): live execution path
      (`lib/workflow/stage02.mjs`, `runStage02Local.mjs`,
      `npm run workflow:stage02 -- --run <id>`), gated on Stage 01 approval
- [x] `organisationType` is now tied to the run's `targetCustomerType` via an
      explicit scope rule — regulators and competitors are excluded from lead-gen
      runs (but still valid for a deliberate competitor-landscape run, e.g.
      `evals/cases/04-leak-detection-competitors-europe.json`), and
      `public-water-organisation` requires real infrastructure/procurement
      authority, not just general government
- [x] **Tested and approved on real Italy data twice:**
      regional (Lombardia/Lazio, `runs/2026-07-23T15-29-14-971Z__736be5a4`) — 26
      signals/19 sources → 6 candidates, 0 non-buyer leakage;
      national (all regions, `runs/2026-07-24T08-49-42-948Z__cfa09872`) — 49
      signals/57 sources across 9+ regions → 14 candidates, 0 non-buyer leakage
      at ~2.3x the candidate volume — the scope-rule fix held under real stress
- [x] Found and fixed a real evidence-quality bug during the first live run: a
      regional figure and a national figure were flagged as "conflicting" when
      they were just different scopes — rule added to `evidence-standards.md`,
      applies to every future run automatically
- [ ] **No LinkedIn access at all for signals/candidates.** Web search only.
      (Stage 05's contact-finding does use LinkedIn *search snippets* — see item 5 —
      but Stages 01–02 don't.)
- [ ] No dedicated **EU tenders** integration (e.g. TED) — tenders can only turn up
      incidentally through general web search, not a targeted feed
- [ ] No curated **Italian water-sector news** source list — general web search only

---

## 3. Collection script into structured data

**Status: Done for all 5 stages, not just Stage 01.**

- [x] Full live pipeline for every stage: prompt builder → CLI call → JSON parse →
      per-item schema validation → cross-stage ID cross-reference (signals→sources,
      candidates→signals/sources, evidence→sources, scores→candidates,
      briefs→candidates/evidence)
- [x] Safety guards throughout: strips paid API keys, blocks production use, flags
      insufficient-evidence/no-scores/no-briefs runs instead of false-succeeding
- [x] Nothing is ever silently dropped — every stage either validates an item into
      its output or records a warning explaining exactly why it was dropped
- [x] Stage 05 additionally consolidates across runs into `contacts-master.md`
      (`lib/buildContactsMaster.mjs`) — see item 5

---

## 4. Ranking/scoring logic

**Status: Done — same as item 1 (they're the same piece of work).**

See item 1 above; kept as a separate checklist item here only because the original
roadmap listed them separately.

---

## 5. Contact-finding for top-ranked companies

**Status: Done — live, run three times, consolidated across runs.**

- [x] **Decision implemented:** no scraping, no login-based LinkedIn access.
      Contacts sourced via `site:linkedin.com` web search snippets, company
      team/leadership pages, Italian water-sector trade-association listings, and
      press mentions naming a person and role
- [x] `providers/localCli.mjs` gained an optional `tools` parameter; Stage 05 is the
      only stage that requests `tools: ['WebSearch']` only (no WebFetch), so the CLI
      is *structurally* unable to open any URL — including a LinkedIn profile page —
      during contact-finding. This is enforced in code, not just the prompt
- [x] A contact with no source URL is rejected — "not a contact" per the contract;
      empty `contacts` is an accepted, honest result
- [x] Live execution path: `lib/workflow/stage05.mjs` + `runStage05Local.mjs`
      (`npm run workflow:stage05 -- --run <id>`), gated on Stage 01 approval +
      Stage 04 completion
- [x] `--brief-all` flag: briefs every candidate that survives Stage 03 validation
      instead of the model's curated top-pick subset — default behavior unchanged
- [x] **Run four times against real data**, found 1, 2, 11, and 5 real contacts
      respectively (curated regional, curated national, brief-all national,
      brief-all Sicilia) — 19 total real contacts found across all runs so far
      (16 unique after cross-run dedup)
- [x] The model has demonstrated the honesty behavior the contract asks for:
      caught and excluded its own risky contact misattribution (a name that
      matched a different company) rather than guess
- [x] `contacts-master.md` consolidator (`lib/buildContactsMaster.mjs`,
      `npm run contacts:build`) rolls contacts from every Gate-2-**approved** run
      into one table — dedupes by name+company (ignoring any parenthetical
      qualifier on the company name, fixed 2026-07-25 after a real cross-run
      double-count — see Project History), preserves manually-set `verified`
      status, and correctly drops a contact if its source run's Gate 2 is reset to
      pending (found and fixed a real bug here too — see Project History 2026-07-24)
- [x] **Current total: 22/30 contacts** toward the target, from 6 approved runs
- [ ] Still true: LinkedIn has no API/login access — approved methods are all
      public-search-result-only, which caps yield. This is a deliberate,
      documented scope decision, not an oversight
- [ ] 30-contact target not yet met — needs either more regions/markets run
      through the pipeline, or a higher contact hit rate per run. Diagnosed
      the low Calabria/Trentino numbers (see `project_context.md` 2026-07-26
      contact-yield entry): Trentino's 1 contact is genuinely explained by
      candidate type (17 of 18 candidates are small municipal offices), but
      Calabria's initial 0 was run-to-run search non-determinism, not a
      structural limit — a second Stage 05 pass on the same candidate found
      3 real contacts. `toolActivity` is still hardcoded `'not_available'`
      in `localCli.mjs`, so a genuinely low yield still can't be diagnosed
      from logs alone; worth a re-run or spot-check before concluding "no
      contacts exist" for a candidate.
- [x] **Calabria run completed, both gates approved**
      (`evals/cases/09-water-utilities-italy-calabria.json`, run
      `2026-07-26T10-37-38-791Z__705731b4`) — only 1 candidate found (Sorical
      S.p.A.), expected since Sorical is now the sole regional water-service
      operator for essentially all of Calabria; ARRICAL correctly excluded as
      regulator, not utility. Scored 21/25 after a human-caught cross-reference
      fix (see `project_context.md` 2026-07-26 entry). Contacts: 3 found on a
      Stage 05 re-run (Marati, Iennarella, Locanto) after the initial pass
      found none; a 4th (Antonio Voci) was dropped for an unresolved
      LinkedIn identity collision, same risk class as the Trentino Acque
      name collision.
- [x] **Trentino run completed, both gates approved**
      (`evals/cases/10-water-utilities-italy-trentino.json`, run
      `2026-07-26T12-50-05-944Z__a7c6658d`) — 18 candidates (Novareti S.p.A.
      plus 17 municipalities), Novareti scored highest at 22/25, all 18
      briefed, 1 contact found (Matteo Frisinghelli, Novareti).
- [x] **Veneto run completed, both gates approved**
      (`evals/cases/11-water-utilities-italy-veneto.json`, run
      `2026-07-26T15-29-15-127Z__6f4bdfee`) — 6 candidates (fragmented
      Viveracqua-consortium gestori), Alto Trevigiano Servizi scored highest
      at 17/25, 5 of 6 briefed (AcegasApsAmga correctly dropped for lacking
      validated evidence), 2 contacts found (Andrea Mirandola/Etra,
      Francesca Cavaletto/Acquevenete).

---

## 6. Clean output format

**Status: Mostly done — briefs are real and reviewed; no hand-off export yet.**

- [x] Opportunity-brief schema implemented and live: title, why it matters,
      verified facts vs. model interpretation, uncertainties, recommended next
      action, required human verification, contacts
      (`05_opportunity-brief/schemas/opportunity-brief.schema.json`)
- [x] Deliberately excludes outreach instructions by design — enforced by a
      regex guard that drops (not just flags) any brief that slips through
- [x] Human-readable `05-brief.md` rendered alongside the machine `05-briefs.json`
      for every run — this is Review Gate 2's actual reading material
- [x] Two runs' worth of real briefs, human-reviewed and approved (Review Gate 2),
      including one real factual correction caught by human review that the
      pipeline itself had no way to catch (see Project History 2026-07-23/24)
- [x] `contacts-master.md` is a real, hand-off-shaped rollup of contacts across runs
- [ ] No export format for a full hand-off deliverable (e.g. CSV/sheet of
      "30 contacts + 5 qualified leads") — current output is markdown/JSON under
      `runs/<run-id>/` plus `contacts-master.md`, not a single file you'd hand
      to someone as "the deliverable"
- [ ] "5+ qualified leads" isn't formally tracked as its own list yet — the
      scored/briefed candidates across both approved runs (Acea Ato 2, BrianzAcque,
      Gruppo CAP, Uniacque, AQP, SMAT, Publiacqua, and others all scored 17+/25)
      are the de facto lead list, but nothing exports or ranks them as "the 5"

---

## 7. Review Gate CLI

**Status: Done. `scripts/review-gate.mjs` covers both gates.**

- [x] Stage 01's initial approval has a real CLI: `scripts/review-run.mjs`
      (`npm run workflow:review -- --run <id> --decision approve`)
- [x] Gate 1 (after Stage 03) and Gate 2 (after Stage 05) now have a CLI:
      `scripts/review-gate.mjs` (`npm run workflow:review2 -- --run <id> --gate 1|2
      --decision approve|changes-requested [--note "..."]`, plus `--list` and an
      interactive mode when `--decision` is omitted). Displays Stage 02/03
      artifacts for gate 1, Stage 05 briefs + contacts + verification items for
      gate 2. Writes the decision to `metadata.json → reviewGates.gate<N>`
      (validated against the `run-metadata` schema before writing) and to
      `03-review-gate.json` / `05-review-gate.json` — no more hand-edited JSON.
- [x] This already caused one real bug: `contacts-master.md` would have kept
      unreviewed contacts indefinitely after a run's Gate 2 was reset to pending,
      because nothing forced a consistent, structured way of recording the
      decision (fixed in `buildContactsMaster.mjs`; the root cause — no CLI —
      is now also closed)
- [ ] Not yet done: no test coverage for `review-gate.mjs` itself (matches the
      existing convention — none of the `scripts/*.mjs` CLI wrappers have unit
      tests, only the `lib/workflow/*.mjs` modules they call)

---

## 8. ASSUMPTIONS-TO-REVISIT.md (new)

**Status: Done. Tracks assignment-specific decisions for later revisit.**

- [x] `ASSUMPTIONS-TO-REVISIT.md` created at the project root — logs every
      decision made for the internship assignment rather than genuine
      production/HULO judgment: the 5 scoring dimensions, `CONTACT_TARGET=30`,
      `--brief-all` as the default coverage mode, region-specific eval cases,
      Italy as the fixed country scope, the four target role categories
      (from the application form, not independent buyer research), the
      pipeline's NRW-narrow signal tuning, and `contacts-master.md`'s missing
      outreach-status tracking. Each entry states what it should become once
      real HULO input exists.
- [x] Rule going forward: assignment-specific choices get flagged in the
      moment and logged here, not left implicit.
- [x] Item 5 (Italy scope) verified against the actual code, not just
      asserted: grepped `lib/`, `scripts/`, `app/`, `components/`,
      `workflows/` (schemas included) for `italy`/`italian`. The original
      claim — "the pipeline itself is not Italy-specific, only the cases are"
      — didn't hold. Five hardcoded Italy references exist in live
      prompt-building code and stage contracts outside the case files:
      `lib/workflow/stage02.mjs`, `lib/workflow/stage04.mjs`,
      `02_candidate-discovery/CONTEXT.md`, `05_opportunity-brief/CONTEXT.md`,
      and `references/scoring-rubric.md`'s `regionFit` definition. Schemas
      are clean (`country` is free text). Corrected in the file with
      file:line specifics.
- [x] Separately checked (not just a portability concern): do any of those 5
      currently cause search tunnel vision within Italy? Only one — the
      Stage 02 "Italian ATO" example — touches Stage 01/02 search at all
      (Stage 01 has zero hardcoded Italy text). Cross-checked against real
      Stage 02 output across three runs: it generalized correctly to a
      differently-named governance body (`EGATO5`), so no evidence of
      regional narrowing in practice today — it's a portability issue for a
      second country, not a current accuracy bug.

---

## 9. Visual dashboard (future)

**Status: Not started — deliberately deferred.**

- [ ] Trigger to start: only once the pipeline has been generalized to a
      second vertical/ICP beyond Italian water utilities (see
      `ASSUMPTIONS-TO-REVISIT.md`), and only when the goal shifts to
      demoing/pitching the system to external prospects
- [ ] Scope when started: a simple, functional dashboard — NOT a decorative
      graph visualization. Needed views: table of leads ranked by score with
      evidence/justification visible per score; simple funnel view (signals
      found → candidates → validated → scored → briefed → contacted); one
      summary screen showing current run status/output
- [ ] Explicitly out of scope: force-directed node graphs, animated
      visualizations, or any UI complexity that doesn't directly help a
      prospect evaluate the tool in under 2 minutes

---

## Honest summary

**Genuinely done, tested, and proven on real Italy data — all five stages:**
Stage 01 (market signals) through Stage 05 (opportunity briefs + contacts) each
have live execution paths, are gated on the right approvals, and have run
successfully multiple times against the real target market — regional scale
(Lombardia/Lazio, 6 candidates; Sicilia, 7 candidates; Calabria, 1 candidate;
Trentino, 18 candidates; Veneto, 6 candidates) and national scale (all of
Italy, 14 candidates).
Both Review Gates have been exercised for real, including several genuine
corrections a human caught that the pipeline had no way to catch itself (two
internally-consistent-but-wrong funding figures; an opportunity brief that was
too conservative about a plan's named funding categories; a missing
cross-reference between two evidence items describing the same funding line
at different points in time; a momentum score that leaned on an unconfirmed
funding-eligibility signal). 221 tests passing throughout (11 eval cases).

**Real product output exists:** six Gate-2-approved runs, real opportunity
briefs with verified-fact/interpretation splits, and `contacts-master.md` with
22 real, sourced, deduplicated contacts (of the 30 targeted) — Veneto added
2 (Etra, Acquevenete), Trentino added 1 (Novareti), and Calabria's initial
0-contact result turned out to be run-to-run search variance, not a real
ceiling: a Stage 05 re-run on the same candidate found 3 more (a 4th was
dropped for an unresolved name collision).

**Still missing:** a CSV/hand-off export (item 6), LinkedIn API/login access
(decided against, not a gap), EU tender integration, and a curated Italian
water-news source list (item 2). The contact target sits at 22/30. Trentino's
low yield is genuinely explained by candidate type (17 of its 18 candidates
are small municipal offices); Calabria's was not — worth spot-checking or
re-running Stage 05 once before reading a low-contact result as a structural
limit, since live search is non-deterministic and there's currently no
tool-call logging (`toolActivity` in `localCli.mjs` is hardcoded
`'not_available'`) to diagnose it from the run artifacts alone. The Gate
1/Gate 2 CLI gap (item 7) is closed. Item 8 (`ASSUMPTIONS-TO-REVISIT.md`) is
worth checking before any HULO hand-off, since several current defaults
(scoring dimensions, contact target, target role categories, Italy scope)
came from the assignment brief, not validated HULO input.
