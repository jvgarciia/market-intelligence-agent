/**
 * lib/workflow/runStage02Local.mjs — live Stage 02 for an already-approved run.
 *
 * Unlike runWorkflowLocal.mjs (which starts a brand-new run at Stage 01), this
 * opens an EXISTING run folder and continues it into Stage 02. It refuses to
 * run unless that run's Stage 01 output was explicitly approved via
 * `npm run workflow:review` — Stage 02 must never be built on unreviewed or
 * rejected market signals.
 *
 * Stage 02 does not get its own ad-hoc review gate the way Stage 01 did: per
 * `02_candidate-discovery/CONTEXT.md`, the real human checkpoint (Review Gate 1)
 * comes after Stage 03. This just records that candidate-discovery ran and
 * leaves reviewGates.gate1 pending until Stage 03 exists.
 */

import { assertArtifact } from './schemas.mjs';
import { createRunStore } from './runStore.mjs';
import { runStage02 } from './stage02.mjs';
import * as localCliProvider from './providers/localCli.mjs';

const SCHEMA_VERSION = '1.0.0';

/**
 * Continue an existing run into Stage 02 using the local CLI.
 *
 * @param {string} runId — an existing run folder under runs/
 * @param {object} [options]
 *   baseDir   string  — override runs/ directory (for tests)
 *   now       string  — fixed ISO timestamp (for tests)
 *   _provider object  — override the provider (for tests)
 * @returns {Promise<{ runId, dir, files, status, candidateCount }>}
 */
export async function runStage02Local(runId, options = {}) {
  const provider = options._provider || localCliProvider;
  const store = createRunStore(runId, options.baseDir);

  // ── precondition: Stage 01 must exist and be explicitly approved ───────────

  let gate;
  try {
    gate = store.readJson('review-gate.json');
  } catch {
    throw new Error(
      `Stage 02: no review-gate.json found for run ${runId}. ` +
      'Run Stage 01 first with `npm run workflow:local`.'
    );
  }

  if (gate.decision !== 'approve') {
    throw new Error(
      `Stage 02: run ${runId} has not been approved (decision: ${gate.decision || 'none'}). ` +
      'Review and approve Stage 01 first: npm run workflow:review -- --run ' + runId + ' --decision approve'
    );
  }

  const request = store.readJson('request.json');
  const sources = store.readJson('00-sources.json');
  const signals = store.readJson('01-market-signals.json');

  // ── Stage 02: Candidate Discovery ───────────────────────────────────────────

  let stage02Result;
  let stageFailed = false;
  let stageError = null;

  try {
    stage02Result = await runStage02(request, sources, signals, provider);
  } catch (err) {
    stageFailed = true;
    stageError = err.message;
    store.writeJson('02-stage-failure.json', {
      stage: 'candidate-discovery',
      error: stageError,
      failedAt: new Date().toISOString(),
    });
  }

  if (stageFailed) {
    const err = new Error(
      `Stage 02 failed: ${stageError}\n` +
      `Run artifacts preserved at: ${store.dir}`
    );
    err.runId = runId;
    err.dir = store.dir;
    err.files = store.list();
    throw err;
  }

  // ── Persist artifacts ──────────────────────────────────────────────────────

  store.writeJson('02-candidates.json', stage02Result.candidates);

  store.writeJson('02-raw-output.json', {
    provider: stage02Result.meta.provider,
    model: stage02Result.meta.model,
    latencyMs: stage02Result.meta.latencyMs,
    startedAt: stage02Result.meta.startedAt,
    completedAt: stage02Result.meta.completedAt,
    usage: stage02Result.meta.usage,
    toolActivity: stage02Result.meta.toolActivity,
    warnings: stage02Result.meta.warnings,
    rejectedCandidates: stage02Result.meta.rejectedCount,
    rawContent: stage02Result.meta.rawContent,
    rawProviderOutput: stage02Result.meta.rawProviderOutput,
  });

  // ── Update metadata ─────────────────────────────────────────────────────────

  const existingMetadata = store.readJson('metadata.json');
  const completedAt = options.now || new Date().toISOString();
  const stagesCompleted = existingMetadata.stagesCompleted.includes('candidate-discovery')
    ? existingMetadata.stagesCompleted
    : [...existingMetadata.stagesCompleted, 'candidate-discovery'];

  const metadata = assertArtifact('run-metadata', {
    ...existingMetadata,
    completedAt,
    stagesCompleted,
    schemaVersion: SCHEMA_VERSION,
  });
  store.writeJson('metadata.json', metadata);

  const hasNoCandidates = stage02Result.candidates.length === 0;

  return {
    runId,
    dir: store.dir,
    files: store.list(),
    status: hasNoCandidates ? 'stage_02_no_candidates_found' : 'stage_02_completed',
    candidateCount: stage02Result.candidates.length,
  };
}
