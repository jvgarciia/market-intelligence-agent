# Stage 02 — Candidate Discovery

# Purpose
Identify the organisations that may be relevant potential customers or market
actors in the target market: utilities, drinking-water companies, infrastructure
operators, municipalities, public water organisations, regulators, and named
competitors. Each candidate must carry evidence of why it is relevant.

# Inputs
- `request.json` (validated `run-request`).
- `01-market-signals.json` and `00-sources.json` from Stage 01.

# Reference context
- `../references/evidence-standards.md`.
- `./schemas/candidate-organisation.schema.json`.
- `../references/schemas/source-record.schema.json`.

# Tools allowed
- `web_search` (cheap/full only) to confirm an organisation exists and operates
  in the target market.
- `mock` mode: deterministic fixtures only.

# Process
1. From the signals (and targeted lookups), list candidate organisations.
2. For each: `name`, `organisationType` (enum), `location` (country/region),
   and `relevanceEvidence` — claims tied to `signalIds` and/or `sourceIds`.
3. Set a `confidence` and state `uncertainty` (e.g. "ownership unclear",
   "may be out of scope geographically").
4. Do not invent organisations. A candidate with no relevance evidence is not a
   candidate.

# Output schema
- `02-candidates.json` — array of `candidate-organisation`.

# Verification checks
- Every `relevanceEvidence[].signalIds[]` exists in `01-market-signals.json`;
  every `sourceIds[]` exists in `00-sources.json`.
- `organisationType` is a valid enum value; `location.country` is present.
- No duplicate organisations (same name + country).

# Failure conditions
- No discoverable candidates → emit an empty list and record the gap; do not pad
  with guesses.
- Geographic/scope ambiguity → keep the candidate but flag it in `uncertainty`
  for the reviewer, do not silently include or exclude.

# Human review requirements
- Feeds **Review Gate 1** (after Stage 03): the reviewer checks this candidate
  list against the validated/rejected evidence.
