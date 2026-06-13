# Stage 04 — Opportunity Scoring

# Purpose
Rank candidate organisations using the explicit, explainable rubric in
`scoring-rubric.md`. Every score must be justified against validated evidence.
No arbitrary numbers.

# Inputs
- `02-candidates.json` (Stage 02).
- `03-validation.json` — **validated items only**. Rejected evidence must not
  influence any score.

# Reference context
- `../references/scoring-rubric.md` (the six dimensions, the 0–5 scale, hard rules).
- `./schemas/opportunity-score.schema.json`.

# Tools allowed
- None. Scoring is reasoning over validated evidence, not new research.
- `mock` mode: deterministic fixtures only.

# Process
1. For each candidate, score all six dimensions (`problemUrgency`, `solutionFit`,
   `commercialTiming`, `evidenceStrength`, `marketAccessibility`,
   `strategicRelevance`) on 0–5.
2. Write a one-line `justification` per dimension, referencing `evidenceId`s, or
   stating "inference — no validated evidence" (which caps that dimension at 2).
3. Compute `totalScore` = sum of the six (0–30).
4. Write a short overall `rationale`.

# Output schema
- `04-scores.json` — array of `opportunity-score`, one per candidate.

# Verification checks
- All six dimensions present; each `score` is an integer 0–5 with a non-empty
  `justification`.
- `totalScore` equals the sum of the six dimension scores (recomputed and checked).
- Every `candidateId` exists in `02-candidates.json`.

# Failure conditions
- A candidate with no validated evidence is still scored, but most dimensions
  will be ≤ 2 by rule, and the `rationale` must say the ranking is low-confidence.
- Do not skip a dimension to avoid a low score.

# Human review requirements
- None blocking, but scores are **preliminary**. They feed Stage 05 and Review
  Gate 2; the human, not the total, decides what to pursue.
