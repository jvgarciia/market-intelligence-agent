/**
 * evals/harness/adapters/local-stage01.mjs — evaluation adapter for local
 * Stage 01 runs.
 *
 * Runs the Stage 01 local-cli workflow for an eval case and returns metrics in
 * a shape comparable to the staged mock adapter. Called only from
 * scripts/run-eval-local-stage01.mjs — never from npm run eval:mock.
 *
 * This adapter MAKES REAL LOCAL CALLS via the Claude Code CLI.
 * It uses your subscription allowance, not metered API billing.
 * It never runs automatically — only with explicit user confirmation.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runWorkflowLocal } from '../../../lib/workflow/runWorkflowLocal.mjs';

const ADAPTER_NAME = 'local-stage01-v1';

/**
 * Run Stage 01 via the local CLI for an eval case.
 *
 * @param {object} evalCase      — a loaded evals/cases/*.json object
 * @param {object} options       — { runBaseDir?: string, now?: string }
 * @returns {Promise<{ rawOutput: object, metrics: object }>}
 */
export async function runLocalStage01Adapter(evalCase, options = {}) {
  const startMs = Date.now();

  const result = await runWorkflowLocal(evalCase.input, {
    baseDir: options.runBaseDir,
    now: options.now,
  });

  const latencyMs = Date.now() - startMs;

  // Read Stage 01 artifacts back for evaluation
  const artifacts = {};
  const artifactNames = ['00-sources.json', '01-market-signals.json', '01-raw-output.json', 'metadata.json', 'review-gate.json'];
  for (const name of artifactNames) {
    try {
      artifacts[name] = JSON.parse(readFileSync(join(result.dir, name), 'utf8'));
    } catch {
      artifacts[name] = null;
    }
  }

  const rawOutput = artifacts['01-raw-output.json'] || {};

  return {
    rawOutput: {
      runId: result.runId,
      dir: result.dir,
      files: result.files,
      status: result.status,
      artifacts,
    },
    metrics: {
      latencyMs,
      modelCalls: 1,
      searchCalls: rawOutput.toolActivity === 'not_available' ? 'not_available' : 0,
      signalCount: result.signalCount,
      sourceCount: result.sourceCount,
      stagesCompleted: ['market-signals'],
      stageCount: 1,
      inputTokens: rawOutput.usage?.inputTokens || 'not_available',
      outputTokens: rawOutput.usage?.outputTokens || 'not_available',
      // Local-cli runs use subscription allowance, not the metered API.
      // We cannot report cost because subscription pricing is per-seat, not per-call.
      estimatedApiCost: 'not_applicable',
      subscriptionUsage: 'not_available',
      realApiCallMade: true,
      localCliCallMade: true,
      provider: rawOutput.provider || 'local-cli',
      model: rawOutput.model || 'not_available',
      warnings: rawOutput.warnings || [],
      rejectedSignals: rawOutput.rejectedSignals || 0,
      adapterName: ADAPTER_NAME,
    },
  };
}
