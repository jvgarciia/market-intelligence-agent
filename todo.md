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
- [x] Evaluation harness — 7 realistic eval cases, mock-safe, zero paid API calls (`evals/`)
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
- [x] **Run three times against real data**, found 1, 2, and 11 real contacts
      respectively (curated regional, curated national, brief-all national) — 14
      total real contacts found across all runs so far
- [x] The model has demonstrated the honesty behavior the contract asks for:
      caught and excluded its own risky contact misattribution (a name that
      matched a different company) rather than guess
- [x] `contacts-master.md` consolidator (`lib/buildContactsMaster.mjs`,
      `npm run contacts:build`) rolls contacts from every Gate-2-**approved** run
      into one table — dedupes by name+company, preserves manually-set `verified`
      status, and correctly drops a contact if its source run's Gate 2 is reset to
      pending (found and fixed a real bug here — see Project History 2026-07-24)
- [x] **Current total: 12/30 contacts** toward the target, from 2 approved runs
- [ ] Still true: LinkedIn has no API/login access — approved methods are all
      public-search-result-only, which caps yield. This is a deliberate,
      documented scope decision, not an oversight
- [ ] 30-contact target not yet met — needs either more regions/markets run
      through the pipeline, or a higher contact hit rate per run

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

## Honest summary

**Genuinely done, tested, and proven on real Italy data — all five stages:**
Stage 01 (market signals) through Stage 05 (opportunity briefs + contacts) each
have live execution paths, are gated on the right approvals, and have run
successfully multiple times against the real target market — both at regional
scale (Lombardia/Lazio, 6 candidates) and national scale (all of Italy, 14
candidates). Both Review Gates have been exercised for real, including one
genuine correction a human caught that the pipeline had no way to catch itself
(a funding figure that was internally consistent but simply wrong). 217 tests
passing throughout.

**Real product output exists:** two Gate-2-approved runs, real opportunity
briefs with verified-fact/interpretation splits, and `contacts-master.md` with
12 real, sourced contacts (of the 30 targeted) — Paolo Lanza and Daniele Granato
are recorded from earlier curated passes but currently superseded by the
national run's 11-contact `--brief-all` pass plus the regional run's 1.

**Still missing:** a CSV/hand-off export (item 6), LinkedIn API/login access
(decided against, not a gap), EU tender integration, and a curated Italian
water-news source list (item 2). The contact target sits at 12/30 — closing
that gap means running more regions or improving Stage 05's per-run contact
yield. The Gate 1/Gate 2 CLI gap (item 7) is now closed.
