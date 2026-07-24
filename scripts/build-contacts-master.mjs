/**
 * scripts/build-contacts-master.mjs — consolidate contacts from every
 * Gate-2-approved run into contacts-master.md at the project root.
 *
 *   npm run contacts:build
 *   CONTACT_TARGET=50 npm run contacts:build
 *
 * All the actual logic lives in lib/buildContactsMaster.mjs (testable
 * against a temp directory); this script just wires it to the real runs/
 * directory and contacts-master.md.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildContactsMasterContent, DEFAULT_CONTACT_TARGET } from '../lib/buildContactsMaster.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const RUNS_DIR = join(ROOT, 'runs');
const OUTPUT_PATH = join(ROOT, 'contacts-master.md');

const contactTarget = parseInt(process.env.CONTACT_TARGET || String(DEFAULT_CONTACT_TARGET), 10);
const existingText = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : '';

const result = buildContactsMasterContent({ runsDir: RUNS_DIR, existingText, contactTarget });

writeFileSync(OUTPUT_PATH, result.content);

console.log(`✓  contacts-master.md updated: ${result.count}/${result.target} contacts, from ${result.runs.length} Gate-2-approved run(s).`);
