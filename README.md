# Market Intelligence Agent

An AI-powered system that researches companies, markets, and competitors on demand and returns structured, actionable intelligence reports.

Built as a hands-on learning project for a technical + creative marketing internship at Hulo. Each feature teaches a real AI engineering concept — Claude API, tool calling, structured outputs, context engineering, agentic workflows, RAG, memory, evaluation, and automated pipelines.

---

## What It Does

You enter a company name, optionally an industry, and a research focus. The agent returns a structured seven-section intelligence report — rendered as readable sections with a copy button, not a chat bubble. The report goes deeper on your selected focus, marks unverifiable claims as inferences, and ends with a confidence note telling you what to verify first.

When a Tavily key is configured, Claude runs a real agentic loop: it decides what to search on the live web (up to 4 searches), observes the results, searches again if needed, then writes the report grounded in what it found — with inline citations and a Sources Used section.

**Example queries:**
- "Who are the top three competitors to Hulo and what is their brand positioning?"
- "What are the emerging trends in Gen Z fitness marketing for 2026?"
- "Summarize the competitive landscape for AI-powered marketing tools."

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and add your Anthropic API key. Optionally add a free [Tavily](https://tavily.com) key as `TAVILY_API_KEY` to ground reports in live web search results — without it, reports are generated from model knowledge only. Do **not** commit this file.

### 3. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Development Modes (cost control)

Every report request runs in one of three modes, set with `APP_MODE` in `.env.local`:

| Mode | What it does | API cost | When to use it |
|------|--------------|----------|----------------|
| `mock` | Returns a static sample report. **No AI call is made at all.** | Free | UI changes, layout, formatting, copy/export, testing the app flow |
| `cheap` | Real AI on the cheapest model (Haiku), 1 web search, short report | ~10–20× cheaper than full | Testing real AI behavior, prompt tweaks, search plumbing |
| `full` | The complete agentic workflow — Sonnet, up to 4 searches, full report | Most expensive | Final tests and portfolio-quality outputs only |

**Defaults when `APP_MODE` is not set:**
- Local dev → `mock` (no API calls, no accidental spend)
- Production → `cheap` (safe fallback — never silently runs the expensive full workflow)

**To use full mode in production you must set `APP_MODE=full` explicitly** in the Vercel dashboard under Settings → Environment Variables. A missing or typo'd value will never trigger the most expensive path.

```bash
# .env.local
APP_MODE=mock    # free UI development (default in dev)
APP_MODE=cheap   # low-cost real-AI testing
APP_MODE=full    # the real thing (requires explicit config everywhere)
```

Restart the dev server after changing `.env.local`. Mock and cheap reports show an amber badge; full reports show a green badge. A subtle mode indicator also appears on the form before you click Generate, so you always know what you're about to run.

---

## Project Structure

```
├── app/
│   ├── layout.js          # HTML shell — wraps every page
│   ├── page.js            # Homepage
│   ├── globals.css        # Global styles + Tailwind imports
│   └── api/chat/route.js  # AI API endpoint (POST /api/chat)
├── components/
│   ├── ResearchForm.js    # Research form + report state
│   ├── ReportView.js      # Renders the report as styled sections, with copy button
│   └── ChatBox.js         # Legacy chat UI (kept as reference, not used)
├── lib/
│   ├── ai.js              # AI wrapper — all AI calls go here
│   ├── focusOptions.js    # Shared research-focus options (form + API validation)
│   └── prompts/
│       └── marketIntelligencePrompt.js  # The analyst system prompt
├── .env.example           # Template for environment variables
├── .env.local             # Real secrets (never committed)
├── project_context.md     # Living project state — Claude Code reads this every session
└── CLAUDE.md              # Permanent operating rules for Claude Code
```

---

## Learning Roadmap

| Phase | Concept | Status |
|-------|---------|--------|
| 1 | Claude Code workflow + Git habits | In progress |
| 2 | Claude API + API routes | — |
| 3 | Tool calling | — |
| 4 | Structured outputs | — |
| 5 | Context engineering | — |
| 6 | Agentic workflows | — |
| 7 | RAG + vector databases | — |
| 8 | Memory systems | — |
| 9 | Evaluation systems | — |
| 10 | Human-out-of-the-loop automation | — |

---

## Available Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build locally |
| `npm run lint` | Check for code issues |

---

## Deploying to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Add environment variables in the Vercel dashboard (**Settings → Environment Variables**):
   - `AI_PROVIDER` → `anthropic`
   - `ANTHROPIC_API_KEY` → your real API key
   - `NEXT_PUBLIC_APP_NAME` → `Market Intelligence Agent`
4. Click **Deploy**

Variables in `.env.local` are never uploaded to Vercel automatically — they must be added manually.
