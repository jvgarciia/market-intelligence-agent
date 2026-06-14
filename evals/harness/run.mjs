/**
 * evals/harness/run.mjs — the evaluation runner.
 *
 * runEvaluation() is the single entry point for running a comparison between
 * the baseline and staged workflow for one eval case. It:
 *   1. Loads the eval case from evals/cases/<caseId>.json
 *   2. Runs both adapters (baseline + staged)
 *   3. Normalizes both outputs to the common evaluation structure
 *   4. Runs deterministic checks on each
 *   5. Builds a comparison and summary
 *   6. Writes all artifacts to evals/results/<evalRunId>/
 *
 * In mock mode: zero API calls, zero cost, fully deterministic.
 * In live modes: throws — use scripts/run-eval-live.mjs with explicit approval.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newEvalRunId } from './ids.mjs';
import { createEvalStore, DEFAULT_RESULTS_DIR } from './storage.mjs';
import { runBaselineAdapter } from './adapters/baseline.mjs';
import { runStagedAdapter } from './adapters/staged.mjs';
import { normalizeBaselineOutput } from './normalize/baseline.mjs';
import { normalizeStagedOutput } from './normalize/staged.mjs';
import { runDeterministicChecks, summarizeIssues } from './checks/deterministic.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(here, '..', 'cases');

/** Load a single eval case by its ID (filename without .json). */
export function loadCase(caseId) {
  const file = join(CASES_DIR, `${caseId}.json`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Return all case IDs available in evals/cases/. */
export function listCases() {
  return readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

/**
 * Run a full mock evaluation comparison for one case.
 *
 * @param {string} caseId   — matches a filename in evals/cases/ (e.g. '01-water-utilities-spain')
 * @param {object} options  — {
 *     mode: 'mock' (default; only mock is supported here),
 *     evalRunId: string (auto-generated if omitted),
 *     resultsDir: string (default evals/results/),
 *     runBaseDir: string (override the staged workflow's runs/ dir — for tests),
 *     now: string (ISO timestamp — for determinism in tests),
 *   }
 * @returns {{ evalRunId, dir, caseId, mode, baselineIssueSummary, stagedIssueSummary }}
 */
export function runEvaluation(caseId, options = {}) {
  const mode = options.mode || 'mock';

  if (mode !== 'mock') {
    throw new Error(
      `runEvaluation: mode "${mode}" is not supported. ` +
      `This function only runs mock evaluations. ` +
      `For live evaluation use scripts/run-eval-live.mjs with explicit approval and cost confirmation.`
    );
  }

  const now       = options.now || new Date().toISOString();
  const evalRunId = options.evalRunId || newEvalRunId();
  const evalCase  = loadCase(caseId);
  const store     = createEvalStore(evalRunId, options.resultsDir || DEFAULT_RESULTS_DIR);

  // ── 1. Metadata and case ───────────────────────────────────────────────────
  store.write('metadata.json', {
    evalRunId,
    caseId,
    mode,
    generatedAt: now,
    paidApiCallsMade: false,
    adapterVersions: { baseline: 'baseline-v1', staged: 'staged-workflow-v1' },
    harnessVersion: '1.0.0',
  });
  store.write('test-case.json', evalCase);

  // ── 2. Run adapters ────────────────────────────────────────────────────────
  const baselineResult = runBaselineAdapter(evalCase, { mode });
  const stagedResult   = runStagedAdapter(evalCase, {
    mode,
    runBaseDir: options.runBaseDir,
    now,
  });

  // ── 3. Store raw outputs ───────────────────────────────────────────────────
  store.write('baseline/raw-output.json',  baselineResult.rawOutput);
  store.write('staged/raw-output.json',    stagedResult.rawOutput);
  store.write('baseline/metrics.json',     baselineResult.metrics);
  store.write('staged/metrics.json',       stagedResult.metrics);

  // ── 4. Normalize ───────────────────────────────────────────────────────────
  const baselineNorm = normalizeBaselineOutput(baselineResult.rawOutput);
  const stagedNorm   = normalizeStagedOutput(stagedResult.rawOutput);
  store.write('baseline/normalized-output.json', baselineNorm);
  store.write('staged/normalized-output.json',   stagedNorm);

  // ── 5. Deterministic checks ────────────────────────────────────────────────
  const baselineIssues = runDeterministicChecks(baselineNorm);
  const stagedIssues   = runDeterministicChecks(stagedNorm);
  store.write('baseline/issues.json', {
    issues: baselineIssues,
    summary: summarizeIssues(baselineIssues),
  });
  store.write('staged/issues.json', {
    issues: stagedIssues,
    summary: summarizeIssues(stagedIssues),
  });

  // ── 6. Comparison + summary ────────────────────────────────────────────────
  const comparison = buildComparison(
    baselineNorm, stagedNorm,
    baselineIssues, stagedIssues,
    baselineResult.metrics, stagedResult.metrics
  );
  store.write('comparison.json', comparison);
  store.write('summary.md', buildSummaryMd(
    evalRunId, caseId, evalCase, mode, now,
    baselineNorm, stagedNorm,
    baselineIssues, stagedIssues,
    baselineResult.metrics, stagedResult.metrics,
    comparison
  ));

  return {
    evalRunId,
    dir: store.dir,
    caseId,
    mode,
    baselineIssueSummary: summarizeIssues(baselineIssues),
    stagedIssueSummary:   summarizeIssues(stagedIssues),
  };
}

// ─── comparison builder ──────────────────────────────────────────────────────

function buildComparison(baselineNorm, stagedNorm, baselineIssues, stagedIssues, bMetrics, sMetrics) {
  const count = (obj, field) => (Array.isArray(obj[field]) ? obj[field].length : 'not_available');

  return {
    warning: 'ALL VALUES ARE FROM MOCK/SYNTHETIC DATA. No conclusions about AI quality can be drawn from this comparison.',
    structural: {
      sourceCount:            { baseline: count(baselineNorm, 'sources'),       staged: count(stagedNorm, 'sources') },
      candidateCount:         { baseline: count(baselineNorm, 'candidates'),    staged: count(stagedNorm, 'candidates') },
      signalCount:            { baseline: count(baselineNorm, 'marketSignals'), staged: count(stagedNorm, 'marketSignals') },
      claimCount:             { baseline: count(baselineNorm, 'claims'),        staged: count(stagedNorm, 'claims') },
      recommendationCount:    { baseline: count(baselineNorm, 'recommendations'), staged: count(stagedNorm, 'recommendations') },
      uncertaintyCount:       { baseline: count(baselineNorm, 'uncertainties'),   staged: count(stagedNorm, 'uncertainties') },
      humanVerificationItems: {
        baseline: baselineNorm.humanVerificationItems === 'not_available' ? 'not_available' : count(baselineNorm, 'humanVerificationItems'),
        staged:   count(stagedNorm, 'humanVerificationItems'),
      },
    },
    features: {
      hasStructuredScores:       { baseline: false, staged: Array.isArray(stagedNorm.opportunityScores) },
      hasSourceQualityTiers:     { baseline: false, staged: stagedNorm.sources.some((s) => s.qualityTier && s.qualityTier !== 'not_available') },
      hasSourcePublicationDates: { baseline: false, staged: stagedNorm.sources.some((s) => s.publicationDate && s.publicationDate !== 'not_available') },
      hasStageArtifacts:         { baseline: false, staged: stagedNorm.stageArtifacts !== 'not_available' },
      hasHumanVerificationGates: { baseline: false, staged: Array.isArray(stagedNorm.humanVerificationItems) },
      hasFactVsInterpretationSplit: { baseline: false, staged: true },
    },
    issues: {
      baseline: summarizeIssues(baselineIssues),
      staged:   summarizeIssues(stagedIssues),
    },
    metrics: {
      latencyMs:     { baseline: bMetrics.latencyMs,    staged: sMetrics.latencyMs },
      modelCalls:    { baseline: bMetrics.modelCalls,   staged: sMetrics.modelCalls },
      searchCalls:   { baseline: bMetrics.searchCalls,  staged: sMetrics.searchCalls },
      costUsd:       { baseline: bMetrics.estimatedCostUsd, staged: sMetrics.estimatedCostUsd },
      realApiCalls:  { baseline: bMetrics.realApiCallMade,  staged: sMetrics.realApiCallMade },
    },
    dimensionsRequiringHumanReview: [
      'factual accuracy — do claims match what sources actually say?',
      'relevance — do signals and candidates fit the eval case expected characteristics?',
      'candidate usefulness — are the listed organisations real, reachable, and in-scope?',
      'ranking logic — is every score backed by specific evidence?',
      'actionability — are recommended next steps concrete and non-outreach?',
      'uncertainty handling — are gaps surfaced rather than hidden?',
      'source quality judgment — are sources Tier A/B, or vendor self-promotion?',
    ],
    humanReview: {
      status: 'pending',
      scores: null,
      note: 'Run `npm run eval:review -- --run <evalRunId>` to enter reviewer scores.',
    },
  };
}

// ─── summary markdown ────────────────────────────────────────────────────────

function buildSummaryMd(evalRunId, caseId, evalCase, mode, now, bNorm, sNorm, bIssues, sIssues, bMeta, sMeta, comp) {
  const pct = (n, d) => (d === 0 ? 'n/a' : `${Math.round((n / d) * 100)}%`);
  const issueRow = (label, issues) => {
    const s = summarizeIssues(issues);
    return `| ${label} | ${s.errors} errors | ${s.warnings} warnings | ${s.infos} info |`;
  };

  const bSrc = comp.structural.sourceCount.baseline;
  const sSrc = comp.structural.sourceCount.staged;
  const bCnd = comp.structural.candidateCount.baseline;
  const sCnd = comp.structural.candidateCount.staged;
  const bSig = comp.structural.signalCount.baseline;
  const sSig = comp.structural.signalCount.staged;
  const bRec = comp.structural.recommendationCount.baseline;
  const sRec = comp.structural.recommendationCount.staged;
  const bUnc = comp.structural.uncertaintyCount.baseline;
  const sUnc = comp.structural.uncertaintyCount.staged;

  return `# Evaluation Summary

> **ALL CONTENT IS MOCK / SYNTHETIC.**
> No real API calls were made. These results validate evaluation infrastructure only.
> Do not draw quality conclusions from this run.

## Run details

| Field | Value |
|-------|-------|
| Eval run ID | \`${evalRunId}\` |
| Case | \`${caseId}\` — ${evalCase.title} |
| Mode | **${mode}** (mock — zero API spend) |
| Generated at | ${now} |
| Paid API calls | **NONE** |

## Case background

**Category:** ${evalCase.category}

**Input:** ${evalCase.input.targetMarket} · ${evalCase.input.targetCustomerType}

**Research objective:** ${evalCase.input.businessObjective}

**Evaluator notes:** ${evalCase.notes || '(none)'}

## Structural comparison (mock data only)

| Dimension | Baseline | Staged |
|-----------|:--------:|:------:|
| Sources | ${bSrc} | ${sSrc} |
| Candidates | ${bCnd} | ${sCnd} |
| Market signals | ${bSig} | ${sSig} |
| Recommendations | ${bRec} | ${sRec} |
| Uncertainties surfaced | ${bUnc} | ${sUnc} |
| Human verification items | ${comp.structural.humanVerificationItems.baseline} | ${comp.structural.humanVerificationItems.staged} |

## Feature comparison (structural, not quality)

| Feature | Baseline | Staged |
|---------|:--------:|:------:|
| Structured opportunity scores | ✗ | ✓ |
| Source quality tiers (A/B/C) | ✗ | ✓ |
| Source publication dates | ✗ | ✓ |
| Stage-by-stage artifacts | ✗ | ✓ |
| Human verification gates | ✗ | ✓ |
| Fact vs interpretation split | ✗ | ✓ |

## Deterministic check results

| Adapter | Errors | Warnings | Info |
|---------|--------|----------|------|
${issueRow('Baseline', bIssues)}
${issueRow('Staged',   sIssues)}

Errors = correctness violations. Warnings = quality concerns. Info = observations for human review.

## Dimensions requiring human review

The following cannot be measured automatically. Use the rubric at
\`evals/harness/rubric/rubric.md\` to score them:

${comp.dimensionsRequiringHumanReview.map((d) => `- ${d}`).join('\n')}

To record your scores: \`npm run eval:review -- --run ${evalRunId}\`

## What this run proves

- ✓ The eval harness runs without error
- ✓ Both adapters produce structured output
- ✓ Both outputs normalize to a comparable structure
- ✓ Deterministic checks run on both outputs
- ✓ Comparison and this summary file are produced
- ✓ No paid API calls occurred
- ✓ Results are stored in \`evals/results/\` (git-ignored)

## What this run does NOT prove

- ✗ Anything about real AI output quality
- ✗ Which architecture produces better market intelligence
- ✗ Whether the staged workflow beats the baseline on quality dimensions

**A live comparison with real API calls is required for quality conclusions.**
Run \`npm run eval:live -- --case ${caseId} --mode cheap\` and confirm when prompted.
`;
}
