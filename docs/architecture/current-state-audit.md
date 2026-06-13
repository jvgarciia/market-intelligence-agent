# Current-State Architecture Audit

**Date:** 2026-06-13
**Scope:** The Market Intelligence Agent as it exists on branch `main` at commit `f8b0072`.
**Method:** Read every source file listed below. No findings are inferred beyond the code; where a fact could not be verified it is marked as such.

> Note on the ICM paper: when this audit was first written the ICM paper was not
> in the repository, so it applied the ICM principles as enumerated in the task
> brief. The paper has since been added at
> `docs/research/Interpretable Context Methodology_ Folder Structure as Agent Architecture.pdf`
> and the staged design has been reviewed against it directly. See
> [icm-adoption-review.md](icm-adoption-review.md) for that review — including
> which principles were adopted, adapted, or postponed, and the paper's own
> stated limitations.

Files inspected: `CLAUDE.md`, `AGENTS.md`, `README.md`, `project_context.md`,
`package.json`, `app/page.js` (composition), `app/api/chat/route.js`,
`lib/ai.js`, `lib/appMode.js`, `lib/mockReport.js`, `lib/focusOptions.js`,
`lib/tools/webSearch.js`, `lib/prompts/marketIntelligencePrompt.js`,
`components/ResearchForm.js`, `components/ReportView.js`, `.env.example`,
`.gitignore`.

---

## 1. What the current product actually does

A single-page Next.js (App Router) web app. The user fills one form — **company
name** (required), **industry** (optional), **research focus** (one of seven
fixed options in `lib/focusOptions.js`) — and receives **one markdown report**
with a fixed seven/eight-section structure (Company Overview → Strategic
Recommendations, plus a Sources Used section when live search ran).

It is a **company-centric marketing brief generator**, not yet a market/account
discovery system. The output is one document rendered as styled sections by a
hand-written parser (`components/ReportView.js`), with a copy button.

Three cost modes exist (`lib/appMode.js`): `mock` (free static report), `cheap`
(Haiku, 1 search, short), `full` (Sonnet, up to 4 searches).

## 2. Complete flow, user input → final report

```
ResearchForm.js (client)
  → POST /api/chat  with { company, industry, focus }
    → route.js validates inputs (required, length ≤120, focus in allow-list)
    → getAppMode() resolves mock | cheap | full
       ├─ mock  → buildMockReport() returns static text + fake sources, 0 API calls
       └─ cheap/full:
            systemPrompt = MARKET_INTELLIGENCE_SYSTEM_PROMPT + mode suffix
            ├─ no Tavily key → chat() : one Claude call, no sources
            └─ Tavily key   → chatWithTools() : agentic loop
                                 model ↔ web_search tool, capped at maxSearches
    → returns { reply, sourceCount, toolCallCount, sources, mode }
  → ResearchForm stores reply; ReportView.js parses ## headers into sections
```

The active mode is also exposed read-only at `GET /api/mode` for the form's
pre-generation indicator (no env var is sent to the browser).

## 3. Where model calls happen

Exactly one place: **`lib/ai.js`** — `chat()` (single call) and `chatWithTools()`
(loop). `app/api/chat/route.js` is the only caller. No component or page imports
the Anthropic SDK. This boundary is intact and is the project's strongest
architectural asset.

## 4. Where search calls happen

Exactly one place: **`lib/tools/webSearch.js`** — `searchWeb()` calls Tavily via
`fetch`. The tool schema (`webSearchTool`) and executor live in the same file.
The route supplies `executeToolCall` to `chatWithTools`, so `lib/ai.js` stays
generic and search-agnostic.

## 5. How many model/search rounds may occur

Per request (cheap/full only):
- **Searches:** capped by `settings.maxSearches` — `cheap` = 1, `full` = 4
  (`lib/appMode.js`).
- **Model rounds:** `chatWithTools` loops `maxRounds = maxToolCalls + 2`, so at
  most **6 Claude calls** in full mode, **3** in cheap mode. A hard ceiling
  prevents runaway loops; an exhausted budget returns an `is_error` tool result
  telling the model to write the report now.
- **Mock:** 0 model calls, 0 searches.

## 6. Where context grows between rounds

In `chatWithTools` the `conversation` array grows every loop: each round appends
the assistant's tool-use turn and a user turn carrying tool results
(`route.js` trims each Tavily result to 1200 chars in `webSearch.js`). The system
prompt is sent with `cache_control: ephemeral` so repeated rounds don't re-bill
the full system-prompt tokens. Growth is bounded by the 6-round ceiling, but
long search results still accumulate within a single request.

## 7. Where intermediate state is currently hidden

This is the central limitation for the new direction. **Nothing between input and
final text is persisted or inspectable:**
- The model's search queries, the raw Tavily results, and the reasoning that
  selected sources exist only inside the in-memory `conversation` array and are
  discarded when the request ends.
- `sources` is reconstructed in the route by deduping URLs, but the link between
  a specific claim and the source that supports it is **not** captured — it lives
  only as inline `[n]` markers inside the free-text report.
- There are no run IDs, no saved artifacts, no per-stage outputs. A run cannot be
  replayed, diffed, or evaluated after the fact.

## 8. What is reusable (keep and build on)

- **`lib/ai.js`** — generic, provider-isolated, tool-agnostic. The staged
  workflow can call the same `chat()`/`chatWithTools()` per stage.
- **`lib/tools/webSearch.js`** — one-file-per-tool pattern; reuse as-is.
- **`lib/appMode.js`** — mock/cheap/full cost control. The new workflow must
  honour the same modes (mock = free, no silent paid fallback).
- **`lib/focusOptions.js`** — the "single source of truth shared by client and
  server" pattern is exactly how schemas should be shared.
- The **mock-mode discipline** (`lib/mockReport.js`) — proves a feature can be
  exercised end-to-end for free. The staged pipeline copies this idea.

## 9. What should NOT be changed yet

- The existing `POST /api/chat` flow, `ResearchForm`, `ReportView`, mock/cheap/
  full behaviour, citation rendering, and source links. They are the **baseline**
  that any staged or multi-agent version must be measured against. Changing them
  now would destroy the comparison.
- The single-AI-wrapper rule and the server/client boundary.
- JavaScript-only, no-database, no-auth decisions (see `CLAUDE.md` Strategic
  Reminders).

## 10. Biggest risks

| Risk area | Finding | Severity |
|-----------|---------|----------|
| **Cost** | Full mode can fire up to 6 Claude calls + 4 advanced Tavily searches per request. The recently fixed default (no silent `full` in prod) contains this, but there is no per-run cost ceiling or logging of tokens spent. | Medium |
| **Factual accuracy** | The report is free text. Claims, inferences, and verified facts are mixed in prose. `(inference)` tagging depends entirely on the model obeying the prompt — unenforced. | High |
| **Citations** | Claim→source provenance is not stored; only inline `[n]` markers in text. Impossible to audit which source backs which claim without re-reading the prose. | High |
| **Maintainability** | One large system prompt (`marketIntelligencePrompt.js`, ~60 lines) does input parsing, search strategy, data-honesty rules, structure, and style at once. Adding a stage means editing this monolith. | Medium |
| **Unclear business value** | Output is a generic company brief. For the HULO-style goal (find and rank candidate *organisations* in a market) the current product does not yet produce the needed artifact: a ranked candidate list with evidence. | High (for the new direction) |
| **Observability** | No run IDs, no saved intermediate artifacts, no way to inspect or replay a run. Debugging is "read the final text and guess." | High |
| **Deployment safety** | Good: secrets server-only, mock default in dev, cheap default in prod, generic client errors, billing error surfaced. No regression risk identified. | Low |

---

## Conclusion → why a staged baseline next

The system is well-built for what it is, but its **intermediate reasoning is
invisible and its output is one block of prose**. The new B2B Market Opportunity
direction needs the opposite: inspectable, validated, stage-by-stage artifacts
with preserved claim→source provenance and explicit human review points.

The professional move is **not** to rewrite the working app. It is to add a
**parallel, inspectable, schema-validated staged workflow** that starts in mock
mode (free), keep the current report flow as the measured baseline, and only
introduce live multi-stage execution and specialist agents once evaluations
(`evals/`) show they beat that baseline. The rest of this change set builds that
foundation.
