# Evaluations — Market Opportunity Workflow

This folder is the **measurement foundation**. Its job is to answer one question
before any complexity is added: *does a change actually make the output better?*

## Why evaluations come before multi-agent orchestration

Adding more agents makes things more expensive, slower, and harder to debug. The
only justification for that cost is measurable improvement. Without an eval harness
running *before* the extra complexity, every architectural decision is a guess.

The eval harness forces every future change to earn its place with evidence, not
intuition. "It feels more sophisticated" is not an acceptance criterion. A
measured, reproducible win is.

---

## What is being evaluated

Two systems produce a market-opportunity result for the same input:

- **Baseline** — the current single-report flow (`app/api/chat`, one AI call, one
  prose report). Already shipped. This is the control.
- **Staged** — the `workflows/market-opportunity/` pipeline (five inspectable
  stages with schema-validated artifacts). Currently mock-only.

Every future version (live staged, and later any multi-agent variant) must be scored
against the same cases and compared to the baseline.

---

## The rule that protects against complexity

> **Multi-agent functionality will not be accepted unless it beats the baseline on
> these dimensions by a margin that justifies its extra cost, latency, and
> maintenance. A measured win is required. "It feels more sophisticated" is not.**

---

## Evaluation dimensions

| Dimension | What "good" looks like | How it's judged |
|-----------|------------------------|-----------------|
| Factual accuracy | Claims match what sources actually say | Human/judge spot-check vs source |
| Citation support | Every non-obvious claim has a source id | Automatable: count unsupported claims |
| Source quality | Sources skew Tier A/B, not C | From `qualityTier` in normalized output |
| Source recency | Dated claims meet recency thresholds | Automatable vs `evidence-standards.md` |
| Relevance | Signals/candidates fit the market & customer type | Human/judge |
| Candidate usefulness | Candidates are real, reachable, in-scope orgs | Human |
| Ranking justification | Every score has evidence-backed justification | Automatable: missing justifications |
| Actionability | `recommendedNextAction` is concrete and non-outreach | Human + deterministic check |
| Uncertainty handling | Unknowns are surfaced, not hidden | Human |
| Cost | API spend per run | Logged per run in metrics.json |
| Latency | Wall-clock per run | Logged per run in metrics.json |
| Ease of debugging | Can you tell *which stage* failed? | Structural: staged wins by design |

**What can be automated reliably:**
- URL validity
- Duplicate URLs and candidate names
- Score range (1–5)
- Score justification presence
- Source count
- Signal citation presence
- Outreach language in recommendations
- Mock content labelling

**What requires human judgment (use the rubric):**
- Factual accuracy
- Relevance
- Candidate usefulness
- Ranking logic
- Actionability quality
- Uncertainty handling quality
- Source quality tier assessment

---

## Test cases

`cases/*.json` — five realistic cases covering the prompt's example categories.
Each defines **expected characteristics** (not fabricated exact answers): what a
strong result should contain, what it must avoid, and what to watch for. No
confidential HULO information is encoded.

| File | Category |
|------|----------|
| `cases/01-water-utilities-spain.json` | Water utilities in a single national market |
| `cases/02-water-infrastructure-scandinavia.json` | Regional infrastructure opportunities |
| `cases/03-digital-water-latam.json` | Digital transformation in an emerging region |
| `cases/04-leak-detection-competitors-europe.json` | Competitor landscape |
| `cases/05-water-funding-tenders.json` | Public funding / tenders signal |

---

## Harness architecture

```
evals/
  cases/                    ← 5 realistic test case definitions
  results/                  ← eval run outputs (git-ignored; .gitkeep keeps the folder)
  harness/
    ids.mjs                 ← unique eval run ID generator
    storage.mjs             ← read/write for evals/results/<evalRunId>/
    run.mjs                 ← main runner (runEvaluation, loadCase, listCases)
    adapters/
      baseline.mjs          ← wraps the baseline flow (mock-safe)
      staged.mjs            ← wraps the staged workflow (mock-safe)
      future-contract.mjs   ← interface contract for future multi-agent adapters
    normalize/
      baseline.mjs          ← maps prose report → common evaluation structure
      staged.mjs            ← maps JSON artifacts → common evaluation structure
      index.mjs             ← routes to the right normalizer
    checks/
      deterministic.mjs     ← automated correctness and quality checks
    rubric/
      rubric.md             ← human reviewer scoring guide (1–5 per dimension)
      review-cli.mjs        ← CLI for entering reviewer scores
```

### Every eval run produces

```
evals/results/<evalRunId>/
  metadata.json             ← run ID, case ID, mode, timestamp, paid-calls flag
  test-case.json            ← the eval case definition used
  baseline/
    raw-output.json         ← what the baseline adapter returned
    normalized-output.json  ← mapped to the common structure
    metrics.json            ← latency, model calls, search calls, cost
    issues.json             ← deterministic check results
  staged/
    raw-output.json         ← what the staged adapter returned
    normalized-output.json  ← mapped to the common structure
    metrics.json            ← same schema as baseline metrics
    issues.json             ← deterministic check results
  comparison.json           ← structural comparison + feature diff
  summary.md                ← human-readable summary with tables
  human-review.json         ← reviewer scores (added after npm run eval:review)
```

---

## Running evaluations

### Mock comparison (zero cost, validates infrastructure)

```bash
npm run eval:mock                              # run all 5 cases
npm run eval:mock -- --case 01-water-utilities-spain  # run one case
```

Mock results go to `evals/results/` (git-ignored). They prove the harness works —
**not** that the AI output is good. Content is synthetic and clearly labelled.

### Human review (after a mock or live run)

```bash
npm run eval:review -- --run <evalRunId>
```

Guides you through 8 dimensions (1–5 score + optional comment). Writes
`human-review.json` to the eval run directory. See `harness/rubric/rubric.md`
for the full scoring guide with anchors.

### Live comparison (real API calls — explicit confirmation required)

```bash
npm run eval:live -- --case 01-water-utilities-spain --mode cheap
npm run eval:live -- --help
```

The script shows an estimated call count and cost estimate before running, and
requires you to type "yes" to proceed. Defaults to one case at a time.

**Current status:** Live stage execution in the staged workflow is not yet wired
(`runWorkflow` throws for non-mock modes). The `eval:live` script is ready
infrastructure — it will call real APIs once live stage execution is enabled.

---

## What mock evaluation proves and does not prove

### Proves ✓
- The harness runs without error
- Both adapters produce structured output
- Both outputs normalize to a comparable structure
- Deterministic checks (URL validity, duplicate detection, outreach language, etc.) run on both
- Comparison and summary files are produced
- No paid API calls are made

### Does NOT prove ✗
- Anything about real AI output quality
- Which architecture produces better market intelligence
- Whether signals are relevant, accurate, or useful
- Whether candidates are real organisations

A live comparison with real API calls is needed for quality conclusions.

---

## How cost will be controlled for live runs

- Only one case at a time (no accidental batch runs)
- Cost estimate is shown before execution
- Explicit "yes" confirmation required
- API errors are recorded, not swallowed
- Mode cannot silently fall back (cheap ≠ full; mock ≠ cheap)
- Results record whether real API calls were made

---

## How results guide future architecture decisions

| Decision | Evidence needed |
|----------|----------------|
| Enable live cheap/full staged execution | Mock harness working + human confirms staged structure is useful |
| Accept staged as the new baseline | Live comparison showing staged beats or matches baseline on accuracy and usefulness |
| Add a specialist agent (e.g. evidence validator) | Staged live results showing validation stage is the quality bottleneck |
| Reject a proposed agent | Eval showing no measurable improvement over staged for the added cost |

The pattern is always: **measure first, build second**.
