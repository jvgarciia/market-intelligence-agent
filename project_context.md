# Project Context — AI Starter Template

This file is the memory and rulebook for Claude Code. Read it at the start of every session.

---

## What This Project Is

A reusable starter template for building AI-powered web apps quickly. The goal is to never
start from scratch again — copy this folder, rename it, and a new project is ready in minutes.

The primary user is a marketing student learning AI systems. The code must be readable and
educational, not just functional.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Vercel-native, handles frontend + backend in one project |
| Styling | Tailwind CSS | Utility classes, no separate CSS files, fast to write |
| AI Layer | `lib/ai.js` wrapper | Swap providers by changing one env variable |
| Default AI | Anthropic Claude (`claude-sonnet-4-6`) | Best general-purpose model |
| Deployment | Vercel | Zero-config, free tier, integrates with GitHub |
| Language | JavaScript (no TypeScript) | Simpler for a non-developer learning codebase |

---

## Rules Claude Code Must Follow

### Code quality
- Keep code simple. No over-engineering. One file should do one thing.
- No TypeScript unless the user explicitly asks for it.
- Avoid adding features or abstractions beyond what was requested.
- Do not add comments that explain *what* the code does — only add a comment if the *why* is non-obvious.

### Security
- Never hard-code API keys. Always use environment variables.
- Validate inputs at API routes (check that required fields exist).
- Never expose internal error messages to the frontend in production.

### Style
- Use Tailwind CSS for all styling. No inline `style={}` props.
- Keep components small and focused.
- File names: `PascalCase` for components, `camelCase` for lib files.

### AI provider
- All AI calls must go through `lib/ai.js`. Never import an AI SDK directly in a page or component.
- The default provider is Anthropic Claude.
- Changing providers requires only changing `AI_PROVIDER` in `.env.local`.

---

## Browser Testing Workflow

Browser testing is part of the standard development loop for this project, not a separate QA phase.

**Use the connected Chrome integration after any change that affects UI, interaction, or API responses.**

Quick reference — trigger browser testing when:
- A component, layout, or style was changed
- A form, button, or interactive element was added or modified
- An API route response changed and the UI depends on it
- The app was deployed and the live URL needs verification

Do NOT open the browser for:
- Pure logic or utility changes with no visual output
- Documentation edits
- Environment variable changes

**Standard sequence for every UI change:**
1. Confirm dev server is running (`npm run dev`)
2. Load the page, verify no blank screen or console errors
3. Test the changed interaction end-to-end
4. Check browser console — zero red errors is the bar
5. Verify edge cases (empty input, loading state, error state)

**Scope rule:** Browser testing is for validation only — not autonomous redesign. Report discovered issues before fixing anything outside the original task scope.

Full browser testing rules and decision tables live in `CLAUDE.md` under **Browser Testing Workflow**.

---

## Secondary AI Review Workflow

This project uses a structured, human-directed multi-AI workflow — not an autonomous agent system.

**The four layers, in order:**
1. **Human** — sets direction, approves changes, owns product decisions
2. **Primary AI** — implements, architects, maintains project context
3. **Secondary AI** — reviews, debugs, checks adversarially when needed
4. **Browser** — validates real behavior after code and review are complete

**Use secondary AI review when:**
- A new API route, security-adjacent change, or multi-file refactor was made
- A bug could not be isolated after two attempts
- A deployment failed and the cause is unclear
- The primary AI flagged uncertainty about an approach

**Skip secondary AI review when:**
- The change is small, contained, and browser-tested successfully
- It's a documentation, config, or environment variable update
- The feature is still being actively iterated — wait for it to stabilize

**Core rules:**
- One primary AI agent at a time — no parallel architecture sessions
- Secondary AI produces a report; the primary agent applies approved changes
- Human approves changes between every layer — no autonomous handoffs
- Project context must be summarized before switching AI tools

Full workflow rules, responsibility tables, and anti-patterns live in `CLAUDE.md` under **Secondary AI Review Workflow**.

---

## Core AI Builder Stack

Globally installed skills that activate on demand. Not stored in this repo.

| Skill | Trigger it when... | Do NOT use for... |
|-------|-------------------|-------------------|
| `llm-council` | High-stakes product/architecture decision · "council this" · "pressure-test this" | Coding tasks, bug fixes, clear-answer questions |
| `ui-ux-pro-max` | Building a new page type, choosing a visual style, finding UX patterns | Backend logic, component-level animation polish |
| `emil-design-eng` | Refining interaction feel, animation timing, press feedback, easing | Strategic decisions, early wireframes |
| `find-skills` | Task sounds specialized · "find a skill for X" | Tasks with a known approach |
| `[gsd]` | *Not yet installed* — execution mindset for fast shipping | — |

**Layering order:** `llm-council` → `[gsd]` → `ui-ux-pro-max` → `emil-design-eng` → browser test → ship

Full skill documentation, trigger phrases, CLI commands, and interaction rules live in `CLAUDE.md` under **Core AI Builder Stack**.

**Skill usage verification rule:** When a skill is used, state which skill, why it was invoked, what it specifically contributed, and what decisions it changed. For design tasks: `ui-ux-pro-max` contributions first, then `emil-design-eng`. Do not claim a skill was used unless its output actually influenced the result.

---

## How to Explain Changes

Every time a file is created or modified, Claude Code should explain:

1. **What changed** — which file(s) and what was done
2. **Why it matters** — the reason behind the decision, not just what it does
3. **What to learn from it** — one concept or pattern the user can take away

Keep explanations short, plain, and written for a non-developer. No jargon without a definition.

---

## Deployment Process

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables manually in Vercel (they are never uploaded from `.env.local`)
4. Vercel auto-deploys on every push to the main branch

**Variables required in Vercel:**
- `AI_PROVIDER`
- `ANTHROPIC_API_KEY` (or whichever provider key is in use)
- `NEXT_PUBLIC_APP_NAME`

---

## What Each Key File Does

| File | Purpose |
|------|---------|
| `app/layout.js` | The HTML shell. Wraps every page. Set fonts, metadata, global styles here. |
| `app/page.js` | The homepage. Edit this to change what the user sees first. |
| `app/api/chat/route.js` | The AI backend. Receives messages from the UI, calls the AI, returns the reply. |
| `lib/ai.js` | The AI brain. Routes to the right provider. Edit the system prompt here. |
| `components/ChatBox.js` | Reusable chat UI. Drop `<ChatBox />` onto any page to add chat. |
| `.env.local` | Your secrets. Never committed. Copy from `.env.example`. |
| `project_context.md` | This file. Claude Code reads it to understand the project. |

---

## Coding Style Examples

**Good:**
```js
const reply = await chat(messages);
return NextResponse.json({ reply });
```

**Avoid:**
```js
// This function calls the AI and returns the response
const aiResponse = await callTheArtificialIntelligenceProvider(messageArray);
const jsonResponseObject = NextResponse.json({ reply: aiResponse });
return jsonResponseObject;
```

---

## Project History

- Created: 2026-05-09
- Purpose: Reusable AI web app starter for a marketing student
- Stack chosen for: simplicity, Vercel compatibility, AI-first structure
