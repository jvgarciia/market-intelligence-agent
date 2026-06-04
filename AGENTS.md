# AGENTS.md — Project Operating Manual

This file is loaded automatically by Codex at the start of every session.
It is not documentation for humans. It is the persistent operating system for AI-assisted development on this project.

---

## Session Protocol

**Every session must follow this sequence before writing any code:**

1. Read `project_context.md` to understand the current state of the project
2. Check which files have changed recently if context is unclear (`git log --oneline -10`)
3. Confirm the task fits the product vision before implementing
4. After any major change, update `project_context.md` to reflect the new state

**Never:**
- Start coding before reading `project_context.md`
- Make architectural changes without stating the reasoning out loud first
- Rewrite working code to "clean it up" unless asked
- Add features, abstractions, or dependencies that were not requested

---

## Project Identity

**What this is:**
A reusable starter template for AI-powered web apps. Built so the owner never has to configure the same foundational setup twice. Copy the folder, rename it, add an API key, and a new project is running in under five minutes.

**Who it is for:**
A marketing student learning to build with AI systems. Not a software engineer. Every decision must balance professional quality with educational clarity.

**The core promise:**
This template should always feel like a launchpad, not a framework. It does the minimum required to start any AI app — and no more.

---

## Product Philosophy

Think like a SaaS product strategist, not just a coder.

Before implementing anything, ask:
- Does this serve the user of the final product, or just the developer?
- Does adding this make future projects easier to start, or harder to understand?
- Is this solving a real problem or a hypothetical one?

**Guiding principles:**
- **Clarity beats cleverness.** Code that a non-developer can read is better than code that impresses other developers.
- **Reusability beats optimization.** The template's value is in being easy to clone and adapt, not in being technically perfect.
- **One responsibility per file.** Each file should do exactly one thing. If you have to use "and" to describe what a file does, it should be split.
- **No premature abstraction.** Three similar lines of code is better than a helper function that exists for hypothetical future use.

---

## Current Architecture

```
ai-starter-template/
├── app/
│   ├── layout.js              # HTML shell — fonts, metadata, global styles
│   ├── page.js                # Homepage — composes the UI
│   ├── globals.css            # Tailwind CSS entry point
│   └── api/
│       └── chat/
│           └── route.js       # POST /api/chat — AI backend endpoint
├── components/
│   └── ChatBox.js             # Self-contained chat UI component
├── lib/
│   └── ai.js                  # AI provider wrapper (Codex / OpenAI / Gemini)
├── project_context.md         # Living project state — update after major changes
├── AGENTS.md                  # This file — permanent operating rules
├── .env.example               # Safe template committed to Git
├── .env.local                 # Real secrets — never committed
├── jsconfig.json              # Defines @/ path alias for imports
└── next.config.mjs            # Next.js configuration
```

**The single most important architectural rule:**
All AI calls must go through `lib/ai.js`. No page, component, or route should ever import an AI SDK directly. This is the boundary that makes provider-switching a one-line change.

**Data flow:**
```
User types message
  → ChatBox.js (UI state, fetch call)
    → POST /api/chat (route.js validates input)
      → chat() in lib/ai.js (routes to correct provider)
        → AI provider API
          → response flows back up the same chain
```

---

## Development Rules

### What to always do
- Use `@/` path aliases for all imports (e.g. `@/components/ChatBox`, `@/lib/ai`)
- Use Tailwind CSS for all styling — no inline `style={}` props, no separate `.css` files beyond `globals.css`
- Validate inputs at every API route before passing them further
- Keep API error messages generic on the frontend; log details on the server
- Use environment variables for every secret, key, and environment-specific value
- File naming: `PascalCase` for components (`ChatBox.js`), `camelCase` for utilities (`ai.js`)

### What to never do
- Never hard-code API keys, model names, or provider-specific values in components or pages
- Never use TypeScript unless explicitly requested — JavaScript is the language of this project
- Never add a `console.log` that would expose sensitive data
- Never import AI SDK packages (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`) outside of `lib/ai.js`
- Never commit `.env.local`
- Never over-explain code with comments — name things clearly instead

### When adding a new AI feature
1. Add the provider logic inside `lib/ai.js` only
2. Expose it via a clean function export
3. Call it from an API route in `app/api/`
4. Call the API route from the UI — never call `lib/ai.js` from a component directly (it's server-only code)

---

## Rendering Philosophy

This project uses the **Next.js App Router** with a deliberate split:

| Layer | Rendering | Rule |
|-------|-----------|------|
| Pages (`app/page.js`) | Server Component by default | No `useState`, no `useEffect`, no browser APIs |
| Interactive UI (`components/`) | Client Component — must have `'use client'` at top | Can use React hooks and browser events |
| API routes (`app/api/`) | Always server-side | Never expose secrets; never import from `components/` |
| AI wrapper (`lib/ai.js`) | Always server-side | Only ever called from API routes |

**Why this matters:**
Server Components run on the server and never send their code to the browser. This is where API keys are safe. Client Components run in the browser and must never touch secrets. Mixing these up is the most common source of security bugs in Next.js apps.

If a component needs to talk to the AI, the flow is always:
`Component → fetch('/api/...') → route.js → lib/ai.js`
Never shortcut this chain.

---

## UI/UX Principles

**Design target:** Clean, minimal, professional. The kind of UI that looks like it was designed, not coded.

**Color palette default:** Black, white, and gray (`gray-50` through `gray-900`). Add accent colors only when the specific product requires them.

**Component behavior:**
- Loading states must always be shown — never leave the user wondering if something is happening
- Errors must be shown inline, near where they occurred — no alerts, no console-only errors
- Forms must disable their submit button while a request is in-flight
- Scroll to new content automatically when a conversation grows

**What good UI looks like in this project:**
- Rounded corners (`rounded-xl`, `rounded-2xl`)
- Subtle shadows (`shadow-sm`) not heavy drop shadows
- Small, readable text (`text-sm`) for secondary information
- Generous padding so content breathes
- Transitions on interactive elements (`transition`, `hover:`, `disabled:`)

**What to avoid:**
- Bright color schemes without product purpose
- Full-width buttons on desktop
- Placeholder text that says "Enter text here"
- Success/error colors for neutral states

---

## Fast Test Mode Philosophy

When the goal is to verify that something works — not to build production UI — use the simplest possible test implementation:

- A plain `<form>` with a text input and a submit button is enough
- Log responses to the page in a `<pre>` tag if needed
- Do not build full UI for a test
- Label test pages clearly so they are not confused for real features

This project currently has one real page (`app/page.js`). Future test routes should live at `app/test/page.js` or similar and be excluded from production builds if needed.

---

## Browser Testing Workflow

Browser testing is part of the standard development workflow, not an optional extra step.

### When to use browser testing

Use the connected Chrome integration after any change that affects what the user sees or interacts with:

- A new component was added or an existing one was restyled
- A form, button, input, or interactive element was modified
- An API route was changed and the UI depends on its response
- A loading state, error state, or empty state was introduced
- A layout shift, spacing change, or responsive behavior was updated
- The app was deployed to Vercel and the live URL needs spot-checking

### When text/code inspection is enough

Do not open the browser for changes that have no visible effect:

- Editing a comment, renaming a variable, or restructuring logic inside a function
- Adding or updating environment variables
- Modifying `project_context.md`, `AGENTS.md`, or `README.md`
- Refactoring inside `lib/ai.js` when the API surface (function names, inputs, outputs) stays the same

### Standard browser testing sequence

After any meaningful UI/UX change, run through this sequence:

1. **Confirm the dev server is running** (`npm run dev` → `localhost:3000`)
2. **Load the affected page** and verify it renders without a blank screen or crash
3. **Test the changed flow end-to-end** — not just that it looks right, but that it works
4. **Check the browser console** for errors or warnings (red = must fix before shipping; yellow = investigate)
5. **Test edge cases** relevant to the change: empty input, long text, slow network, rapid clicks
6. **Verify visual integrity** — spacing, alignment, text wrapping, button states (hover, disabled, loading)

### What browser testing validates

| Category | What to check |
|----------|--------------|
| Page load | No blank screen, no 404, no hydration errors in console |
| Forms & inputs | Placeholder text, focus state, submit behavior, disabled state |
| Buttons | Hover style, disabled state during loading, click feedback |
| AI responses | Message appears, loading indicator shows and hides, errors display inline |
| Scroll behavior | New messages scroll into view automatically |
| Responsive layout | Check at common widths — mobile (~375px), tablet (~768px), desktop |
| Console stability | Zero red errors after any user interaction |

### Scope rules — critical

Browser testing is for **validation and debugging only**. It is not a license for autonomous redesign.

- **Report discovered issues before fixing them** — describe what was found, then ask before changing anything unrelated to the original task
- **Do not redesign what was not asked to change** — if a button color looks off but the task was about the input field, flag it as a note, not a fix
- **One problem at a time** — fix the thing that was asked about, report anything else separately

### Localhost vs. live URL testing

| Target | When to use |
|--------|-------------|
| `localhost:3000` | Always — primary testing environment during development |
| Vercel preview URL | After deploying a branch — verify env variables loaded and build succeeded |
| Vercel production URL | After merging to main — final smoke test before calling a feature done |

### Avoiding unnecessary browser automation

Do not open the browser to:
- Confirm that a CSS class was added to a file (read the file instead)
- Verify that a variable name was changed (read the file instead)
- "See how it looks" after a change that has no visual output

Browser testing has a cost — it takes time and attention. Use it when it gives information that reading code cannot.

---

## Core AI Builder Stack

This project works with globally installed AI skills. They are not stored in this repo — they live in the developer's global environment and activate on demand. Two skill paths are in use:

- `~/.agents/skills/` — Universal skills available across all AI coding tools (Claude Code, Codex, Cursor, Windsurf)
- `~/.claude/skills/` and `~/.claude/plugins/` — Claude Code-specific (available in Claude Code sessions only)

### Installed skill map

| Skill | Available in | Layer | Purpose |
|-------|-------------|-------|---------|
| `llm-council` | Claude Code only | Strategy | 5-advisor council for high-stakes decisions |
| `ui-ux-pro-max` | Claude Code only | UX | Searchable design intelligence — UX patterns, palettes, layouts |
| `emil-design-eng` | All agents | Polish | Interaction refinement, animation quality, UI craft |
| `find-skills` | All agents | Discovery | Search and install new skills from the ecosystem |

*`gsd` (execution mindset) is referenced in the workflow but not yet installed.*

---

### `llm-council` — Strategic reasoning
*(Claude Code sessions only — stored in `~/.claude/skills/`)*

**Use when:** Evaluating a product idea, choosing between architectural directions, pressure-testing a decision before building. Trigger phrases: `council this` · `war room this` · `pressure-test this` · `debate this`

**Do NOT use for:** Coding tasks, bug fixes, config changes, anything with a clear right answer.

**Output:** HTML report + markdown transcript saved to the working directory. Includes advisor agreements, clashes, blind spots, a direct recommendation, and one concrete next step.

---

### `ui-ux-pro-max` — Design intelligence
*(Claude Code sessions only — stored in `~/.claude/plugins/marketplaces/`)*

**Use when:** Starting a new page type (onboarding, dashboard, pricing, landing), choosing a visual style or color palette, looking for UX patterns or anti-patterns.

**Search command:**
```bash
python3 ~/.claude/plugins/marketplaces/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> --stack nextjs
```
Domains: `product` · `style` · `typography` · `color` · `landing` · `chart` · `ux`

---

### `emil-design-eng` — UI craft and interaction polish
*(Universal — stored in `~/.agents/skills/`)*

**Use when:** A component or interaction needs to feel right — not just function. Refining animation timing, easing curves, press feedback, hover states. Run *after* `ui-ux-pro-max` sets the structural layout.

**Core rules it enforces:** `ease-out` on entering elements · start at `scale(0.95)` not `scale(0)` · UI animations under 300ms · only animate `transform` and `opacity` · `scale(0.97)` on `:active` for buttons.

**Output:** `Before | After | Why` markdown table, one row per issue found.

---

### `find-skills` — Skill discovery
*(Universal — stored in `~/.agents/skills/`)*

**Use when:** A task sounds specialized and a dedicated skill might exist. Searches skills.sh ecosystem.
Trigger: `find a skill for X` · `is there a skill for X`

```bash
npx skills find [query]         # search
npx skills add [owner/repo] -g  # install globally
```

---

### How the skills layer together

```
Human (product direction)
  ↓
llm-council ── before committing to a direction (Claude Code only)
  ↓
[gsd] ── execution mode (not yet installed)
  ↓
ui-ux-pro-max ── UX quality for user-facing surfaces (Claude Code only)
  ↓
emil-design-eng ── craft polish before shipping (all agents)
  ↓
Browser testing ── behavioral validation
  ↓
Ship
```

**Default posture:** Implement directly for clear tasks. Council before committing on high-stakes decisions. Use `ui-ux-pro-max` + `emil-design-eng` in sequence when building surfaces that need to be right.

---

## Context Management Rules

`project_context.md` is the living memory of this project. `AGENTS.md` (this file) is the permanent rules layer. They serve different purposes:

| File | Purpose | When to update |
|------|---------|----------------|
| `AGENTS.md` | Permanent operating rules and philosophy — rarely changes | Only when the fundamental stack or workflow changes |
| `project_context.md` | Current project state, decisions made, features added | After every major change or new feature |

**After any session that changes the architecture, adds a new route, or introduces a new pattern:**
Update `project_context.md` with:
- What was added or changed
- Why that decision was made
- What the new file does and how it connects to the rest of the app

**Never put temporary or session-specific notes in either file.** Those belong in a task list or commit message.

---

## Deployment Workflow

**Standard deployment path:**

```
Local development (.env.local)
  → git commit + git push → GitHub
    → Vercel detects push → auto-builds → auto-deploys
      → Live URL updated
```

**First-time Vercel setup:**
1. Push project to GitHub
2. Go to vercel.com → Add New Project → Import from GitHub
3. Vercel auto-detects Next.js — no build config needed
4. Add environment variables in Vercel dashboard (Settings → Environment Variables):
   - `AI_PROVIDER` → `anthropic`
   - `ANTHROPIC_API_KEY` → real key from console.anthropic.com
   - `NEXT_PUBLIC_APP_NAME` → display name for the app
5. Click Deploy

**Critical rule about environment variables:**
`.env.local` is never uploaded to Vercel. Every variable in `.env.local` must be manually added in the Vercel dashboard. If the app crashes on Vercel but works locally, a missing environment variable is the first thing to check.

**Variables prefixed with `NEXT_PUBLIC_`** are embedded into the frontend JavaScript bundle at build time. They are visible to anyone who views source code. Never put secrets in `NEXT_PUBLIC_` variables.

**Variables without that prefix** (like `ANTHROPIC_API_KEY`) are server-only. They never reach the browser.

---

## Communication and Output Expectations

Every time code is created or changed, the response must include:

### 1. What changed
Name the specific file(s) and describe what was done in plain language. No vague summaries like "updated the component."

### 2. Why it matters
The strategic or architectural reason behind the decision — not just what the code does, but why this approach was chosen over alternatives.

### 3. What to learn from it
One transferable concept or pattern the user can carry into future projects. Written for a non-developer. Avoid jargon without a definition.

**Tone rules:**
- Plain English. If a technical term is necessary, define it in the same sentence.
- Concise. One clear sentence is better than a paragraph of hedging.
- Direct. State decisions as decisions, not as suggestions.
- No "great question!" or filler phrases.

---

## Code Quality Expectations

**The standard for every file in this project:**

- A developer who has never seen this project should understand any file in under 60 seconds
- Every function does one thing
- No function is longer than ~30 lines without a clear reason
- No file is longer than ~100 lines without a clear reason
- If something feels complex to explain, it should be simplified — not documented

**Comment policy:**
Comments explain *why*, never *what*. If the code itself doesn't communicate what it does, rename the variables and functions until it does. Comments that describe what the next line does are noise.

**Dependency policy:**
Before adding any new npm package, ask: can this be done with what is already installed? The `package.json` in this project should stay minimal. Every dependency is a maintenance burden and a potential security surface.

**Before calling any task complete:**
- The feature works end-to-end in the browser, not just in theory
- No new console errors or warnings introduced
- No hardcoded values that should be environment variables
- The change is consistent with the architecture described in this file

---

## Strategic Reminders

These are the decisions that were made deliberately and should not be undone without discussion:

- **JavaScript, not TypeScript** — the user is learning; type annotations add cognitive overhead without benefit at this stage
- **No database** — state lives in the browser or in AI conversation history; persistence can be added later with a specific product requirement
- **No authentication** — the template is for prototyping and learning; auth can be bolted on with NextAuth when a product needs it
- **Single AI wrapper file** — `lib/ai.js` is intentionally the only place where provider logic lives; distributing this across files would make provider-switching impossible to maintain
- **Vercel for deployment** — chosen because it was built for Next.js; zero-config deploys eliminate an entire category of problems for a non-developer
