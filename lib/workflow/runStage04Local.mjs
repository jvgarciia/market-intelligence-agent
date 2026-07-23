/**
 * lib/workflow/runStage04Local.mjs — live Stage 04 for an already-approved run.
 *
 * Like runStage03Local.mjs, this opens an EXISTING run folder and continues it.
 * It refuses to run unless:
 *   1. Stage 01 was explicitly approved via `npm run workflow:review`,
 *   2. Stage 03 (evidence-validation) has actually completed for this run, and
 *   3. Review Gate 1 has been recorded as "approved" in metadata.json.
 *
 * Gate 1 is Stage 03's human checkpoint (per 03_evidence-validation/CONTEXT.md):
 * a person reviews 02-candidates.json + 03-validation.json together before any
 * score builds on top of that evidence. Stage 04 enforces that gate in code —
 * unlike Stage 02→03, which only checks the prior stage's completion — because
 * scores are the first artifact a human might act on directly.
 */

import { assertArtifact } from './schemas.mjs';
import { createRunStore } from './runStore.mjs';
import { runStage04 } from './stage04.mjs';
import * as localCliProvider from './providers/localCli.mjs';

const SCHEMA_VERSION = '1.0.0';

/**
 * Continue an existing run into Stage 04 using the local CLI.
 *
 * @param {string} runId — an existing run folder under runs/
 * @param {object} [options]
 *   baseDir   string  — override runs/ directory (for tests)
 *   now       string  — fixed ISO timestamp (for tests)
 *   _provider object  — override the provider (for tests)
 * @returns {Promise<{ runId, dir, files, status, scoredCount, droppedCount }>}
 */
export async function runStage04Local(runId, options = {}) {
  const provider = options._provider || localCliProvider;
  const store = createRunStore(runId, options.baseDir);

  // ── precondition: Stage 01 approved, Stage 03 completed, Gate 1 approved ───

  let gate;
  try {
    gate = store.readJson('review-gate.json');
  } catch {
    throw new Error(
      `Stage 04: no review-gate.json found for run ${runId}. ` +
      'Run Stage 01 first with `npm run workflow:local`.'
    );
  }

  if (gate.decision !== 'approve') {
    throw new Error(
      `Stage 04: run ${runId} has not been approved (decision: ${gate.decision || 'none'}). ` +
      'Review and approve Stage 01 first: npm run workflow:review -- --run ' + runId + ' --decision approve'
    );
  }

  const existingMetadata = store.readJson('metadata.json');
  if (!existingMetadata.stagesCompleted.includes('evidence-validation')) {
    throw new Error(
      `Stage 04: run ${runId} has not completed Stage 03 (evidence-validation) yet. ` +
      'Run Stage 03 first: npm run workflow:stage03 -- --run ' + runId
    );
  }

  if (existingMetadata.reviewGates?.gate1 !== 'approved') {
    throw new Error(
      `Stage 04: run ${runId} has not passed Review Gate 1 yet ` +
      `(reviewGates.gate1: ${existingMetadata.reviewGates?.gate1 || 'unknown'}). ` +
      'Review 02-candidates.json + 03-validation.json together, then set ' +
      'metadata.json → reviewGates.gate1 to "approved" before scoring.'
    );
  }

  const request = store.readJson('request.json');
  const candidates = store.readJson('02-candidates.json');
  const { validated } = store.readJson('03-validation.json');

  // ── Stage 04: Opportunity Scoring ───────────────────────────────────────────

  let stage04Result;
  let stageFailed = false;
  let stageError = null;

  try {
    stage04Result = await runStage04(request, candidates, validated, provider);
  } catch (err) {
    stageFailed = true;
    stageError = err.message;
    store.writeJson('04-stage-failure.json', {
      stage: 'opportunity-scoring',
      error: stageError,
      failedAt: new Date().toISOString(),
    });
  }

  if (stageFailed) {
    const err = new Error(
      `Stage 04 failed: ${stageError}\n` +
      `Run artifacts preserved at: ${store.dir}`
    );
    err.runId = runId;
    err.dir = store.dir;
    err.files = store.list();
    throw err;
  }

  // ── Persist artifacts ──────────────────────────────────────────────────────

  store.writeJson('04-scores.json', stage04Result.scores);

  store.writeJson('04-raw-output.json', {
    provider: stage04Result.meta.provider,
    model: stage04Result.meta.model,
    latencyMs: stage04Result.meta.latencyMs,
    startedAt: stage04Result.meta.startedAt,
    completedAt: stage04Result.meta.completedAt,
    usage: stage04Result.meta.usage,
    toolActivity: stage04Result.meta.toolActivity,
    warnings: stage04Result.meta.warnings,
    droppedItems: stage04Result.meta.droppedCount,
    rawContent: stage04Result.meta.rawContent,
    rawProviderOutput: stage04Result.meta.rawProviderOutput,
  });

  // ── Update metadata ─────────────────────────────────────────────────────────

  const completedAt = options.now || new Date().toISOString();
  const stagesCompleted = existingMetadata.stagesCompleted.includes('opportunity-scoring')
    ? existingMetadata.stagesCompleted
    : [...existingMetadata.stagesCompleted, 'opportunity-scoring'];

  const metadata = assertArtifact('run-metadata', {
    ...existingMetadata,
    completedAt,
    stagesCompleted,
    schemaVersion: SCHEMA_VERSION,
  });
  store.writeJson('metadata.json', metadata);

  const hasNoScores = stage04Result.scores.length === 0;

  return {
    runId,
    dir: store.dir,
    files: store.list(),
    status: hasNoScores ? 'stage_04_no_scores' : 'stage_04_completed',
    scoredCount: stage04Result.scores.length,
    droppedCount: stage04Result.meta.droppedCount,
  };
}
