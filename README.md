# AI Starter Template

A clean, reusable foundation for building AI-powered web apps. Built with Next.js, Tailwind CSS, and a provider-agnostic AI wrapper that supports Claude, OpenAI, and Gemini.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up your environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and add your API key. Do **not** commit this file.

### 3. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Switching AI Providers

Open `.env.local` and change `AI_PROVIDER`:

| Value | Provider | SDK to install |
|-------|----------|----------------|
| `anthropic` | Claude (default) | Already included |
| `openai` | GPT-4o | `npm install openai` |
| `gemini` | Gemini 1.5 Pro | `npm install @google/generative-ai` |

Then add the matching API key in `.env.local`.

---

## Project Structure

```
├── app/
│   ├── layout.js          # HTML shell — wraps every page
│   ├── page.js            # Homepage
│   ├── globals.css        # Global styles + Tailwind imports
│   └── api/chat/route.js  # AI API endpoint (POST /api/chat)
├── components/
│   └── ChatBox.js         # Drop-in chat UI component
├── lib/
│   └── ai.js              # AI provider wrapper — one function to call any model
├── .env.example           # Template for environment variables
├── .env.local             # Your real keys (never committed)
└── project_context.md     # Rules and context for Claude Code
```

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

### Option A — Deploy from GitHub (recommended)
1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your repository
4. In the **Environment Variables** section, add:
   - `AI_PROVIDER` → `anthropic` (or your chosen provider)
   - `ANTHROPIC_API_KEY` → your real API key
   - `NEXT_PUBLIC_APP_NAME` → your app's display name
5. Click **Deploy**

### Option B — Deploy from terminal
```bash
npm install -g vercel
vercel
```
Follow the prompts. Add environment variables in the Vercel dashboard after.

### Important: Environment variables in Vercel
Variables in `.env.local` are **not** uploaded to Vercel automatically. You must add them manually in your project's Vercel dashboard under **Settings → Environment Variables**.

---

## AI Workflow Layer

This template is designed to work with a set of globally installed AI skills that extend Claude Code's capabilities. When present in your environment, they activate automatically at the right moment in the build process.

| Skill | What it does | When it activates |
|-------|-------------|-------------------|
| `llm-council` | Runs a decision through 5 independent AI advisors + peer review → chairman verdict + HTML report | Before committing to a product direction or major architecture change |
| `ui-ux-pro-max` | Searchable design database: UX patterns, color palettes, font pairings, chart types | When designing a new page, choosing a visual style, or looking for SaaS UX patterns |
| `emil-design-eng` | Reviews UI for animation timing, easing, press feedback, and interaction polish | After layout is set — before shipping a user-facing surface |
| `find-skills` | Searches the skills.sh ecosystem for installable domain-specific skills | When a task feels specialized and a dedicated skill might exist |

**Install missing skills via terminal:**
```bash
npx skills add [owner/repo@skill-name] -g   # install globally
npx skills find [query]                     # search the ecosystem
```

These skills are global — they travel with you across every project, not just this one.

---

## Customizing for a New Project

1. Change `NEXT_PUBLIC_APP_NAME` in `.env.local`
2. Edit the system prompt in `lib/ai.js` (the `DEFAULT_SYSTEM_PROMPT` constant)
3. Modify `app/page.js` to change the UI
4. Add new API routes in `app/api/` as your app grows
