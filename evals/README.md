# Evaluations — Market Opportunity Workflow

This folder is the **measurement foundation**. Its job is to answer one question
before any complexity is added: *does a change actually make the output better?*

It is deliberately lightweight. There is no scoring platform, no dashboard, no
automated judge yet — just a clear definition of what "better" means and a set of
realistic test cases. Building the harness that runs these cases against live
modes comes **after** this foundation, and only against the baseline below.

## What is being evaluated

Two systems produce a market-opportunity result for the same input:

- **Baseline** — the current single-report flow (`app/api/chat`, one prompt, one
  report). Already shipped. This is the control.
- **Staged** — the `workflows/market-opportunity/` pipeline (five inspectable
  stages with schema-validated artifacts). Currently mock-only.

Every future version (live staged, and later any multi-agent variant) is scored
on the **same cases** and compared to the baseline.

## The rule that protects against complexity

> **Multi-agent functionality will not be accepted unless it beats the baseline on
> these dimensions by a margin that justifies its extra cost, latency, and
> maintenance.** "It feels more sophisticated" is not acceptance. A measured win is.

This is the whole point of building evaluations *before* agents: it forces every
added layer to earn its place with evidence, not vibes.

## Evaluation dimensions

| Dimension | What "good" looks like | How it's judged |
|-----------|------------------------|-----------------|
| Factual accuracy | Claims match what sources actually say | Human/judge spot-check vs source |
| Citation support | Every non-obvious claim has a source id | Automatable: count unsupported claims |
| Source quality | Sources skew Tier A/B, not C | From `qualityTier` in `00-sources.json` |
| Source recency | Dated claims meet recency thresholds | Automatable vs `evidence-standards.md` |
| Relevance | Signals/candidates fit the market & customer type | Human/judge |
| Candidate usefulness | Candidates are real, reachable, in-scope orgs | Human |
| Ranking justification | Every score has evidence-backed justification | Automatable: missing justifications |
| Actionability | `recommendedNextAction` is concrete and non-outreach | Human + integrity check |
| Uncertainty handling | Unknowns are surfaced, not hidden | Human |
| Cost | API spend per run | Logged per run |
| Latency | Wall-clock per run | Logged per run |
| Ease of debugging | Can you tell *which stage* failed? | Structural: staged wins by design |

The last three (cost, latency, debuggability) are where the staged design is
*expected* to differ from the baseline — but accuracy and usefulness are where it
must not regress.

## Test cases

`cases/*.json` — five realistic cases covering the prompt's example categories.
Each defines **expected characteristics**, not fabricated exact answers: what a
strong result should contain, what it must avoid, and what to watch for. No
confidential HULO information is encoded — all inputs are generic and public.

| File | Category |
|------|----------|
| `cases/01-water-utilities-spain.json` | Water utilities in a single national market |
| `cases/02-water-infrastructure-scandinavia.json` | Regional infrastructure opportunities |
| `cases/03-digital-water-latam.json` | Digital transformation in an emerging region |
| `cases/04-leak-detection-competitors-europe.json` | Competitor landscape |
| `cases/05-water-funding-tenders.json` | Public funding / tenders signal |

## How these will be used (next, not now)

1. Run each case through baseline and staged (in `cheap` mode to control cost).
2. Score each dimension (start with the automatable ones; human-judge the rest).
3. Record results per version. A new version ships only if it wins where it must
   and does not regress accuracy/usefulness.

Until the harness exists, these cases are still useful: they are the explicit
definition of done for the workflow, and the mock pipeline already satisfies the
*structural* expectations (schema-valid artifacts, citations present, scores
justified, gates defined).
