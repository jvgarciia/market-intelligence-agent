/**
 * lib/workflow/runStage05Local.mjs — live Stage 05 for an already-approved run.
 *
 * Like runStage04Local.mjs, this opens an EXISTING run folder and continues it.
 * It refuses to run unless:
 *   1. Stage 01 was explicitly approved via `npm run workflow:review`, and
 *   2. Stage 04 (opportunity-scoring) has actually completed for this run.
 *
 * (Stage 04 already hard-required Review Gate 1 to be approved before it
 * would run, so if opportunity-scoring completed, Gate 1 is implicitly clear.)
 *
 * Stage 05 is itself Review Gate 2 (per 05_opportunity-brief/CONTEXT.md): a
 * person confirms the fact/interpretation split and every flagged
 * verification item before any brief is treated as final. This module does
 * not record that gate decision (metadata.json → reviewGates.gate2 stays
 * "pending"); it only produces the artifacts to review.
 */

import { assertArtifact } from './schemas.mjs';
import { createRunStore } from './runStore.mjs';
import { runStage05, renderBriefsMarkdown } from './stage05.mjs';
import * as localCliProvider from './providers/localCli.mjs';

const SCHEMA_VERSION = '1.0.0';

/**
 * Continue an existing run into Stage 05 using the local CLI.
 *
 * @param {string} runId — an existing run folder under runs/
 * @param {object} [options]
 *   baseDir   string  — override runs/ directory (for tests)
 *   now       string  — fixed ISO timestamp (for tests)
 *   _provider object  — override the provider (for tests)
 * @returns {Promise<{ runId, dir, files, status, briefedCount, droppedCount }>}
 */
export async function runStage05Local(runId, options = {}) {
  const provider = options._provider || localCliProvider;
  const store = createRunStore(runId, options.baseDir);

  // ── precondition: Stage 01 approved, Stage 04 completed ────────────────────

  let gate;
  try {
    gate = store.readJson('review-gate.json');
  } catch {
    throw new Error(
      `Stage 05: no review-gate.json found for run ${runId}. ` +
      'Run Stage 01 first with `npm run workflow:local`.'
    );
  }

  if (gate.decision !== 'approve') {
    throw new Error(
      `Stage 05: run ${runId} has not been approved (decision: ${gate.decision || 'none'}). ` +
      'Review and approve Stage 01 first: npm run workflow:review -- --run ' + runId + ' --decision approve'
    );
  }

  const existingMetadata = store.readJson('metadata.json');
  if (!existingMetadata.stagesCompleted.includes('opportunity-scoring')) {
    throw new Error(
      `Stage 05: run ${runId} has not completed Stage 04 (opportunity-scoring) yet. ` +
      'Run Stage 04 first: npm run workflow:stage04 -- --run ' + runId
    );
  }

  const request = store.readJson('request.json');
  const candidates = store.readJson('02-candidates.json');
  const { validated } = store.readJson('03-validation.json');
  const scores = store.readJson('04-scores.json');

  // ── Stage 05: Opportunity Brief ─────────────────────────────────────────────

  let stage05Result;
  let stageFailed = false;
  let stageError = null;

  try {
    stage05Result = await runStage05(request, candidates, validated, scores, provider);
  } catch (err) {
    stageFailed = true;
    stageError = err.message;
    store.writeJson('05-stage-failure.json', {
      stage: 'opportunity-brief',
      error: stageError,
      failedAt: new Date().toISOString(),
    });
  }

  if (stageFailed) {
    const err = new Error(
      `Stage 05 failed: ${stageError}\n` +
      `Run artifacts preserved at: ${store.dir}`
    );
    err.runId = runId;
    err.dir = store.dir;
    err.files = store.list();
    throw err;
  }

  // ── Persist artifacts ──────────────────────────────────────────────────────

  store.writeJson('05-briefs.json', stage05Result.briefs);
  store.writeText('05-brief.md', renderBriefsMarkdown(stage05Result.briefs, request));

  store.writeJson('05-raw-output.json', {
    provider: stage05Result.meta.provider,
    model: stage05Result.meta.model,
    latencyMs: stage05Result.meta.latencyMs,
    startedAt: stage05Result.meta.startedAt,
    completedAt: stage05Result.meta.completedAt,
    usage: stage05Result.meta.usage,
    toolActivity: stage05Result.meta.toolActivity,
    warnings: stage05Result.meta.warnings,
    droppedItems: stage05Result.meta.droppedCount,
    rawContent: stage05Result.meta.rawContent,
    rawProviderOutput: stage05Result.meta.rawProviderOutput,
  });

  // ── Update metadata ─────────────────────────────────────────────────────────

  const completedAt = options.now || new Date().toISOString();
  const stagesCompleted = existingMetadata.stagesCompleted.includes('opportunity-brief')
    ? existingMetadata.stagesCompleted
    : [...existingMetadata.stagesCompleted, 'opportunity-brief'];

  const metadata = assertArtifact('run-metadata', {
    ...existingMetadata,
    completedAt,
    stagesCompleted,
    schemaVersion: SCHEMA_VERSION,
  });
  store.writeJson('metadata.json', metadata);

  const hasNoBriefs = stage05Result.briefs.length === 0;

  return {
    runId,
    dir: store.dir,
    files: store.list(),
    status: hasNoBriefs ? 'stage_05_no_briefs' : 'stage_05_completed',
    briefedCount: stage05Result.briefs.length,
    droppedCount: stage05Result.meta.droppedCount,
  };
}
