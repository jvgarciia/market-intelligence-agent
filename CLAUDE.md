# CLAUDE.md — Project Operating Manual

This file is loaded automatically by Claude Code at the start of every session.
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
│   └── ai.js                  # AI provider wrapper (Claude / OpenAI / Gemini)
├── project_context.md         # Living project state — update after major changes
├── CLAUDE.md                  # This file — permanent operating rules
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
- Modifying `project_context.md`, `CLAUDE.md`, or `README.md`
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

## Secondary AI Review Workflow

This project supports a structured multi-AI collaboration pattern. It is not an autonomous agent swarm. It is a controlled, human-directed workflow where different AI tools serve specific roles — and the human retains all product authority.

### The four-layer model

```
Human (product direction + prioritization)
  ↓ directs
Primary AI (implementation + architecture + project memory)
  ↓ produces changes
Secondary AI (review + debugging + adversarial checking)
  ↓ validates logic and structure
Browser testing (UI verification + console + interaction testing)
  ↓ confirms behavior in the real environment
```

No layer acts without the human deciding it is time. No layer rewrites what another layer owns without explicit instruction.

---

### Primary AI responsibilities

The primary AI agent is the one with full project context — the one reading `CLAUDE.md` and `project_context.md` at session start. It owns:

- Architecture decisions and consistency
- Implementation of requested features
- Maintaining the data flow (`component → API route → lib/ai.js`)
- Updating `project_context.md` after major changes
- Preserving conventions across sessions (naming, file structure, rendering split)
- Explaining changes clearly to the human

**The primary AI does not get replaced mid-task without a handoff.** Switching agents without transferring context causes architectural drift.

---

### Secondary AI responsibilities

A secondary AI is brought in for a specific, bounded purpose — not to take over. Appropriate uses:

| Use case | When to trigger |
|----------|----------------|
| Syntax and logic review | After a complex new function or module is written |
| Deployment sanity check | Before pushing to production |
| Bug investigation | When the primary AI cannot identify the root cause |
| Adversarial review | After any change that touches security, auth, or API key handling |
| Edge-case audit | After forms, inputs, or validation logic changes |
| Regression check | When refactoring a file that other files depend on |
| Alternative approach | When the current implementation feels overcomplicated |

The secondary AI reviews the **output** of the primary AI. It does not re-architect from scratch. It does not rewrite files that are working. It returns a report, not a replacement.

---

### Browser validation layer responsibilities

After both AI layers sign off, browser testing is the final check against real behavior:

- Does the page load without errors?
- Do interactions work as implemented?
- Does the browser console stay clean?
- Do edge cases (empty input, errors, loading states) behave correctly?
- Does the visual output match the intended design?

Browser testing can surface issues neither AI caught — hydration errors, layout breaks at specific widths, race conditions on rapid clicks. It is not a replacement for code review; it is the confirmation layer.

---

### Human responsibilities

The human is not a passive observer in this workflow. The human:

- Decides what gets built next
- Decides when secondary AI review is worth the time
- Decides what browser tests to run
- Makes all UX judgment calls
- Approves or rejects AI suggestions before they become permanent
- Owns the product vision — no AI layer overrides this

When two AI reviews conflict, the human decides which direction is correct. The human is the only agent in this system with full business context.

---

### When secondary AI review is useful

Use it when:
- A new API route was added that handles user data or external calls
- A refactor touched more than two files
- The primary AI flagged uncertainty about an approach
- A bug proved difficult to isolate after two attempts
- A deployment failed and the cause is unclear
- Security-adjacent code was written or modified

---

### When secondary AI review is unnecessary overhead

Skip it when:
- The change was a small, contained UI update
- The primary AI expressed high confidence and the logic is simple
- Browser testing already confirmed the behavior works correctly
- The task was documentation, environment variable updates, or config changes
- The change is being actively iterated — review after it stabilizes, not during

---

### Operational rules — what this workflow requires

- **One primary agent at a time.** Do not have two AI sessions simultaneously editing architecture or the same files.
- **Scope secondary review tightly.** Give it a specific file or question, not "review everything."
- **Secondary AI produces a report, not a rewrite.** Changes are made by the primary agent after reviewing the report — not by the secondary agent directly.
- **Browser testing runs after both AI layers complete** — not interleaved with them.
- **The human approves changes between layers.** The workflow is: primary implements → human reviews → secondary checks → human approves → browser validates → human ships.
- **Project context travels with the primary agent.** Before switching AI tools, summarize the current state so the secondary agent has what it needs — or it will give generic, context-blind feedback.

---

### Avoiding agent chaos

Agent chaos happens when multiple AI sessions run in parallel without coordination, each making decisions based on incomplete information. The symptoms:

- Two sessions rewrite the same file differently
- A change made in one session breaks context in another
- The architecture drifts because each session starts fresh
- The human spends more time coordinating AIs than building the product

This workflow prevents that with three constraints:

1. **One primary, one secondary** — not a swarm
2. **Sequential layers** — each layer waits for the previous to finish
3. **Human gates between layers** — no autonomous handoffs

The goal is not maximum AI utilization. The goal is predictable, fast, human-controlled iteration with AI as a tool — not as a system operator.

---

## Core AI Builder Stack

This project is designed to work with a set of globally installed AI skills. They are not stored in this repo — they live in the developer's global environment and activate on demand in any project. The stack covers four capability layers: strategic analysis, design intelligence, craft polish, and skill discovery.

**Skill locations:**
- `~/.claude/skills/` — Claude Code native skills (always available in Claude Code sessions)
- `~/.agents/skills/` — Universal agent skills (available across AI coding tools)
- `~/.claude/plugins/marketplaces/` — Plugin marketplace installs

### Installed skill map

| Skill | Location | Layer | Purpose |
|-------|----------|-------|---------|
| `llm-council` | `~/.claude/skills/` | Strategy | 5-advisor council for high-stakes decisions |
| `ui-ux-pro-max` | `~/.claude/plugins/marketplaces/` | UX | Searchable design intelligence — UX patterns, palettes, layouts |
| `emil-design-eng` | `~/.agents/skills/` | Polish | Interaction refinement, animation quality, UI craft |
| `find-skills` | `~/.agents/skills/` | Discovery | Search and install new skills from the ecosystem |

*`gsd` (execution mindset) is referenced in the workflow but not yet installed. Slot it between `llm-council` and `ui-ux-pro-max` when available.*

---

### `llm-council` — Strategic reasoning

**What it does:** Runs a decision through 5 independent advisors — the Contrarian, First Principles Thinker, Expansionist, Outsider, and Executor. They respond independently, peer-review each other anonymously, and a chairman synthesizes a final verdict. Saves an HTML report and full transcript to the working directory.

**Use when:**
- Evaluating a product idea, pivot, or major new feature before building
- Choosing between two meaningfully different architectural or product directions
- Pressure-testing a positioning, pricing, or monetization decision
- Any decision where being wrong is expensive and you only see one perspective

**Trigger phrases:** `council this` · `war room this` · `pressure-test this` · `stress-test this` · `debate this`

**Do NOT use for:** Coding tasks, UI decisions, bug fixes, config changes, documentation, or anything with a clear right answer.

**Output:** `council-report-[timestamp].html` (visual, scannable) + `council-transcript-[timestamp].md` (full detail). The report shows advisor agreements, clashes, blind spots from peer review, a direct recommendation, and one concrete next step.

---

### `ui-ux-pro-max` — Design intelligence

**What it does:** A searchable database of UI styles, color palettes, font pairings, chart types, and UX guidelines. Returns opinionated, stack-specific recommendations for Next.js, React, Tailwind, and other stacks.

**Use when:**
- Starting a new page: onboarding flow, dashboard, pricing page, landing page, empty states
- Choosing a visual style (minimalism, glassmorphism, brutalism) or color palette
- Looking for UX patterns or documented anti-patterns for a specific UI surface
- Deciding which chart type fits a data visualization need

**Search command:**
```bash
python3 ~/.claude/plugins/marketplaces/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> --stack nextjs
```

**Domains:** `product` · `style` · `typography` · `color` · `landing` · `chart` · `ux`

**Do NOT use for:** Backend architecture, API design, or component-level animation polish (that's `emil-design-eng`).

---

### `emil-design-eng` — UI craft and interaction polish

**What it does:** Encodes Emil Kowalski's design engineering philosophy. Reviews UI code and returns a Before/After markdown table of specific improvements covering animation timing, easing curves, transitions, component press feedback, and GPU performance.

**Use when:**
- A component, button, modal, drawer, or interaction needs to *feel* right — not just function
- Reviewing or refining animation timing, easing curves, or transition behavior
- Adding hover states, press feedback (`scale(0.97)` on `:active`), or loading transitions
- Any UI that is structurally correct but feels rough or unrefined

**Key principles it enforces:**
- Use `ease-out` for entering elements, never `ease-in` (starts sluggish)
- Never animate from `scale(0)` — start at `scale(0.95)` with `opacity: 0`
- UI animations stay under 300ms; button press feedback under 160ms
- Only animate `transform` and `opacity` — these run on the GPU and skip layout
- Add `transform: scale(0.97)` on `:active` for button press feedback

**Output format:** A single markdown table with `Before | After | Why` columns — one row per issue found.

**Do NOT use for:** Strategic decisions, page layout architecture, or early wireframe thinking. Run `ui-ux-pro-max` first to set structure, then `emil-design-eng` to refine it.

---

### `find-skills` — Skill discovery

**What it does:** Searches the open agent skills ecosystem at skills.sh for installable skills when a task feels specialized enough to warrant a dedicated workflow.

**Use when:**
- A task sounds like it should have a dedicated skill but you're unsure one exists
- Looking to extend capabilities into a domain not currently covered

**Trigger phrases:** `find a skill for X` · `is there a skill for X` · `can you do X` (when X is a specialized domain)

**CLI commands:**
```bash
npx skills find [query]          # search the ecosystem
npx skills add [owner/repo] -g   # install globally
npx skills check                 # check for updates
```

**Do NOT use for:** Tasks where the right approach is already known. Checking for skills has a cost — use it when you genuinely don't know what's available.

---

### How the skills layer together

```
Human (product direction + priorities)
  ↓
llm-council ── strategic analysis before committing direction
  ↓
[gsd] ── execution mode, ship the core thing fast (not yet installed)
  ↓
ui-ux-pro-max ── UX quality while building user-facing surfaces
  ↓
emil-design-eng ── craft polish after layout is set, before shipping
  ↓
Browser testing ── behavioral validation
  ↓
Ship
```

**`ui-ux-pro-max` and `emil-design-eng` are sequential, not parallel.**
`ui-ux-pro-max` handles structure and usability — does this page make sense?
`emil-design-eng` handles feel and craft — does this interaction feel right?
Polishing before the structure is validated wastes time.

**`llm-council` and `[gsd]` are mutually exclusive modes.**
You are either analyzing a decision or executing it. Running council analysis mid-build introduces unnecessary doubt. Running execution mode on an unresolved strategic question produces work that may need to be thrown away.

### When to skip skills entirely

- Routine bug fixes with a clear root cause
- Config edits, environment variable changes, documentation updates
- Any task where reading the code and making the change is faster
- Work still actively iterating — invoke craft skills after it stabilizes

**Default posture:** Implement in execution mode for clear tasks. Use `llm-council` before committing direction on anything with real stakes. Bring in `ui-ux-pro-max` and `emil-design-eng` when a user-facing surface needs to be right before shipping.

---

### Skill usage verification

When a skill is used, the response must explicitly state:

1. **Which skill was used** — name it
2. **Why it was used** — what triggered the decision to invoke it
3. **What it contributed** — specific ideas, patterns, or constraints that came from the skill's output
4. **What it influenced** — which decisions or implementation choices changed as a result

**For design tasks specifically:**
- State what `ui-ux-pro-max` contributed first (structure and patterns)
- Then state what `emil-design-eng` contributed (polish and interaction refinement)

**The rule:** Do not claim a skill was used unless its output actually changed the implementation. If a skill was invoked but its output was generic or not applied, say so. Honesty about skill contribution is more useful than the appearance of thoroughness.

---

## Context Management Rules

`project_context.md` is the living memory of this project. `CLAUDE.md` (this file) is the permanent rules layer. They serve different purposes:

| File | Purpose | When to update |
|------|---------|----------------|
| `CLAUDE.md` | Permanent operating rules and philosophy — rarely changes | Only when the fundamental stack or workflow changes |
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
