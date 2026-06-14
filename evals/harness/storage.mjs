/**
 * evals/harness/storage.mjs — write and read evaluation run artifacts.
 *
 * Each evaluation run gets a directory under evals/results/<evalRunId>/ with a
 * fixed structure (metadata, test-case, baseline/, staged/, comparison, summary).
 * This mirrors runStore.mjs in philosophy: a thin filesystem wrapper that is easy
 * to swap for a database later without touching eval logic.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RESULTS_DIR = join(here, '..', 'results');

/**
 * Create (or open) an eval run directory and return a writer/reader for it.
 *
 * Directory layout:
 *   <evalRunId>/
 *     metadata.json
 *     test-case.json
 *     baseline/
 *       raw-output.json
 *       normalized-output.json
 *       metrics.json
 *       issues.json
 *     staged/
 *       raw-output.json
 *       normalized-output.json
 *       metrics.json
 *       issues.json
 *     comparison.json
 *     summary.md
 *     human-review.json  (added after reviewer scores)
 */
export function createEvalStore(evalRunId, baseDir = DEFAULT_RESULTS_DIR) {
  const dir = join(baseDir, evalRunId);
  mkdirSync(join(dir, 'baseline'), { recursive: true });
  mkdirSync(join(dir, 'staged'), { recursive: true });

  return {
    evalRunId,
    dir,
    write(relativePath, data) {
      const file = join(dir, relativePath);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n';
      writeFileSync(file, content);
      return file;
    },
    read(relativePath) {
      return JSON.parse(readFileSync(join(dir, relativePath), 'utf8'));
    },
    exists(relativePath) {
      return existsSync(join(dir, relativePath));
    },
  };
}
