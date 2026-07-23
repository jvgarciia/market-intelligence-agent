# Stage 01 — Market Signals

# Purpose
Find the commercial signals that make a market worth pursuing: regulations,
funding and infrastructure investment, market problems, digitalisation and
technology-adoption activity, tenders, competitor developments, and
organisation-scale figures — for the run's `targetMarket` and
`targetCustomerType`. Capture each as a discrete, sourced claim, not as prose.

# Inputs
- `request.json` (validated `run-request`): `targetMarket`, `targetCustomerType`,
  `solutionDescription`, `businessObjective`, `constraints`.

# Reference context
- `../references/evidence-standards.md` (source-quality tiers, recency).
- `../references/schemas/source-record.schema.json`.
- `./schemas/market-signal.schema.json`.
- Loads **only** the above. Not the scoring rubric, not later-stage context.

# Tools allowed
- `web_search` (Tavily, via `lib/tools/webSearch.js`) — in `cheap`/`full` only.
- In `mock` mode: no tools; deterministic fixtures from `lib/workflow/mockPipeline.mjs`.
- No other tools. No writing outside `runs/<run-id>/`.

# Process
1. Derive a small set of focused queries from the inputs (market + signal type).
   Include at least one query aimed specifically at organisation-scale figures
   (population served, network length/km, number of connections, customer
   count) for the named organisations already found — Stage 04 scores every
   candidate on size, and a size claim with no source caps that score low.
2. For each useful result, record a `source-record` in `00-sources.json`.
3. Express each finding as one `market-signal`: a single `claim`, its `signalType`,
   `relevance`, `confidence` (0–1), `uncertainty`, and the `sourceIds` backing it.
   Use `signalType: "organisation-scale"` for population/network-size figures.
4. One claim per signal. Do not bundle multiple facts into one signal.

# Output schema
- `00-sources.json` — array of `source-record`.
- `01-market-signals.json` — array of `market-signal`.

# Verification checks
- Every `market-signal.sourceIds[]` exists in `00-sources.json`.
- `confidence` ∈ [0, 1]; `signalType` and `relevance` are valid enum values.
- No signal without at least one source (no unsupported assumptions).

# Failure conditions
- Search unavailable / returns nothing usable → emit zero signals and record the
  gap; do **not** fabricate signals. (The orchestrator surfaces this, never hides it.)
- A result whose claim cannot be tied to its URL → drop it here, do not cite it.

# Human review requirements
- None blocking at this stage. Output feeds Review Gate 1 after Stage 03.
