# Opportunity Scoring Rubric (Stage 04 reference)

Stable rules for ranking candidate organisations against HULO.ai's actual ICP:
Italian drinking-water utilities and multi-utility companies working on
leakage/NRW reduction and network modernization. The model must score **every**
dimension on the 0–5 scale below **and write a one-line justification for each
score that points at validated evidence**. A score without a justification is
invalid (Stage 04 verification rejects it). This is what stops arbitrary numbers.

## The five dimensions

| Dimension | Question it answers |
|-----------|---------------------|
| `utilitySize` | How large is this utility/company — population served or network scale? Is it a meaningful account, not a tiny local operator? |
| `nrwEvidence` | Is there evidence of NRW (non-revenue water) or leak-reduction as an active, *named* initiative — not just a passing mention of "efficiency"? |
| `regionFit` | Does this organisation operate in the target region — Italy (all regions unless a specific list is later prioritized)? |
| `targetRolePresence` | Is there a named or clearly implied role in innovation, operations, asset management, or digital transformation? |
| `momentumSignal` | **Bonus.** Is there a recent public tender, budget announcement, or news mention tied to network modernization? |

## The 0–5 scale (same meaning for every dimension)

| Score | Meaning |
|-------|---------|
| 0 | No evidence, or evidence points the wrong way. |
| 1 | Very weak — a single weak (Tier-C) signal. |
| 2 | Weak — some signal but mostly inference. |
| 3 | Moderate — credible evidence, some gaps. |
| 4 | Strong — multiple validated signals align. |
| 5 | Very strong — authoritative, recent, directly on point. |

## What "strong evidence" looks like per dimension

- **`utilitySize`** — 5: a confirmed population-served or network-length figure
  from an authoritative source (utility site, regulator filing, trade press).
  0–1: size is unknown or only guessable from the organisation's name/type.
- **`nrwEvidence`** — 5: the utility publicly reports an NRW % or names an active
  leak-reduction programme. 0–1: no NRW/leak-reduction evidence found at all.
- **`regionFit`** — 5: confirmed Italian operator with a clear service area.
  0: outside Italy, or region cannot be confirmed.
- **`targetRolePresence`** — 5: a named person or team in one of the four target
  functions is identifiable. 2–3: the function likely exists (e.g. utility is
  large enough to plausibly have one) but no name/team is confirmed. 0–1: no
  basis to believe the function exists at this organisation.
- **`momentumSignal`** — 5: a recent (≤12 months), specific tender/budget/news
  item tied to network modernization. This is a **bonus** dimension: a low score
  here (0–1) is the normal, expected case and should not by itself sink an
  otherwise strong candidate — it only adds confidence and timing signal when
  present.

## Total score

`totalScore` = sum of the five dimension scores (0–25). It is a **preliminary**
ranking aid, not a verdict. Ties and close scores are expected; the brief
(Stage 05) and the human reviewer decide what to actually pursue.

## Hard rules

- Score only against **validated** evidence (Stage 03 output). Rejected evidence
  must not influence a score.
- Every dimension needs a `justification` referencing evidence (by `evidenceId`)
  or explicitly stating "inference — no validated evidence", which caps that
  dimension at 2.
- Do not invent precision. If you cannot tell, score low and say why; do not
  guess a 4.
- A low `momentumSignal` score is not a red flag on its own — do not let it drag
  down the overall read of an otherwise well-evidenced candidate.
- **Distress ≠ momentum.** A candidate's debt, losses, or financial strain caused
  by unresolved water issues is *context*, not a positive `nrwEvidence` or
  `momentumSignal` signal — score those dimensions on whether there's an active,
  named response (investment, programme, regulatory mandate), not on the
  severity of the underlying problem.
