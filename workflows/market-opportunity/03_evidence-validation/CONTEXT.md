# Stage 03 — Evidence Validation

# Purpose
Separate trustworthy evidence from weak, duplicate, outdated, or unsupported
material — **before** anything is scored. This is a deterministic-leaning
gatekeeping stage: apply the rules in `evidence-standards.md`, do not re-research.

# Inputs
- `01-market-signals.json`, `00-sources.json` (Stage 01).
- `02-candidates.json` (Stage 02).

# Reference context
- `../references/evidence-standards.md` (the rules this stage enforces).
- `./schemas/validated-evidence-item.schema.json`.
- `./schemas/rejected-evidence-item.schema.json`.

# Tools allowed
- None required. This stage reasons over already-gathered evidence. Optional
  single confirmation search is allowed in cheap/full but discouraged.
- `mock` mode: deterministic fixtures only.

# Process
1. For each signal and each candidate's relevance evidence, apply the keep rules.
2. Keep → emit a `validated-evidence-item` (`validationStatus: "validated"`,
   `supportingSourceIds` ≥ 1, `recencyOk` set).
3. Reject → emit a `rejected-evidence-item` with exactly one `rejectionReason`
   from the allowed list and a short `notes`.
4. De-duplicate: identical claims collapse to one validated item; the rest are
   rejected as `duplicate`.

# Output schema
- `03-validation.json` — object `{ "validated": [validated-evidence-item],
  "rejected": [rejected-evidence-item] }`.

# Verification checks
- Every validated item has ≥ 1 `supportingSourceIds` present in `00-sources.json`.
- Every rejected item has a valid `rejectionReason`.
- No claim appears in both lists.
- **Nothing is dropped silently** — every input claim is either validated or
  appears in the rejected list.

# Failure conditions
- If everything is rejected, that is a valid (and important) result: scoring then
  has nothing to work with, and the run says so rather than inventing support.

# Human review requirements
- This stage completes **Review Gate 1**. A person should open `02-candidates.json`
  and `03-validation.json` together and confirm: discovered organisations make
  sense, rejections are reasonable, and the missing-information notes are honest.
  Gate status is recorded in `metadata.json → reviewGates.gate1`.
