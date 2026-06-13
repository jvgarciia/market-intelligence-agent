# ICM Adoption Review — Research Decision Record

**Date:** 2026-06-13
**Primary source:** Van Clief & McDermott, *Interpretable Context Methodology:
Folder Structure as Agent Architecture*, arXiv:2603.16021v2 (CC BY 4.0), read in
full from `docs/research/`.
**Purpose:** Record what we took from ICM, what we changed, what we rejected or
postponed, and — importantly — what the paper does and does not actually claim.

> **Evidence caveat (read this first).** ICM is **one paper** reporting a design
> pattern and **informal practitioner observations**, not a controlled study. By
> the authors' own admission (§4.6) there is **no controlled comparison** between
> ICM's staged context loading and a monolithic prompt on the same task; the
> quality argument rests on the "lost in the middle" literature (Liu et al. 2024)
> and practitioner judgement, not measured effect sizes. All testing used a single
> model family (Claude Opus/Sonnet 4.6). Treat ICM as a **well-reasoned
> convention to test**, not a proven best practice. Nothing in this document should
> be read as "ICM is proven to produce better output."

---

## 1. What ICM is (concise)

ICM proposes replacing framework-level agent orchestration (CrewAI, LangChain,
AutoGen) with **filesystem structure** for *sequential, human-reviewed,
repeatable* workflows. Numbered folders are stages; markdown files carry each
stage's prompt/context; local scripts do the mechanical, non-AI work. One agent
reads the right files at the right moment instead of many agents coordinating in
code.

**The five design principles (§3.1):**
1. **One stage, one job** — each stage does a single step and writes its own output.
2. **Plain text as the interface** — stages communicate through markdown/JSON; any text editor can inspect or edit any artifact.
3. **Layered context loading** — each stage loads only what it needs, and crucially separates *reference material* (Layer 3, stable rules) from *working artifacts* (Layer 4, per-run content).
4. **Every output is an edit surface** — each stage's output is a file a human can read/edit before the next stage runs (review gates).
5. **Configure the factory, not the product** — set up the workspace's stable rules once; each run produces a new deliverable using that same configuration.

**The five-layer context hierarchy (§3.2):**

| Layer | File | Role | Token budget (paper) |
|------|------|------|----------------------|
| 0 | `CLAUDE.md` | "Where am I?" — workspace identity | ~800 |
| 1 | workspace `CONTEXT.md` | "Where do I go?" — task routing | ~300 |
| 2 | stage `CONTEXT.md` | "What do I do?" — the stage contract (Inputs/Process/Outputs) | 200–500 |
| 3 | `references/` | "What rules apply?" — stable across runs (the *factory*) | 500–2k |
| 4 | `output/` | "What am I working with?" — per-run artifacts (the *product*) | varies |

The paper also proposes, as **future work** (§6.2–6.3): a `Verify` section in
stage contracts, output-provenance identifiers (source maps for content), and
**source-level improvement** — fixing the reference files/contracts when the same
edit recurs, rather than re-editing each output. These are explicitly *not yet
implemented* in ICM.

## 2. Why ICM is relevant to this project

Our Market Opportunity workflow is **sequential** (signals → candidates →
validation → scoring → brief), **benefits from human review** at defined points,
and is **repeatable** (same pipeline, different market each run). That is exactly
the workflow class ICM targets (§5.1). The current single-report baseline hides
all intermediate reasoning; ICM's emphasis on inspectable, stage-scoped,
plain-text artifacts is a direct, principled answer to that problem.

**But** our product is a **deployed Next.js web app** heading toward API
execution, multiple users, retries, dynamic tool use, and possibly parallel
research agents. The paper is explicit (§5.2) that ICM is **local-first** and that
**high-concurrency, multi-user deployment and automated mid-pipeline branching are
where ICM does not fit** — "scaling it to concurrent users would require building
the infrastructure ICM was designed to avoid." So ICM informs our *context and
workflow design*, not our *execution and deployment*. Hence a hybrid (§7 below).

## 3. Principles we adopted

| ICM principle | Our implementation | Status |
|---------------|--------------------|--------|
| One stage, one job | Five stages, each its own folder + `CONTEXT.md`; one responsibility each | **Adopted** |
| Plain text interface | Artifacts are JSON + a markdown brief; all human-readable | **Adopted** |
| Reference vs working split (Layer 3/4) | `references/` (rubric, evidence standards, schemas) vs `runs/<id>/` per-run output | **Adopted** |
| Stage contracts | Each `CONTEXT.md` states inputs/process/outputs (plus more — see §4) | **Adopted (extended)** |
| Inspectable intermediate outputs | Every stage writes a validated, readable file; `npm run workflow:demo` produces them | **Adopted** |
| Configure the factory, not the product | Stable rubric/standards configured once; each run consumes them | **Adopted** |
| Human review gates | Two gates defined in the contracts (after validation; before briefs final) | **Adopted as documented gates** (not yet enforced in code — see §5) |

## 4. Principles we adapted intentionally

1. **Verification lives in application code, not in an agent-run markdown
   instruction.** The paper floats a `Verify` section as future work the *agent*
   would run. We implemented cross-stage integrity checks as **deterministic
   JavaScript** (`runWorkflow.mjs`) and schema validation (`validate.mjs`). This
   follows ICM's own "local scripts handle the mechanical work that does not need
   AI" rule and is more reliable than asking the model to police itself. *We are
   ahead of the paper here, by design.*
2. **Orchestration is code, not a folder-reading agent.** In pure ICM there is no
   orchestrator — one agent reads `01.../CONTEXT.md` and acts. We have
   `runWorkflow.mjs` because we are building a deployable, testable, eventually
   multi-user product. This is the central, deliberate divergence (§7).
3. **Stage contract template is richer than Inputs/Process/Outputs.** We added
   Reference context, Tools allowed, Verification checks, Failure conditions, and
   Human review requirements. This anticipates the paper's future `Verify` idea and
   suits a product that must fail visibly.
4. **Run artifacts are git-ignored, not committed.** The paper commits stage
   outputs to Git for reproducibility. Our run output is variable and will move to
   a database, so we keep only the structure in Git (`runs/README.md`).
5. **`CLAUDE.md` is not our Layer 0.** Our `CLAUDE.md` is the large Claude Code
   *project operating manual*, not a ~800-token per-workspace identity file. The
   workflow's Layer-0/Layer-1 role is played by
   `workflows/market-opportunity/CONTEXT.md`. Different artifact, different job.

## 5. Principles we rejected or postponed

| Item | Decision | Why |
|------|----------|-----|
| Folder-only execution (filesystem *replaces* the framework) | **Rejected for the product** | We need deployed API execution, concurrency, retries, observability — the paper says these are outside ICM's fit (§5.2). |
| Multi-agent / parallel specialist stages | **Postponed** | Gated on evaluation evidence; the paper offers no quality proof and warns automated branching turns ICM "into a framework itself." |
| Enforced human edit-gates *in the orchestrator* (pause, let human edit `output/`, resume from stage N) | **Postponed** | Our orchestrator currently runs all five mock stages in one pass. A real gate belongs in API/UI state, not a paused local script. Artifacts are already editable files; stop-and-resume is a later product feature. |
| Layer 0 vs Layer 1 split inside the workflow | **Not appropriate now** | For a single workflow, one `CONTEXT.md` is enough; a separate identity/routing split would be premature structure. |
| Output-provenance source maps; automated edit-tracking → source suggestions (§6.2–6.3) | **Postponed (paper's own future work)** | Valuable later for claim→source traceability, but speculative even in the paper. |
| Committing run outputs to Git for reproducibility | **Rejected** | Replaced by per-run storage now, a database later. |

## 6. The paper's limitations (stated by the authors, §4.6)

- **No controlled comparison** of staged vs monolithic context on the same task —
  the quality claim is theoretical + practitioner judgement, not measured.
- Observations are **informal** (conversations, not instrumented logging or
  structured interviews).
- The practitioner community is **invite-only and self-selected** → selection and
  enthusiasm bias. The "U-shaped intervention" pattern (30 of 33) is self-reported.
- **Single model family** (Claude Opus/Sonnet 4.6); no cross-model evaluation.
- Most real use is **content production**; academic/policy deployments are early.
- Open question the authors raise: as context windows grow, the *efficiency*
  argument for scoping may weaken (though the human-oversight arguments remain).

**Implication for us:** adopt ICM's structure for its *interpretability and
human-control* benefits, which are architectural and do not depend on an unproven
quality claim — and **measure** the quality question ourselves (§8).

## 7. Why a hybrid architecture

We deliberately split the system along the line the paper itself draws:

- **ICM-inspired (context & workflow design):** numbered stages, one job each,
  stage `CONTEXT.md` contracts, the Layer-3/Layer-4 reference-vs-working split,
  plain-text inspectable artifacts, defined human review points.
- **Application code (execution, reliability, future scale):** Next.js + API
  routes, `lib/ai.js` provider isolation, `lib/workflow/` orchestration and schema
  validation, cost modes, and (later) retries, observability, concurrency, and any
  parallel agents.

ICM gives us a glass-box *design*; application code gives us a deployable,
testable, multi-user-capable *system*. The paper supports exactly this division:
its strengths are interpretability and human control for sequential reviewed
workflows; its stated non-fits are concurrency, deployment, and automated
branching — which we keep in code.

## 8. The next experiment (to test whether staged context actually helps)

The paper cannot tell us whether staging improves *our* output — it never ran that
comparison. So before investing further in stages or agents, run the comparison
the paper omitted, on our task:

> **Hypothesis:** stage-scoped context produces more accurate, better-cited,
> more inspectable market-opportunity output than the current single-prompt
> baseline, at acceptable cost/latency.
>
> **Experiment:** take the 5 `evals/cases`. Run each through (a) the current
> baseline `/api/chat` and (b) a *live* staged pipeline (Stage 01 first), both in
> `cheap` mode. Score the `evals/README.md` dimensions — starting with the
> automatable ones (citation support, source recency, cost, latency) — and record
> results per case.
>
> **Decision rule:** the staged version proceeds only if it does not regress
> accuracy/citation quality and shows a real gain in traceability/debuggability
> (and ideally cost-per-useful-output). "Feels more advanced" does not count.

This turns ICM from a borrowed belief into a tested decision for our specific
product and model.

---

## Appendix — prioritised recommendations from this review

**Critical corrections (done in this review):**
- Fixed the stale "ICM PDFs do not exist" note in `current-state-audit.md` (the
  paper is now in `docs/research/` and reviewed here).

**Valuable improvements (postpone until live wiring):**
- When stages go live, decide explicitly whether each stage's `CONTEXT.md` is
  *loaded into the model's context* (true ICM) or remains documentation mirrored
  by code. Today the mock orchestrator re-implements stage logic, so the contracts
  and the code could drift. Keeping the markdown as the loaded context (with
  deterministic checks in code) preserves the ICM benefit and prevents drift.
- Implement the review gates as real stop/resume points in API/UI state, so a
  human can edit `02-candidates.json` / `03-validation.json` and resume from the
  next stage — the paper's "every output is an edit surface" property.

**Optional experiments (later):**
- Output-provenance identifiers linking brief sentences back to `evidenceId`s
  (the paper's §6.2 "source maps for content") — strong fit for our claim→source
  goal, but only worth it once live stages exist.
- Cross-model check once a second provider is wired through `lib/ai.js`, since the
  paper's results are single-model.
