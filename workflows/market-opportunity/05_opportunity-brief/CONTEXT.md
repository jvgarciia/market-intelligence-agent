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
- `web_search` (cheap/full/local-cli only), **restricted to contact-finding for
  the specific candidates selected in step 1 below** — not general research.
  This is the one exception to "no new research": everything else in this stage
  still only synthesises existing artifacts.
- Approved contact-search methods only: `site:linkedin.com` search-result
  snippets, the organisation's own team/leadership pages, Italian water-sector
  trade-association member listings, and press mentions naming a person and
  role. **No scraping. No login-based LinkedIn access. No visiting a LinkedIn
  profile page directly** — only what is visible in public search results.
- `mock` mode: deterministic fixtures only.

# Process
1. Select the top opportunities by `totalScore` (and reviewer judgement later).
2. For each, write a brief: `whyItMatters`, `supportingEvidenceIds`,
   `uncertainties`, `recommendedNextAction`, and `humanVerificationRequired`.
3. Fill `factVsInterpretation`: list `verifiedFacts` (backed by validated
   evidence) separately from `modelInterpretations` (reasoning, not fact).
4. `recommendedNextAction` is a **research or marketing** action only — never
   "send email", never contact anyone.
5. For each selected candidate, search for people matching one of the four
   target roles (innovation, operations, asset management, digital
   transformation) using only the approved methods above. Record each match in
   `contacts`: `name`, `role` (verbatim), `targetRoleCategory`, `sourceUrl`,
   `sourceType`. A contact with no source URL is not a contact — do not invent
   one. Finding zero contacts for a candidate is an honest, acceptable result;
   record it as an empty list, not a guess.

# Output schema
- `05-briefs.json` — array of `opportunity-brief` (machine-validated).
- `05-brief.md` — the same briefs rendered for human reading (Review Gate 2).

# Verification checks
- Every `supportingEvidenceIds` exists in `03-validation.json` (validated list).
- `verifiedFacts` are each backed by ≥ 1 validated evidence item; anything not
  backed belongs in `modelInterpretations`, not `verifiedFacts`.
- `humanVerificationRequired` is non-empty (there is always something to confirm).
- `recommendedNextAction` contains no outreach/contact instruction.
- Every `contacts[].sourceUrl` is a real URL returned by search — never invented.
- `contacts` is never used to trigger any outreach. It is information for a
  human to act on, not an automated action.

# Failure conditions
- If no candidate scored well enough to brief, say so explicitly and recommend a
  next research action instead of fabricating an opportunity.
- If contact search finds nothing for a candidate, that is not a stage failure —
  emit an empty `contacts` list and let the brief's `uncertainties` note the gap.

# Human review requirements
- This stage is **Review Gate 2**. Before any brief is treated as final — and long
  before any future outreach feature — a person confirms the fact/interpretation
  split and the items flagged for verification. Gate status:
  `metadata.json → reviewGates.gate2`.
- Every contact found must be treated as unverified until a human confirms the
  name, role, and source are current — people change jobs, and a public search
  result can be stale.
