/**
 * evals/harness/ids.mjs — unique, sortable evaluation run IDs.
 *
 * Mirrors the same pattern as lib/workflow/runStore.mjs (timestamp + short UUID)
 * so eval results sort chronologically alongside workflow runs.
 */

import { randomUUID } from 'node:crypto';

export function newEvalRunId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `eval-${stamp}__${randomUUID().slice(0, 8)}`;
}
