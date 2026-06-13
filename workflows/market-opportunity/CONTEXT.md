# Workflow: Market Opportunity Research

**Status:** Foundation / contracts defined. Stages currently run in **mock mode
only** (deterministic fixtures, $0). Live `cheap`/`full` stage execution is the
*next* step and will be added only after the evaluation harness (`evals/`) shows
the staged version beats the current single-report baseline.

This is the first narrow workflow of the B2B Market Opportunity & Account
Intelligence System. It does **one** job well: given a market and a customer
type, find market signals, discover candidate organisations, validate the
evidence, score the opportunities, and produce decision-ready briefs — with every
intermediate step saved as an inspectable artifact.

It does **not** generate outreach, contact anyone, or make decisions for the
human. Two review gates keep a person in control.

---

## Why stages (ICM-inspired)

The current product (`app/api/chat`) produces one block of prose. You cannot see
what it searched, which source backs which claim, or why it ranked things the way
it did. This workflow applies the Interpretable Context Methodology principles
named in the project brief:

- **One stage, one responsibility.** Each stage has a single job and its own
  `CONTEXT.md` contract.
- **Stage-specific context.** A stage loads only what it needs — its own
  `CONTEXT.md` plus the shared `references/`. No giant all-in-one prompt.
- **Reference vs working artifacts.** Stable rules live in `references/`
  (rubrics, standards, schemas). Run-specific outputs live in `runs/<run-id>/`.
  These never mix.
- **Inspectable intermediate outputs.** Every stage writes JSON (machine-checkable)
  and, where a human reviews it, Markdown.
- **Explicit input/process/output contracts.** Every `CONTEXT.md` states inputs,
  tools allowed, output schema, verification checks, failure conditions, and
  human-review requirements.
- **Human review gates.** Defined below.

## Stages

| # | Stage | Input | Output artifact(s) | Schema |
|---|-------|-------|--------------------|--------|
| 01 | Market signals | run request | `01-market-signals.json` (+ `00-sources.json`) | `market-signal`, `source-record` |
| 02 | Candidate discovery | signals + sources | `02-candidates.json` | `candidate-organisation` |
| 03 | Evidence validation | signals + candidates | `03-validation.json` (validated + rejected) | `validated-evidence-item`, `rejected-evidence-item` |
| 04 | Opportunity scoring | validated evidence + candidates | `04-scores.json` | `opportunity-score` |
| 05 | Opportunity brief | scores + validated evidence | `05-briefs.json` + `05-brief.md` | `opportunity-brief` |

Each run also writes `request.json` (the validated inputs) and `metadata.json`
(run-level state, including review-gate status).

## Inputs (the run request)

- `targetMarket` — market or region, e.g. "Spain", "Scandinavia".
- `targetCustomerType` — e.g. "water utilities", "municipal infrastructure operators".
- `solutionDescription` — what the company offers, kept generic (no confidential data).
- `businessObjective` — what a good result enables, e.g. "shortlist utilities to research for outbound".
- `constraints` — optional list, e.g. "EU only", "public-sector only".

Schema: `references/schemas/run-request.schema.json`.

## Output (the run, as a whole)

- important market signals (Stage 01)
- candidate organisations with evidence of relevance (Stage 02)
- a validated evidence pack and a rejected-items list with reasons (Stage 03)
- a preliminary, explainable opportunity ranking (Stage 04)
- decision-ready briefs stating facts vs interpretation, uncertainties, and the
  recommended next action (Stage 05)

## Human review gates

**Review Gate 1 — after Stage 03 (validation).** A person inspects
`02-candidates.json` and `03-validation.json`: discovered organisations,
supporting evidence, rejected candidates and *why*, and missing information.
Scoring (04) and briefs (05) should not be trusted until candidates and evidence
have been eyeballed. Gate status is recorded in `metadata.json → reviewGates.gate1`.

**Review Gate 2 — before any brief is treated as final** (and long before any
future outreach step). Each brief (`opportunity-brief` schema) must separate
**verified facts**, **model interpretations**, **recommendations**,
**uncertainties**, and **items requiring human confirmation**
(`factVsInterpretation` + `humanVerificationRequired` fields). Gate status:
`metadata.json → reviewGates.gate2`.

For this foundation phase the gates are **developer-facing**: the artifacts are
human-readable files you open and review. A UI for gates is intentionally
deferred (see `project_context.md`).

## Cost rules

- `mock` mode: 0 API calls, deterministic fixtures. Always free. **Default.**
- `cheap`/`full`: not yet wired for stages. The orchestrator (`lib/workflow/
  runWorkflow.mjs`) **throws a clear error** instead of silently spending — there
  is no silent fallback from mock to paid.

## How to run (mock)

```bash
npm run workflow:demo     # runs one mock run, writes runs/<id>/, prints paths
npm test                  # validates schemas, store, and a full mock pipeline
```

## Future direction (not built yet)

Once the staged baseline is evaluated, the long-term architecture may become:

```
Parallel specialist research → deterministic processing → synthesis
→ verification → human approval
```

This will be implemented **only** where `evals/` demonstrates measurable
improvement over the baseline. See `evals/README.md`.
