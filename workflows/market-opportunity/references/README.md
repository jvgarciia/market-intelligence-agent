# References — stable rules and criteria

This folder holds **reference context**: rules, rubrics, standards, and schemas
that are stable across every run. ICM separates this from **working artifacts**
(the run-specific research and outputs, which live in `runs/<run-id>/`).

**The rule:** nothing in here changes because of a single run. If a run reveals
that a rule is wrong (e.g. the recency threshold is too strict), you update the
reference file deliberately. This is the *manual* form of the ICM "edit the source,
not the output" argument (paper §6.3) — the paper treats the *automated* version
(detecting recurring edits and suggesting source changes) as future work, not a
shipped feature. Run outputs never get written here.

## Contents

| File | Used by | Purpose |
|------|---------|---------|
| `evidence-standards.md` | Stage 03 | What counts as strong vs weak evidence; recency thresholds; source-quality tiers; rejection reasons. |
| `scoring-rubric.md` | Stage 04 | The six scoring dimensions, the 0–5 scale, and what each score level means. Stops the model inventing arbitrary numbers. |
| `schemas/source-record.schema.json` | All stages | Shape of a cited source. |
| `schemas/run-request.schema.json` | Orchestrator | Shape of the validated run inputs. |
| `schemas/run-metadata.schema.json` | Orchestrator | Shape of `metadata.json`. |

Stage-specific schemas live next to their stage (e.g.
`01_market-signals/schemas/market-signal.schema.json`).

## Why metadata fields are repeated in each schema

Each artifact schema embeds its own `metadata` block (`runId`, `stage`,
`createdAt`) rather than referencing a shared definition. This is deliberate: a
self-contained schema can be read and understood on its own, which matters more
for a learning project than strict de-duplication. The standard set of metadata
fields is documented once here and kept identical across schemas.
