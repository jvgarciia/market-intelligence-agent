/**
 * lib/workflow/runWorkflowLocal.mjs — async orchestrator for local-cli mode.
 *
 * Runs Stage 01 (market signals) live using the local Claude Code CLI, then
 * stops. Stages 02–05 are not run — they remain mock-only until Stage 01
 * quality is validated by the human review gate and the eval harness.
 *
 * This is a separate export from runWorkflow.mjs (which handles mock-only runs)
 * so the existing sync mock path is untouched.
 *
 * Run status after completion: "stage_01_completed" + "awaiting_review".
 * The human uses `npm run workflow:review -- --run <run-id>` to inspect and
 * approve or reject before any further stages are wired.
 */

import { assertArtifact } from './schemas.mjs';
import { createRunStore, newRunId } from './runStore.mjs';
import { runStage01 } from './stage01.mjs';
import * as localCliProvider from './providers/localCli.mjs';

const SCHEMA_VERSION = '1.0.0';

/**
 * Run the Market Opportunity workflow through Stage 01 using the local CLI.
 *
 * @param {object} input — same shape as runWorkflow(): targetMarket, etc.
 * @param {object} [options]
 *   baseDir   string  — override runs/ directory (for tests)
 *   now       string  — fixed ISO timestamp (for tests)
 *   _provider object  — override the provider (for tests)
 * @returns {Promise<{ runId, dir, files, status, awaitingReview }>}
 */
export async function runWorkflowLocal(input, options = {}) {
  const provider = options._provider || localCliProvider;
  const createdAt = options.now || new Date().toISOString();
  const runId = input.runId || newRunId();

  // Validate the run request using the same schema as mock mode.
  const request = assertArtifact('run-request', {
    runId,
    targetMarket: input.targetMarket,
    targetCustomerType: input.targetCustomerType,
    solutionDescription: input.solutionDescription,
    businessObjective: input.businessObjective,
    constraints: input.constraints || [],
    mode: 'local-cli',
    createdAt,
  });

  const store = createRunStore(runId, options.baseDir);
  store.writeJson('request.json', request);

  // ── Stage 01: Market Signals ───────────────────────────────────────────────

  let stage01Result;
  let stageFailed = false;
  let stageError = null;

  try {
    stage01Result = await runStage01(request, provider);
  } catch (err) {
    stageFailed = true;
    stageError = err.message;
    // Write a failure record so the reviewer can inspect what went wrong.
    store.writeJson('01-stage-failure.json', {
      stage: 'market-signals',
      error: stageError,
      failedAt: new Date().toISOString(),
    });
  }

  // ── Persist artifacts ──────────────────────────────────────────────────────

  const stagesCompleted = [];

  if (!stageFailed) {
    store.writeJson('00-sources.json', stage01Result.sources);
    store.writeJson('01-market-signals.json', stage01Result.signals);

    // Raw provider output — inspectable by the developer, never sent anywhere.
    store.writeJson('01-raw-output.json', {
      provider: stage01Result.meta.provider,
      model: stage01Result.meta.model,
      latencyMs: stage01Result.meta.latencyMs,
      startedAt: stage01Result.meta.startedAt,
      completedAt: stage01Result.meta.completedAt,
      usage: stage01Result.meta.usage,
      toolActivity: stage01Result.meta.toolActivity,
      warnings: stage01Result.meta.warnings,
      rejectedSignals: stage01Result.meta.rejectedCount,
      rawContent: stage01Result.meta.rawContent,
      rawProviderOutput: stage01Result.meta.rawProviderOutput,
    });

    stagesCompleted.push('market-signals');
  }

  // ── Metadata ───────────────────────────────────────────────────────────────

  const completedAt = options.now || new Date().toISOString();

  const hasInsufficientEvidence =
    !stageFailed &&
    (stage01Result.signals.length === 0 || stage01Result.sources.length === 0);

  const runStatus = stageFailed
    ? 'stage_01_failed'
    : hasInsufficientEvidence
      ? 'stage_01_insufficient_evidence'
      : 'stage_01_completed';

  const awaitingReview = !stageFailed && !hasInsufficientEvidence;

  const metadata = assertArtifact('run-metadata', {
    runId,
    workflow: 'market-opportunity',
    mode: 'local-cli',
    createdAt,
    completedAt,
    stagesCompleted,
    schemaVersion: SCHEMA_VERSION,
    reviewGates: { gate1: 'pending', gate2: 'pending' },
  });
  store.writeJson('metadata.json', metadata);

  // ── Review gate ────────────────────────────────────────────────────────────
  // A machine-readable record of the gate state. The review CLI reads and
  // updates this. Approval does not trigger Stage 02 yet.

  store.writeJson('review-gate.json', {
    runId,
    stage: 'market-signals',
    status: runStatus,
    awaitingReview,
    stageError: stageError || null,
    decision: null,
    note: null,
    decidedAt: null,
  });

  const files = store.list();

  if (stageFailed) {
    const err = new Error(
      `Stage 01 failed: ${stageError}\n` +
      `Run artifacts preserved at: ${store.dir}`
    );
    err.runId = runId;
    err.dir = store.dir;
    err.files = files;
    throw err;
  }

  return {
    runId,
    dir: store.dir,
    files,
    status: runStatus,
    awaitingReview,
    signalCount: stage01Result.signals.length,
    sourceCount: stage01Result.sources.length,
  };
}
