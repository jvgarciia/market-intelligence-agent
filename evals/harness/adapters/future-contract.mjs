/**
 * evals/harness/adapters/future-contract.mjs — interface contract for future
 * multi-agent adapters.
 *
 * When a multi-agent variant is ready for evaluation, create a new adapter file
 * that follows ADAPTER_CONTRACT. The eval runner (run.mjs) accepts any adapter
 * that satisfies this shape — so a new architecture plugs in without changing
 * the harness.
 *
 * This file exists to:
 *   1. Document the contract in one place.
 *   2. Give the test suite something to import and verify against.
 *   3. Throw a clear error if someone accidentally calls the placeholder.
 */

export function runFutureMultiAgentAdapter(_evalCase, _options = {}) {
  throw new Error(
    'FutureMultiAgentAdapter: not implemented. ' +
    'This is a contract placeholder. Implement a real adapter before running evaluations. ' +
    'See ADAPTER_CONTRACT in this file for the required return shape.'
  );
}

/**
 * The shape every evaluation adapter must return.
 * Both existing adapters (baseline, staged) follow this contract.
 */
export const ADAPTER_CONTRACT = {
  description: 'Every eval adapter must return { rawOutput, metrics }.',
  fields: {
    rawOutput: 'object — the adapter\'s native output; structure varies per adapter',
    metrics: {
      latencyMs: 'number — wall-clock milliseconds from start to finish',
      modelCalls: 'number — AI model API calls made (0 in mock mode)',
      searchCalls: 'number — web search calls made (0 in mock mode)',
      inputTokens: 'number | "not_available"',
      outputTokens: 'number | "not_available"',
      estimatedCostUsd: 'number — 0.00 ONLY if realApiCallMade is false',
      realApiCallMade: 'boolean — must be false in mock mode, true if any paid call ran',
      mode: '"mock" | "cheap" | "full"',
      adapterName: 'string — unique name for this adapter version',
    },
  },
  safetyRules: [
    'Adapters must throw (not return an error object) when mode is not supported.',
    'estimatedCostUsd must be 0.00 when realApiCallMade is false.',
    'realApiCallMade must be true whenever any paid API call was attempted, even if it failed.',
    'Mock adapters must not make any network calls.',
  ],
};
