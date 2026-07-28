# Stage 02 — Candidate Discovery

# Purpose
Identify the organisations that fit the run's `targetCustomerType` — normally
buyer-side entities: utilities, drinking-water companies, multi-utility
companies, infrastructure operators, municipalities, and public water
organisations. Each candidate must carry evidence of why it is relevant.

Regulators and competitors are only in scope when `targetCustomerType` itself
asks for that kind of landscape mapping (e.g. "competing vendors, for
positioning" — see `organisationType` scope rule below). For an ordinary
lead-gen run, they are not candidates.

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

## `organisationType` scope rule
- Check `organisationType` against `targetCustomerType` before emitting a
  candidate. If `targetCustomerType` describes utilities/companies to sell to,
  do **not** emit `regulator` or `competitor` candidates — a regulator or
  competitor mentioned in the signals belongs in Stage 01 as a signal
  (`signalType: regulation` / `competitor-development`), not as a Stage 02
  candidate. Only use `regulator`/`competitor` when `targetCustomerType` is
  itself asking for that landscape (e.g. competitor mapping for positioning).
- `public-water-organisation` is reserved for a body with **direct** ownership,
  operation, or procurement authority over water infrastructure — e.g. an
  Italian ATO/Ente di Governo dell'Ambito. A general regional or municipal
  government acting only as a funding or policy conduit, with no such direct
  remit, does not qualify under any `organisationType` — leave it out rather
  than force-fitting it into the closest-sounding type.

## Parent/subsidiary entity-scope rule
- When signals describe two entities under the same corporate group where one
  is the customer-facing **operating company** (runs the network day to day,
  owns the leak-reduction problem and the budget/decision around solving it)
  and the other is an **infrastructure/network-holding company** (owns the
  physical assets on the parent group's behalf but has no independent
  customer-facing operations of its own), emit only the operating company as
  a candidate. The holding company is not a separate lead — note the
  ownership/group relationship in the operating company's `uncertainty` or
  `relevanceEvidence` instead of creating a second candidate for it.
- Example pattern (do not assume these exact names apply outside the signals
  that name them): an operating company like "Novareti S.p.A." runs
  captazione/potabilizzazione/distribuzione and is the real buyer-side
  candidate; a same-group entity like "Dolomiti Reti S.p.A." that holds the
  network assets is not a second candidate for the same territory.
- If the signals genuinely leave it unclear which entity is operating vs.
  holding, keep a single candidate (the one with clearer customer-facing/
  operational evidence) and flag the ambiguity in `uncertainty` — do not
  emit both "to be safe." Two entities under one group is a duplicate risk,
  not two leads, unless there is direct evidence they serve genuinely
  different territories or customer bases.

## Entity-continuity requirement
- Italian water-utility structure changes constantly: municipal systems get
  consolidated into a regional monopoly, one gestore merges into another,
  a concession expires and is contested in court. A candidate can look like
  a strong lead on every scoring dimension and still have no confirmed right
  to sign a multi-year contract. Treat this as a first-class check, not an
  afterthought.
- For every candidate, record an `entityContinuity` object alongside
  `relevanceEvidence`:
  - `status` — one short phrase: e.g. `"stable"`, `"contested subentro in
    progress"`, `"concession expiring <date>"`, `"recently merged into
    <entity>"`.
  - `concessionExpiry` — an ISO date if a concession/affidamento end date is
    known, else `null`.
  - `pendingTransfer` — a short description of any known merger, acquisition,
    subentro, or transfer in progress, else `null`.
  - `litigation` — a short description of any known dispute over the right
    to operate, else `null`.
- Where any of these is genuinely unknown from the available signals, say so
  explicitly (`"unknown"` / `null`) — do not guess a stable status just
  because no contrary signal was found. Absence of evidence is not evidence
  of stability.
- This is about the candidate's **right to operate**, not its financial
  health — do not conflate this with `momentumSignal` or `nrwEvidence`. A
  candidate mid-transfer or mid-litigation should still be scored normally on
  the five ICP dimensions; `entityContinuity` is a separate signal a human
  reviewer uses to judge whether the score is actionable right now.

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
- An `organisationType` that does not fit `targetCustomerType` (e.g. a
  regulator or vendor when the target is utilities) is a scope violation —
  leave it out; do not include it "for completeness."

# Human review requirements
- Feeds **Review Gate 1** (after Stage 03): the reviewer checks this candidate
  list against the validated/rejected evidence.
