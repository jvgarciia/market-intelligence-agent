/**
 * evals/harness/normalize/index.mjs — entry point for the normalization layer.
 *
 * Routes to the right normalizer based on adapter name. Adding a new adapter
 * means adding one import and one branch here.
 */

export { normalizeBaselineOutput, NOT_AVAILABLE } from './baseline.mjs';
export { normalizeStagedOutput } from './staged.mjs';

import { normalizeBaselineOutput } from './baseline.mjs';
import { normalizeStagedOutput } from './staged.mjs';

/**
 * Normalize the raw output from any supported adapter.
 *
 * @param {'baseline' | 'staged'} adapterName
 * @param {object} rawOutput
 * @returns {object} normalized output
 */
export function normalize(adapterName, rawOutput) {
  if (adapterName === 'baseline') return normalizeBaselineOutput(rawOutput);
  if (adapterName === 'staged')   return normalizeStagedOutput(rawOutput);
  throw new Error(
    `normalize: unknown adapter "${adapterName}". Supported: baseline, staged. ` +
    `Register new adapters in evals/harness/normalize/index.mjs.`
  );
}
