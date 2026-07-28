# Evidence Standards (Stage 03 reference)

Stable rules for deciding whether a piece of evidence is kept or rejected. These
do not change per run.

## Source-quality tiers

| Tier | Examples | Use |
|------|----------|-----|
| A — authoritative | regulators, government/EU portals, official tender platforms, company's own filings | Strong. Can support a high-confidence claim alone. |
| B — credible secondary | established trade press, industry analysts, named consultancies | Good. Prefer two B sources, or one A + one B, for a key claim. |
| C — weak / promotional | vendor blogs, press releases, unattributed aggregators, undated pages | Supporting only. Never the sole basis for a kept claim. |

## Recency thresholds

Recency is judged against the claim type, not a single global cutoff:

- Regulations, funding programmes, tenders: **publication date required**; reject
  if older than 24 months unless the programme is explicitly still active.
- Market problems, digitalisation/technology-adoption signals: prefer ≤ 24 months;
  flag 24–48 months as `recencyOk: false` but may keep with a note.
- Structural facts (an organisation exists, what it operates): age-insensitive.

A claim with **no determinable date** where a date is expected → reject as
`outdated` (we cannot prove recency) unless corroborated by a Tier-A source.

## Scope before conflict

Two numbers about "the same" thing can both be true if they describe different
scopes — a regional average and a national average, a single organisation's
figure and an industry-wide figure, a metro-area figure and a country-wide one.
Before recording two figures as **conflicting** (and lowering confidence for it):

1. Check whether each number's scope is explicitly stated (region, country,
   organisation, time period).
2. If the scopes differ, they are not in conflict — record them as separate,
   scoped facts (e.g. "Lombardia regional average: 23.4%" and "Italy national
   average: 42%"), not as one uncertain, disputed figure.
3. Only call it a genuine conflict when the scopes match and the numbers still
   disagree.

A false "conflict" needlessly caps confidence and buries two individually
useful, individually true facts inside one unnecessary hedge.

## Same-fact consistency across restatements

The same underlying fact can appear more than once — as an individual Stage 01
signal, as part of a bundled multi-fact claim in a candidate's
`relevanceEvidence`, or reworded across both. Judge the underlying fact and its
actual source support **once**, and apply that same outcome everywhere the fact
reappears — regardless of phrasing or how many other facts it is bundled with.

- If an individual restatement of a fact would be rejected on its own merits
  (`weak-evidence`, `outdated`, `unsupported-assumption`, etc. — same sources,
  same underlying claim), a bundled claim that restates that same fact using
  the same sources **inherits the rejection** for that fact. Bundling several
  facts into one combined claim must never dilute or bypass a rejection that
  would apply to any of its individual parts.
- A bundled claim may still be validated for the parts that ARE independently
  well-supported. When in doubt, split it: keep the supported portion, reject
  the unsupported portion — do not validate or reject the whole bundle
  uniformly just because it is one item.
- This is not about penalizing paraphrasing. It is about not letting the same
  weak evidence "pass" simply because it was phrased differently or grouped
  with stronger facts the second time it appears.

## Entity-continuity recency rule

Litigation, concession, merger, and transfer claims fail in a specific way:
search ranks the loudest, most-covered moment — a dramatic court ruling, a
"colpo di scena" headline — not the quiet moment that actually settles the
outcome, like a council deciding not to appeal further, or a deal signed
without fanfare. A ruling is a data point in an ongoing story, not
necessarily its ending.

- For any claim about a candidate's right to operate (litigation, concession
  status, merger, subentro, acquisition), explicitly search for what happened
  *after* the most dramatic event found — do not stop at the first or most
  findable court ruling or news event.
- Record the date through which the status was actually checked, not just
  the publication date of the evidence cited. A claim describing a legal
  dispute as "unresolved" is itself a claim with a shelf life — treat it the
  same as any other claim that can go stale.
- This is distinct from the recency thresholds above, which govern how old a
  *source* may be before requiring re-corroboration. This rule is about
  whether the *story* has moved on since that source was published — a claim
  can cite a perfectly fresh source and still be wrong, if a quieter,
  more-decisive development happened after it and wasn't searched for.

## Rejection reasons (the only allowed values)

Use exactly one of these for `rejectionReason`:

- `duplicate` — same claim already kept from another source.
- `weak-evidence` — only Tier-C support for a claim that needs more.
- `outdated` — past the recency threshold for its claim type, or undated where a
  date is required.
- `unsupported-assumption` — a claim with no source at all.
- `off-topic` — not relevant to the target market/customer type.
- `unverifiable-source` — the URL/source could not be confirmed to contain the claim.

## Keep rules

An evidence item is `validated` only if **all** hold:
1. It maps to at least one source in `00-sources.json` (`supportingSourceIds` ≥ 1).
2. It passes the recency threshold for its claim type (or is explicitly flagged
   and corroborated).
3. It is not a duplicate of an already-kept item.
4. It is on-topic for the run's `targetMarket` and `targetCustomerType`.

Every rejection must record a reason. **Silent dropping is not allowed** — a
reviewer at Gate 1 must be able to see what was discarded and why.
