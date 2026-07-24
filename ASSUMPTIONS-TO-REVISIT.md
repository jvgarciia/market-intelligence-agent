# Assumptions to Revisit

This file tracks decisions made **for the HULO.ai internship assignment**
rather than from genuine production/business judgment — things that were
reasonable defaults given the information available at the time (the
application form, a general understanding of HULO's product, no direct
sales/product input), but that should be re-examined once real HULO input
exists.

**Rule going forward:** whenever an assignment-specific choice gets made
instead of a general one, it gets flagged in the moment and logged here —
not left implicit in code or prompts.

---

## 1. The five scoring dimensions

**Where:** `workflows/market-opportunity/references/scoring-rubric.md`,
scored live in `lib/workflow/stage04.mjs`.

**What was decided:** `utilitySize`, `nrwEvidence`, `regionFit`,
`targetRolePresence`, `momentumSignal` (bonus) — chosen from a general read of
what a leak-detection/NRW vendor would care about, not from an ICP HULO
actually validated.

**Revisit once real HULO input exists:** Confirm these are the dimensions
HULO's own sales/product team actually weights, in this order of importance.
`nrwEvidence` in particular assumes NRW is the primary buying trigger — see
item 7 below, this may be too narrow.

---

## 2. `CONTACT_TARGET=30`

**Where:** `lib/buildContactsMaster.mjs` (`DEFAULT_CONTACT_TARGET = 30`),
overridable via `CONTACT_TARGET=<n> npm run contacts:build`.

**What was decided:** 30 contacts is the number stated in the internship
assignment brief ("30+ contacts, 5+ qualified leads"), not a HULO-derived
pipeline-capacity or quota number.

**Revisit once real HULO input exists:** Replace with whatever contact volume
HULO's actual sales capacity can work through in a given period — could be
higher or lower than 30 depending on team size and outreach cadence.

---

## 3. `--brief-all` as the coverage mode

**Where:** `lib/workflow/stage05.mjs` / `lib/workflow/runStage05Local.mjs`
(`npm run workflow:stage05 -- --run <id> --brief-all`).

**What was decided:** Briefing every candidate that survives Stage 03
(instead of the model's curated top-pick subset) was chosen to maximize
contact yield toward the 30-contact assignment target — a volume-first
choice, not a quality-first one.

**Revisit once real HULO input exists:** A real sales team probably wants the
curated top-pick default (fewer, higher-confidence briefs) most of the time,
with `--brief-all` reserved for deliberate wide-net sweeps — not the mode
used by default to hit an arbitrary contact count.

---

## 4. Region-specific cases (Sicilia, Calabria, Trentino, etc.)

**Where:** `evals/cases/` — new per-region case files, planned as the
next step for growing `contacts-master.md`.

**What was decided:** Splitting national coverage into region-specific cases
is being done to fill gaps in `contacts-master.md` toward the 30-contact
target, prioritizing regions the national run only lightly touched — a
coverage-completeness choice driven by the assignment's contact quota, not by
HULO's actual regional go-to-market priorities.

**Revisit once real HULO input exists:** Which regions matter should come
from HULO's actual sales territory/priority list (existing customers,
regulatory tailwinds, sales team coverage), not "which region has the fewest
candidates so far."

---

## 5. Italy as the fixed country scope

**Where:** `evals/cases/06-water-utilities-italy.json`,
`evals/cases/07-water-utilities-italy-national.json`, `regionFit` scoring
dimension (scores 0 for "outside Italy").

**What was decided:** Italy-only scope came from the internship assignment,
not from HULO's actual target-market prioritization across countries.

**Revisit once real HULO input exists:** Confirm Italy is actually HULO's
top-priority market before investing further in Italy-specific case files,
source lists, or region breakdowns — the pipeline itself is not Italy-specific
(`targetMarket` is a run parameter), only the cases run so far are.

---

## 6. The four target role categories

**Where:** `targetRolePresence` scoring dimension (item 1 above);
`targetRoleCategory` field on Stage 05 contacts
(`workflows/market-opportunity/05_opportunity-brief/CONTEXT.md`).

**What was decided:** innovation / operations / asset-management /
digital-transformation — these came directly from the internship
application form's stated target roles, not from independent buyer
research into who actually champions or approves an NRW/leak-detection
purchase at a water utility.

**Revisit once real HULO input exists:** Validate against real HULO sales
input — actual won-deal buyer titles, or a BDR/AE's read on who initiates
these conversations. The current four categories may be missing a role
(e.g. procurement, sustainability/ESG) or overweighting one that rarely
holds budget authority.

---

## 7. Pipeline tuned specifically to NRW/leak-reduction signals

**Where:** Stage 01 signal hunting (`workflows/market-opportunity/01_market-signals/CONTEXT.md`),
`nrwEvidence` scoring dimension, evidence standards.

**What was decided:** Every stage — signal-hunting, scoring, evidence
standards — is tuned to find and validate non-revenue-water/leak-reduction
signals specifically, because that's the product described in the
internship brief.

**Revisit once real HULO input exists:** If HULO's actual offering is
broader than leak detection — general network optimization consultancy,
for instance — this scope may be systematically missing candidates who fit
HULO's real ICP but don't happen to have a public NRW-specific signal.
Consider broadening signal-hunting criteria once the real product scope is
confirmed.

---

## 8. `contacts-master.md` has no outreach-status tracking

**Where:** `contacts-master.md`, `lib/buildContactsMaster.mjs`.

**What was decided:** The table tracks `status` (a human-settable field that
survives regeneration — see `project_context.md` V3.7) but nothing for
outreach state — no contacted/replied/converted tracking. Reasonable for a
research-phase deliverable where no outreach has happened yet, not a gap
noticed because it wasn't needed yet.

**Revisit once real outreach begins:** Add outreach-status fields
(contacted date, response, outcome) before this file is used to actually
run a campaign — otherwise there's no way to tell a fresh lead from one
already contacted.
