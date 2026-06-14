# Human Evaluation Rubric
## Market Opportunity Intelligence — B2B Water Sector

This rubric is for human reviewers scoring the output of the Market Intelligence Agent.
It is written for a marketing professional or student, not a developer.

**When to use this:** After running `npm run eval:mock` or `npm run eval:live`, read the
`summary.md` for each eval run, then use this rubric to score the dimensions that require
human judgment. Enter your scores with `npm run eval:review -- --run <eval-run-id>`.

---

## Scoring scale

Score every dimension on a **1 to 5 scale** using these anchors:
- **1** = fails clearly (the output gets this dimension wrong)
- **3** = acceptable but with obvious gaps (roughly does the job)
- **5** = excellent (you would use this output directly in a real work setting)

Scores of 2 and 4 are available for cases that fall between the anchors.

---

## Dimensions

### 1. Relevance
*Are the signals, candidates, and analysis about the right market and customer type?*

| Score | What it looks like |
|-------|--------------------|
| 1 | The output discusses the wrong geography, wrong sector, or wrong organisation type. Little overlap with the research question. |
| 3 | The output is broadly relevant but misses key elements — for example, treating a multi-country region as one undifferentiated market, or focusing on vendors when the task was about utilities. |
| 5 | Every signal and candidate is directly relevant to the stated market, customer type, and business objective. Nothing off-topic. |

---

### 2. Factual credibility
*Do the claims appear accurate and not invented?*

*Note: You are not expected to verify every claim. Use your judgment on named organisations — does the output name real, findable companies? Do the regulation references sound plausible?*

| Score | What it looks like |
|-------|--------------------|
| 1 | Named organisations cannot be found with a quick search, or claims contradict well-known facts (e.g. a regulation that clearly does not exist). |
| 3 | Most claims seem reasonable, but one or two raise suspicion — an organisation name that sounds generic, a claimed funding amount with no verifiable source. |
| 5 | All named organisations are real and findable. Regulation and funding references are traceable. Nothing appears fabricated. |

---

### 3. Source quality
*Are the cited sources the right kind for this research question?*

**Tier A sources** (best): official regulators, EU portals, national infrastructure agencies, development bank reports, municipal procurement portals.
**Tier B sources** (acceptable): established trade press, respected industry publications, university research.
**Tier C sources** (weak): vendor marketing pages, undated articles, generic aggregators.

| Score | What it looks like |
|-------|--------------------|
| 1 | Sources are mostly vendor blogs, undated pages, or cannot be verified. No Tier A sources. |
| 3 | Mix of Tier A/B and some Tier C. The most important claims (regulation, funding) do have decent sources, but weaker ones slip in elsewhere. |
| 5 | Sources are predominantly Tier A/B. Regulatory and funding claims use official portals. Vendor-sourced claims are clearly labelled as interpretation, not fact. |

---

### 4. Candidate usefulness
*Would you actually want to research these organisations further?*

| Score | What it looks like |
|-------|--------------------|
| 1 | Organisations are too broad (e.g. "large European utilities"), not real, or clearly out of scope (e.g. bottled-water brands when the task is about network operators). |
| 3 | Some organisations are genuinely useful prospects; others are included because they loosely match keywords rather than fitting the actual brief. |
| 5 | Every listed organisation is real, specific, geographically correct, and would be a plausible prospect to research further. You could take the list to a manager and justify each entry. |

---

### 5. Ranking logic
*Does the output explain clearly why one opportunity ranked higher than another?*

*(Baseline: look at the order recommendations appear in. Staged: look at the opportunity score dimensions.)*

| Score | What it looks like |
|-------|--------------------|
| 1 | Scores or rankings are given with no explanation, or high-ranking organisations are clearly less relevant than lower-ranked ones. |
| 3 | Rankings broadly make sense. The top organisation is a reasonable pick. But the justification is thin — one sentence or a generic summary. |
| 5 | Every ranking decision is backed by specific evidence you can trace to a source. You can see exactly why one organisation scored higher than another. |

---

### 6. Clarity
*Could you use this output in a real work conversation with minimal editing?*

| Score | What it looks like |
|-------|--------------------|
| 1 | The output is dense, poorly structured, or requires significant rewriting before it could be shared with a colleague. |
| 3 | The output is usable but needs moderate editing — some sections are too long, some claims need rewording, or the structure is inconsistent. |
| 5 | The output is concise, well-structured, and could be dropped into a slide or brief with minor changes. The key findings are easy to find at a glance. |

---

### 7. Actionability
*Is the recommended next step something you could actually do?*

| Score | What it looks like |
|-------|--------------------|
| 1 | The recommendation is vague ("do more research") or circular ("investigate this market further"). No specific action, person, or outcome. |
| 3 | The recommendation is directional — you know the general area to pursue — but not specific enough to put on a task list today. |
| 5 | The recommended next step is concrete: you know exactly what to do (e.g. "find the procurement calendar for [named operator]"), who should do it, and what success looks like. No outreach or contact instructions. |

---

### 8. Uncertainty handling
*Does the output honestly tell you what it does not know?*

| Score | What it looks like |
|-------|--------------------|
| 1 | Uncertain claims are presented as facts. Obvious gaps (unknown decision-maker, unclear funding deadline) are ignored. Confidence reads as higher than it should be. |
| 3 | Some gaps are flagged, but inconsistently. You have to read carefully to separate the solid claims from the inferences. |
| 5 | Unknowns are explicitly surfaced (e.g. "decision-maker not identified," "grant deadline unconfirmed"). Confidence levels are indicated. The reviewer knows exactly what to verify before acting on the output. |

---

## What a good overall score looks like

A **score of 3 or above** on all dimensions means the output is usable in a real work context.
A **score of 4 or above** on all dimensions means the output is genuinely useful and production-ready.
A **score of 1** on any dimension is a blocker — the output should not be used until that issue is fixed.

---

## Notes for reviewers

- **Mock runs:** Do not score mock runs on factual credibility, source quality, or candidate usefulness — the content is synthetic and will fail all three by design. Score structural dimensions only (clarity, actionability, uncertainty handling) against the mock output's handling of its own synthetic content.
- **Live runs:** Score all eight dimensions. Check two or three source URLs yourself as a spot-check before scoring source quality.
- **Baseline vs staged:** Score each output independently first. Then compare. The goal is not to "pick a winner" — it is to identify which dimensions have measurable differences and which need more live runs to confirm.
