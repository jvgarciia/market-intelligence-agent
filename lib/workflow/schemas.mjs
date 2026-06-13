/**
 * lib/workflow/schemas.mjs — loads the workflow JSON schemas and validates
 * artifacts against them.
 *
 * Schemas are the single source of truth for artifact shape. They live next to
 * the stage that produces them (and shared ones under references/schemas/), so a
 * reader finds the contract beside the contract's owner. This module just maps a
 * logical name → file and runs the tiny validator in validate.mjs.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validate } from './validate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_ROOT = join(here, '..', '..', 'workflows', 'market-opportunity');

const SCHEMA_FILES = {
  'source-record': 'references/schemas/source-record.schema.json',
  'run-request': 'references/schemas/run-request.schema.json',
  'run-metadata': 'references/schemas/run-metadata.schema.json',
  'market-signal': '01_market-signals/schemas/market-signal.schema.json',
  'candidate-organisation': '02_candidate-discovery/schemas/candidate-organisation.schema.json',
  'validated-evidence-item': '03_evidence-validation/schemas/validated-evidence-item.schema.json',
  'rejected-evidence-item': '03_evidence-validation/schemas/rejected-evidence-item.schema.json',
  'opportunity-score': '04_opportunity-scoring/schemas/opportunity-score.schema.json',
  'opportunity-brief': '05_opportunity-brief/schemas/opportunity-brief.schema.json',
};

export const SCHEMA_NAMES = Object.keys(SCHEMA_FILES);

const cache = {};

export function getSchema(name) {
  if (!SCHEMA_FILES[name]) throw new Error(`Unknown schema: ${name}`);
  if (!cache[name]) {
    cache[name] = JSON.parse(readFileSync(join(WORKFLOW_ROOT, SCHEMA_FILES[name]), 'utf8'));
  }
  return cache[name];
}

export function validateArtifact(name, value) {
  return validate(getSchema(name), value);
}

export function assertArtifact(name, value) {
  const errors = validateArtifact(name, value);
  if (errors.length) {
    throw new Error(`Invalid "${name}" artifact:\n  - ${errors.join('\n  - ')}`);
  }
  return value;
}
