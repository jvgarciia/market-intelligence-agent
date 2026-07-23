/**
 * lib/workflow/runStage03Local.mjs — live Stage 03 for an already-approved run.
 *
 * Like runStage02Local.mjs, this opens an EXISTING run folder and continues it.
 * It refuses to run unless:
 *   1. Stage 01 was explicitly approved via `npm run workflow:review`, and
 *   2. Stage 02 (candidate-discovery) has actually completed for this run.
 *
 * Per `03_evidence-validation/CONTEXT.md`, this stage completes Review Gate 1 —
 * a person should open 02-candidates.json and 03-validation.json together and
 * confirm the result is honest before Stage 04 scores anything on top of it.
 * This module does not record that gate decision itself (metadata.json →
 * reviewGates.gate1 stays "pending"); it only produces the artifacts to review.
 */

import { assertArtifact } from './schemas.mjs';
import { createRunStore } from './runStore.mjs';
import { runStage03 } from './stage03.mjs';
import * as localCliProvider from './providers/localCli.mjs';

const SCHEMA_VERSION = '1.0.0';

/**
 * Continue an existing run into Stage 03 using the local CLI.
 *
 * @param {string} runId — an existing run folder under runs/
 * @param {object} [options]
 *   baseDir   string  — override runs/ directory (for tests)
 *   now       string  — fixed ISO timestamp (for tests)
 *   _provider object  — override the provider (for tests)
 * @returns {Promise<{ runId, dir, files, status, validatedCount, rejectedCount }>}
 */
export async function runStage03Local(runId, options = {}) {
  const provider = options._provider || localCliProvider;
  const store = createRunStore(runId, options.baseDir);

  // ── precondition: Stage 01 must be approved, Stage 02 must have run ────────

  let gate;
  try {
    gate = store.readJson('review-gate.json');
  } catch {
    throw new Error(
      `Stage 03: no review-gate.json found for run ${runId}. ` +
      'Run Stage 01 first with `npm run workflow:local`.'
    );
  }

  if (gate.decision !== 'approve') {
    throw new Error(
      `Stage 03: run ${runId} has not been approved (decision: ${gate.decision || 'none'}). ` +
      'Review and approve Stage 01 first: npm run workflow:review -- --run ' + runId + ' --decision approve'
    );
  }

  const existingMetadata = store.readJson('metadata.json');
  if (!existingMetadata.stagesCompleted.includes('candidate-discovery')) {
    throw new Error(
      `Stage 03: run ${runId} has not completed Stage 02 (candidate-discovery) yet. ` +
      'Run Stage 02 first: npm run workflow:stage02 -- --run ' + runId
    );
  }

  const request = store.readJson('request.json');
  const sources = store.readJson('00-sources.json');
  const signals = store.readJson('01-market-signals.json');
  const candidates = store.readJson('02-candidates.json');

  // ── Stage 03: Evidence Validation ───────────────────────────────────────────

  let stage03Result;
  let stageFailed = false;
  let stageError = null;

  try {
    stage03Result = await runStage03(request, sources, signals, candidates, provider);
  } catch (err) {
    stageFailed = true;
    stageError = err.message;
    store.writeJson('03-stage-failure.json', {
      stage: 'evidence-validation',
      error: stageError,
      failedAt: new Date().toISOString(),
    });
  }

  if (stageFailed) {
    const err = new Error(
      `Stage 03 failed: ${stageError}\n` +
      `Run artifacts preserved at: ${store.dir}`
    );
    err.runId = runId;
    err.dir = store.dir;
    err.files = store.list();
    throw err;
  }

  // ── Persist artifacts ──────────────────────────────────────────────────────

  store.writeJson('03-validation.json', {
    validated: stage03Result.validated,
    rejected: stage03Result.rejected,
  });

  store.writeJson('03-raw-output.json', {
    provider: stage03Result.meta.provider,
    model: stage03Result.meta.model,
    latencyMs: stage03Result.meta.latencyMs,
    startedAt: stage03Result.meta.startedAt,
    completedAt: stage03Result.meta.completedAt,
    usage: stage03Result.meta.usage,
    toolActivity: stage03Result.meta.toolActivity,
    warnings: stage03Result.meta.warnings,
    droppedItems: stage03Result.meta.rejectedCount,
    rawContent: stage03Result.meta.rawContent,
    rawProviderOutput: stage03Result.meta.rawProviderOutput,
  });

  // ── Update metadata ─────────────────────────────────────────────────────────

  const completedAt = options.now || new Date().toISOString();
  const stagesCompleted = existingMetadata.stagesCompleted.includes('evidence-validation')
    ? existingMetadata.stagesCompleted
    : [...existingMetadata.stagesCompleted, 'evidence-validation'];

  const metadata = assertArtifact('run-metadata', {
    ...existingMetadata,
    completedAt,
    stagesCompleted,
    schemaVersion: SCHEMA_VERSION,
  });
  store.writeJson('metadata.json', metadata);

  const hasNoValidatedEvidence = stage03Result.validated.length === 0;

  return {
    runId,
    dir: store.dir,
    files: store.list(),
    status: hasNoValidatedEvidence ? 'stage_03_no_evidence_validated' : 'stage_03_completed',
    validatedCount: stage03Result.validated.length,
    rejectedCount: stage03Result.rejected.length,
  };
}
