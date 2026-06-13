# Stage 05 — Opportunity Brief

# Purpose
Turn the strongest scored opportunities into concise, decision-ready briefs that a
marketer or strategist can act on — while clearly separating what is **verified**
from what is **interpreted**, and naming what a human must confirm.

# Inputs
- `04-scores.json` (Stage 04).
- `03-validation.json` (validated items, for supporting evidence).
- `02-candidates.json` (organisation details).

# Reference context
- `./schemas/opportunity-brief.schema.json`.

# Tools allowed
- None. This stage synthesises existing artifacts. No new research.
- `mock` mode: deterministic fixtures only.

# Process
1. Select the top opportunities by `totalScore` (and reviewer judgement later).
2. For each, write a brief: `whyItMatters`, `supportingEvidenceIds`,
   `uncertainties`, `recommendedNextAction`, and `humanVerificationRequired`.
3. Fill `factVsInterpretation`: list `verifiedFacts` (backed by validated
   evidence) separately from `modelInterpretations` (reasoning, not fact).
4. `recommendedNextAction` is a **research or marketing** action only — never
   "send email", never contact anyone.

# Output schema
- `05-briefs.json` — array of `opportunity-brief` (machine-validated).
- `05-brief.md` — the same briefs rendered for human reading (Review Gate 2).

# Verification checks
- Every `supportingEvidenceIds` exists in `03-validation.json` (validated list).
- `verifiedFacts` are each backed by ≥ 1 validated evidence item; anything not
  backed belongs in `modelInterpretations`, not `verifiedFacts`.
- `humanVerificationRequired` is non-empty (there is always something to confirm).
- `recommendedNextAction` contains no outreach/contact instruction.

# Failure conditions
- If no candidate scored well enough to brief, say so explicitly and recommend a
  next research action instead of fabricating an opportunity.

# Human review requirements
- This stage is **Review Gate 2**. Before any brief is treated as final — and long
  before any future outreach feature — a person confirms the fact/interpretation
  split and the items flagged for verification. Gate status:
  `metadata.json → reviewGates.gate2`.
