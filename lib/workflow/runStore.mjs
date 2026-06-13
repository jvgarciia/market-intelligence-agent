/**
 * lib/workflow/runStore.mjs — minimal run-artifact storage.
 *
 * Every run gets its own folder under runs/<run-id>/ where each stage writes an
 * inspectable file. This is deliberately a thin wrapper over the filesystem: it
 * is meant to be replaced by a database later without changing any stage code.
 * Stages only ever touch a run through this interface.
 *
 * Nothing here writes secrets — only the validated, non-sensitive artifacts the
 * stages produce.
 */

import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RUNS_DIR = join(here, '..', '..', 'runs');

/** A sortable, unique, filesystem-safe run id: timestamp + short uuid. */
export function newRunId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${stamp}__${randomUUID().slice(0, 8)}`;
}

/**
 * Create (or open) a run folder and return a small writer/reader for it.
 * @param {string} runId
 * @param {string} [baseDir] - override the runs/ root (tests pass a temp dir).
 */
export function createRunStore(runId = newRunId(), baseDir = DEFAULT_RUNS_DIR) {
  const dir = join(baseDir, runId);
  mkdirSync(dir, { recursive: true });

  return {
    runId,
    dir,
    writeJson(name, data) {
      const file = join(dir, name);
      writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
      return file;
    },
    writeText(name, text) {
      const file = join(dir, name);
      writeFileSync(file, text);
      return file;
    },
    readJson(name) {
      return JSON.parse(readFileSync(join(dir, name), 'utf8'));
    },
    list() {
      return readdirSync(dir).sort();
    },
  };
}
