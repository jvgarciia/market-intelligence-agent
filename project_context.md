# Project Context — Market Intelligence Agent

This file is the memory and rulebook for Claude Code. Read it at the start of every session.

---

## What This Project Is

**Market Intelligence Agent** — an AI-powered system that researches companies, markets, and competitors on demand and returns structured, actionable intelligence reports.

This is not a generic chat app. It is a purposeful AI system with a defined job: take a research query, gather and synthesize information using AI tools and structured reasoning, and produce output that is actually useful to a marketer or strategist.

**Why this project exists:**
The builder is preparing for a technical + creative marketing internship at Hulo. This project is the learning vehicle — each feature teaches a real AI engineering concept that will be valuable on the job and in every future project.

---

## Who This Is For

**Builder:** A marketing student learning to build with AI systems — not a software engineer. Code must be readable, educational, and explained clearly.

**End user of the product:** Someone who needs fast, structured market research — competitive landscape, brand positioning, trend signals — without spending hours doing it manually.

---

## Learning Roadmap

Each phase of this project is designed to teach a specific AI engineering concept:

| Phase | Concept | What gets built |
|-------|---------|-----------------|
| 1 | Claude Code workflow + Git habits | Project setup, version control, documentation |
| 2 | Claude API + API routes | Basic AI query → structured response |
| 3 | Tool calling | Agent that can use search, scrape, or other tools |
| 4 | Structured outputs | Reports with consistent, parseable JSON schemas |
| 5 | Context engineering | System prompts that produce reliable, high-quality intelligence |
| 6 | Agentic workflows | Multi-step research pipelines with intermediate reasoning |
| 7 | RAG + vector databases | Persistent knowledge base the agent can query |
| 8 | Memory systems | Agent that remembers past research sessions |
| 9 | Evaluation systems | Automated quality scoring for agent outputs |
| 10 | Human-out-of-the-loop | Scheduled, automated intelligence delivery |

**Current phase:** Phase 3 — Tool calling. V2.1 complete: Claude runs a real agentic tool-use loop, deciding what to search (max 4 searches) before writing the report. V2.2 complete: safety hardening on APP_MODE defaults. Next: Phase 4 (structured outputs) or V2.3 (source display, citation verification).

---

## Product Vision

A marketing professional opens the app, types a research question — "Who are Hulo's top three competitors and what is their brand positioning?" — and within seconds receives a structured intelligence report with source reasoning, key findings, and strategic takeaways.

The agent does not just chat. It reasons, gathers, and synthesizes. The output is designed to be dropped into a deck or brief with minimal editing.

---

## V1 Scope

V1 is the smallest thing that demonstrates the core loop:

1. User enters a research query
2. The AI processes it with a structured intelligence prompt
3. The response is returned as a formatted report (not a chat bubble)
4. The report includes: Summary, Key Findings, Strategic Implications

**V1 does NOT include:**
- Real-time web search or scraping (Phase 3+)
- Persistent memory or saved reports (Phase 7+)
- User accounts or authentication
- Database or file storage
- Automated scheduling
- Multi-step agentic pipelines
- Vector search or RAG
- Evaluation scoring

V1 proves the interaction model and report format before adding complexity.

---

## Architecture Principles

1. **All AI calls go through `lib/ai.js`** — no exceptions. Provider-switching must always be a one-line change.
2. **One file, one responsibility** — if a file needs "and" to describe what it does, split it.
3. **No premature abstraction** — build for what is needed now, not hypothetical future features.
4. **Server/client boundary is strict** — secrets and AI calls stay server-side; UI stays client-side.
5. **Structured over conversational** — outputs should be formatted reports, not chat text.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Vercel-native, frontend + backend in one project |
| Styling | Tailwind CSS | Fast, consistent, no separate CSS files |
| AI Layer | `lib/ai.js` wrapper | One place for all AI logic |
| Default AI | Anthropic Claude (`claude-sonnet-4-6`) | Best reasoning and structured output quality |
| Deployment | Vercel | Zero-config, integrates with GitHub |
| Language | JavaScript (no TypeScript) | Simpler for a learner; type safety can be added later |

---

## Rules Claude Code Must Follow

### Before writing any code
- Read this file first
- Check recent git history if context is unclear: `git log --oneline -10`
- Inspect the relevant files before proposing changes
- State the current architecture and how the change fits into it
- Propose an implementation plan with the exact files to change
- Wait for approval before making large or architectural changes

### Code quality
- Keep code simple. No over-engineering. One file does one thing.
- No TypeScript unless explicitly requested.
- No features, abstractions, or dependencies beyond what was asked for.
- No comments that explain *what* — only comments that explain *why* when it is non-obvious.

### Security
- Never hard-code API keys. Always use environment variables.
- Validate inputs at every API route before passing them further.
- Never expose internal error details to the frontend.

### Style
- Tailwind CSS for all styling. No inline `style={}` props.
- `PascalCase` for components, `camelCase` for lib files and API routes.
- `@/` path aliases for all imports.

### AI provider
- All AI calls go through `lib/ai.js`. Never import AI SDKs in components or pages.
- Default provider is Anthropic Claude.

---

## How to Explain Changes

Every time a file is created or modified, Claude Code must explain:

1. **What changed** — which file(s) and exactly what was done
2. **Why it matters** — the architectural or product reason for the decision
3. **What to learn from it** — one transferable concept written for a non-developer

Keep explanations short, plain, and jargon-free (or define the jargon in the same sentence).

---

## Browser Testing Workflow

Use Chrome browser testing after any change that affects what the user sees or interacts with.

**Trigger browser testing when:**
- A component, layout, or style was changed
- A form, button, or interactive element was added or modified
- An API route response changed and the UI depends on it
- The app was deployed and the live URL needs verification

**Skip browser testing for:**
- Pure logic or utility changes with no visual output
- Documentation edits
- Environment variable changes

**Standard sequence:**
1. Confirm dev server is running (`npm run dev`)
2. Load the page — verify no blank screen or console errors
3. Test the changed interaction end-to-end
4. Check browser console — zero red errors is the bar
5. Verify edge cases: empty input, loading state, error state

**Scope rule:** Browser testing is for validation only — not autonomous redesign. Report discovered issues before fixing anything outside the original task scope.

---

## Deployment Process

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables manually in Vercel (never uploaded from `.env.local`)
4. Vercel auto-deploys on every push to main branch

**Required variables in Vercel:**
- `AI_PROVIDER`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_NAME`

---

## What Each Key File Does

| File | Purpose |
|------|---------|
| `app/layout.js` | HTML shell — fonts, metadata, global styles |
| `app/page.js` | Homepage — composes the main UI |
| `app/api/chat/route.js` | AI backend endpoint — validates `{ company, industry, focus }`, calls AI, returns report |
| `app/api/mode/route.js` | Safe mode endpoint — returns `{ mode }` (current APP_MODE value) without exposing the env var to the browser |
| `lib/ai.js` | AI wrapper (Anthropic-only) — `chat()` for single calls, `chatWithTools()` for the generic agentic loop; only place where AI SDKs are imported; exports `MODELS` (full = Sonnet, cheap = Haiku) |
| `lib/appMode.js` | Cost-control mode switch — resolves `APP_MODE` env var (`mock` / `cheap` / `full`) and per-mode settings (model, max tokens, max searches); defaults to mock in dev, full in production |
| `lib/mockReport.js` | Static sample report for mock mode — same structure as real output so the UI renders it identically; zero API cost |
| `lib/focusOptions.js` | Shared research-focus constants — imported by both form and API so they never drift |
| `lib/tools/webSearch.js` | Tavily web search — tool schema Claude sees + the fetch that executes it; one file per tool |
| `lib/prompts/marketIntelligencePrompt.js` | The analyst system prompt — report structure, data-honesty rules, depth weighting |
| `components/ResearchForm.js` | Research form — owns query/report/loading/error state |
| `components/ReportView.js` | Parses the markdown report into styled sections; copy-to-clipboard |
| `components/ChatBox.js` | Legacy chat UI — kept as reference, no longer rendered |
| `.env.local` | Real secrets — never committed |
| `project_context.md` | This file — Claude Code reads it every session |

---

## Project History

- **2026-05-09** — Created as a generic AI starter template
- **2026-06-04** — Renamed and repurposed as Market Intelligence Agent; documentation updated to define product vision, learning roadmap, V1 scope, and architecture principles
- **2026-06-04** — V1 implemented: research form (company, industry, focus) → structured seven-section report via `lib/prompts/marketIntelligencePrompt.js`; AI wrapper made Anthropic-only
- **2026-06-11** — V1.1 polish: report rendered as styled sections via `components/ReportView.js` (hand-rolled parser, zero new packages); system prompt upgraded with data-honesty rules, focus-weighted depth, and a closing confidence note; shared `lib/focusOptions.js` validates focus on both client and server; clearer loading/error states
- **2026-06-11** — V2.0 live search plumbing: `lib/tools/webSearch.js` calls Tavily via plain fetch; route runs 3 fixed parallel searches (overview, competitors, recent positioning) and injects numbered, trimmed sources into the prompt; reports cite sources inline and end with a Sources Used section; graceful fallback to model-knowledge-only when `TAVILY_API_KEY` is missing or searches fail; UI shows grounding status. No tool-use loop yet — that is V2.1
- **2026-06-11** — V2.1 agentic tool calling: `chatWithTools()` added to `lib/ai.js` — a generic tool-use loop (model requests tool → route executes → result returned → repeat until plain-text answer, hard-capped at 4 tool calls + runaway round limit). Claude now composes its own search queries instead of the fixed three; failed searches return `is_error` tool results and the model continues gracefully. Route tracks sources via closure and returns `{ reply, sourceCount, toolCallCount, sources }`; UI badge shows search count. System prompt caching enabled across loop rounds
- **2026-06-12** — Billing errors surfaced clearly: the API route maps Anthropic "credit balance too low" failures to an actionable error message instead of the generic fallback
- **2026-06-12** — Cost-control modes: one `APP_MODE` env var with three values — `mock` (static sample report from `lib/mockReport.js`, zero API calls, default in local dev), `cheap` (Haiku model, 1 search, 1.5K max tokens, brief report), `full` (unchanged complete agentic workflow, default in production). Mode resolution lives in `lib/appMode.js`; the route branches once at the top; `chat()`/`chatWithTools()` accept `model`/`maxTokens` options. UI shows an amber badge on mock/cheap reports; server logs the active mode per request. Documented in README and `.env.example`
- **2026-06-13** — Safety hardening on APP_MODE: production default changed from `full` → `cheap` with a `console.warn`; full mode now requires `APP_MODE=full` set explicitly everywhere. Added `GET /api/mode` route (`app/api/mode/route.js`) so the UI can safely display the active mode without exposing `APP_MODE` as a `NEXT_PUBLIC_` variable. `ResearchForm.js` now fetches active mode on mount and shows a pre-generation indicator; post-report badges corrected (cheap badge says "reduced-cost real AI report", full mode gets its own green badge).
