# Report Notes

Source of truth for the university report on this project. Logs failure
modes caught during the build and what changed as a result, plus the
project's known limitations. **Rule going forward:** when a new failure
mode or limitation surfaces, log it here in the moment — same convention as
`ASSUMPTIONS-TO-REVISIT.md`.

---

## Failure modes caught

### 1. Distress ≠ momentum
**Run:** Sicilia (`2026-07-25T09-40-14-107Z__b5971aea`).
AICA's brief cited €23M in debt tied to unresolved water losses, but no
named response initiative — the model initially risked reading financial
distress itself as a positive signal. Added an explicit rubric line to
`scoring-rubric.md`: distress is context, not a positive `nrwEvidence`/
`momentumSignal` signal, since those dimensions require an active, *named*
response. AICA scored 0/0 on those two dimensions, citing the new rule
directly — 9/25 total, the lowest score in that run.

### 2. Same-fact consistency across restatements (bundled claims)
**Run:** Trentino (`2026-07-26T12-50-05-944Z__a7c6658d`).
The same underlying facts (Novareti's loss-reduction target, smart-meter
rollout) were correctly rejected as individual Stage 01 signals, but a
bundled candidate-evidence claim restating the identical facts from the
identical sources was validated anyway — bundling several facts into one
claim let weak evidence pass that would have been rejected on its own.
Added a rule to `evidence-standards.md`: a bundled claim inherits the
rejection of any individual fact it restates from the same sources.

### 3. Entity continuity
**Run:** Toscana (`2026-07-27T11-39-25-488Z__cac519a3`).
GEAL S.p.A. passed every evidence-quality check and scored 16/25 — a
respectable score — while it was confirmed to be merging into GAIA
(concession dispute settled against it, no further appeal). Nothing in the
five scoring dimensions checked whether a candidate has a confirmed right
to operate long enough to sign a multi-year contract. Added an
`entityContinuity` field to Stage 02's candidate contract and a
`leadQualification.excluded` disqualifier, kept deliberately separate from
`momentumSignal` so a score stays answerable as "what would this candidate
be worth if it weren't being absorbed" (see `ASSUMPTIONS-TO-REVISIT.md`
item 9). Phase 3's qualified-leads filter makes this exclusion a hard rule
rather than a one-off correction.

### 4. Recency ≠ verification
**Run:** GEAL correction, Toscana.
A "verified" fact can still be stale even when correctly sourced and
recently checked: the entity-continuity conclusion was independently
verified once (checking sources as of a point in time), then found to be
already a month out of date on a second pass that searched *forward* past
the most recent dramatic event found rather than re-reading the same
sources. Added an "entity-continuity recency rule" to
`evidence-standards.md` requiring exactly this forward-check, distinct from
ordinary source-age recency rules.

### 5. Summary diverged from artifacts, twice
**Runs:** Veneto (Gate-2 wording) and Toscana (GAIA region label).
Twice, a natural-language summary misdescribed correctly-generated JSON
artifacts: Veneto's summary said contacts were "unverified pending your
review" when Gate 2 had actually been self-approved with no human
read-through (contradictory framing, not a data error); Toscana's summary
said "GAIA/Livorno-Elba" when `02-candidates.json` always had the correct
Lucca/Pistoia/Massa-Carrara region. Schemas validate the JSON; nothing
validates the prose describing it, and the prose is what gets read. Both
are prose-only errors, not pipeline bugs — logged as a distinct error
category from data-quality issues.

### 6. One dimension, one question
**Run:** GEAL correction, Toscana.
An early attempt at the GEAL fix scored `momentumSignal` down *and*
excluded the candidate for the same underlying entity-continuity fact —
double-counting one risk in two places. Reverted `momentumSignal` to a
clean, evidence-only score and moved the entity-continuity risk entirely
into the additive `leadQualification.excluded` field, so each scoring
dimension answers exactly one question and stays usable as a counterfactual.

### 7. Non-determinism in contact yield AND in contact identity
**Runs:** Calabria (`2026-07-26T10-37-38-791Z__705731b4`), Siciliacque
(Sicilia run, re-run diagnostic).
Live web search is non-deterministic in two distinct ways: (a) yield —
Calabria's first Stage 05 pass found 0 contacts; a second pass on the same
candidate found 3 real ones, confirming the empty result was search
variance, not a ceiling; (b) identity — a re-run on Siciliacque returned a
*different* named person than the original pass, not a superset. Empty
results tend to replicate (a genuinely low-yield candidate stays low on
retry); positive results do not always replicate the same way. Working
method: spot-check or re-run once before reading a low-contact result as a
structural limit.

### 8. Zero corrections ≠ nothing wrong
**Runs:** Veneto (held up under spot-check) vs. Toscana (didn't).
Veneto closed with zero corrections across all five stages — the first
region to do so — which was independently spot-checked (three headline
euro figures re-verified against original sources) specifically *because*
a clean run is worth confirming rather than assuming as pipeline maturity.
It held up. Toscana also looked clean at Gate 2, but the GEAL
entity-continuity issue (failure mode 3) surfaced only afterward, from a
deliberate follow-up check, not from anything the pipeline itself flagged.
The lesson: an approved run with no corrections logged is not evidence
that nothing was missed — it's evidence that nothing was *caught yet*.

---

## Limitations

- **Confidence distribution:** contact confidence scores are not uniformly
  high — see `deliverables/contacts-summary.md` for the live breakdown
  (2 high ≥0.7, 26 mid 0.4–0.7, 2 low <0.4 as of the 30-contact target
  being met). Most contacts sit in the mid band: real, sourced, but not
  independently corroborated.
- **PNRR expiry:** the RRF Regulation requires all PNRR milestones/targets
  complete by 31 August 2026. Most candidates' momentum evidence in this
  project is PNRR-anchored (fully or partly) — see
  `deliverables/pnrr-dependency.md`. Momentum scores have an undocumented
  time-dependency: a score computed today can silently become a claim about
  a *finished* project after that date, with nothing in the pipeline
  flagging the change.
- **Italy hardcoded in 5 places** outside the case files (`stage02.mjs`,
  `stage04.mjs`, both `02_candidate-discovery/CONTEXT.md` and
  `05_opportunity-brief/CONTEXT.md`, and `scoring-rubric.md`'s `regionFit`
  text) — see `ASSUMPTIONS-TO-REVISIT.md` item 5 for the full grep-verified
  list. Blocks running the pipeline for a second country until genericized.
- **No EU tender feed.** Tenders can only turn up incidentally through
  general web search, not a targeted TED integration.
- **LinkedIn scope decision.** Deliberate, not a gap: contact-finding uses
  `site:linkedin.com` search-result snippets only — no login, no scraping,
  no page fetch (`runStage05Local.mjs` passes `tools: ['WebSearch']` only,
  enforced in code). Caps contact yield but keeps the method verifiably
  compliant with LinkedIn's terms.
