/**
 * evals/harness/adapters/staged.mjs — wraps the staged Market Opportunity
 * workflow for evaluation.
 *
 * In mock mode: calls runWorkflow() with mode='mock'. The workflow produces
 * schema-validated, deterministic artifacts for all five stages at zero API cost.
 * The adapter reads those artifacts back from disk and packages them for the
 * normalizer and check layers.
 *
 * In live modes: throws a clear error. Use scripts/run-eval-live.mjs after
 * explicit approval — it will wire up the live stage execution once it is built.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runWorkflow } from '../../../lib/workflow/runWorkflow.mjs';

const ADAPTER_NAME = 'staged-workflow-v1';

/**
 * Run the staged workflow adapter for an eval case.
 *
 * @param {object} evalCase      — a loaded evals/cases/*.json object
 * @param {object} options       — { mode: 'mock', runBaseDir?: string, now?: string }
 *   runBaseDir: overrides the runs/ directory (used in tests to write to a temp dir)
 *   now:        fixed timestamp for determinism in tests
 * @returns {{ rawOutput: object, metrics: object }}
 */
export function runStagedAdapter(evalCase, options = {}) {
  const mode = options.mode || 'mock';

  if (mode !== 'mock') {
    throw new Error(
      `StagedWorkflowAdapter: mode "${mode}" requires real Anthropic API calls. ` +
      `Only mock mode is supported here. ` +
      `Use scripts/run-eval-live.mjs with explicit confirmation to run a live evaluation.`
    );
  }

  const startMs = Date.now();
  const result = runWorkflow(evalCase.input, {
    mode: 'mock',
    baseDir: options.runBaseDir,
    now: options.now,
  });
  const latencyMs = Date.now() - startMs;

  // Read all JSON artifacts back from the run directory so the normalizer
  // has access to them without needing to know the runs/ path.
  const artifacts = {};
  for (const file of result.files) {
    if (file.endsWith('.json')) {
      try {
        artifacts[file] = JSON.parse(readFileSync(join(result.dir, file), 'utf8'));
      } catch (err) {
        artifacts[file] = { _readError: err.message };
      }
    }
  }

  const stagesCompleted = artifacts['metadata.json']?.stagesCompleted || [];

  return {
    rawOutput: {
      runId: result.runId,
      dir: result.dir,
      files: result.files,
      artifacts,
    },
    metrics: {
      latencyMs,
      modelCalls: 0,
      searchCalls: 0,
      stagesCompleted,
      stageCount: stagesCompleted.length,
      inputTokens: 'not_available',
      outputTokens: 'not_available',
      estimatedCostUsd: 0.00,
      realApiCallMade: false,
      mode,
      adapterName: ADAPTER_NAME,
    },
  };
}
