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
