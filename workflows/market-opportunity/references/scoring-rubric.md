# Opportunity Scoring Rubric (Stage 04 reference)

Stable rules for ranking candidate organisations. The model must score **every**
dimension on the 0–5 scale below **and write a one-line justification for each
score that points at validated evidence**. A score without a justification is
invalid (Stage 04 verification rejects it). This is what stops arbitrary numbers.

## The six dimensions

| Dimension | Question it answers |
|-----------|---------------------|
| `problemUrgency` | How acute is the problem this organisation faces that the solution addresses? |
| `solutionFit` | How well does the described solution match this organisation's situation? |
| `commercialTiming` | Is there a reason to act now — budget cycle, tender, funding, regulation, leadership change? |
| `evidenceStrength` | How strong and recent is the validated evidence for this candidate? |
| `marketAccessibility` | How reachable is this organisation — public contacts, procurement openness, language/region fit? |
| `strategicRelevance` | How well does it fit the stated `businessObjective`? |

## The 0–5 scale (same meaning for every dimension)

| Score | Meaning |
|-------|---------|
| 0 | No evidence, or evidence points the wrong way. |
| 1 | Very weak — a single weak (Tier-C) signal. |
| 2 | Weak — some signal but mostly inference. |
| 3 | Moderate — credible evidence, some gaps. |
| 4 | Strong — multiple validated signals align. |
| 5 | Very strong — authoritative, recent, directly on point. |

## Total score

`totalScore` = sum of the six dimension scores (0–30). It is a **preliminary**
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
