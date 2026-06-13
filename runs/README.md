# runs/ — local run artifacts (git-ignored)

Each workflow run writes one folder here: `runs/<run-id>/`. **The contents are
git-ignored** (only this README is committed) because run output is large,
variable, and run-specific — exactly the "working artifacts" ICM keeps separate
from the stable reference material in `workflows/.../references/`.

Generate one with:

```bash
npm run workflow:demo
```

Typical run folder:

```
runs/<run-id>/
  request.json            # validated inputs (run-request schema)
  00-sources.json         # cited sources (source-record schema)
  01-market-signals.json  # Stage 01 output
  02-candidates.json      # Stage 02 output      ┐ Review Gate 1
  03-validation.json      # Stage 03 output      ┘ (validated + rejected)
  04-scores.json          # Stage 04 output
  05-briefs.json          # Stage 05 output (machine)
  05-brief.md             # Stage 05 output (human) — Review Gate 2
  metadata.json           # run-level state + review-gate status
```

This storage is intentionally a thin filesystem wrapper (`lib/workflow/runStore.mjs`)
so it can be swapped for a database later without changing any stage code. No
secrets are ever written here — only validated, non-sensitive artifacts.
