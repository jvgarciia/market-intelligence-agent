/**
 * scripts/build-contacts-csv.mjs — writes deliverables/contacts.csv (every
 * contact from every Gate-2-approved run) and deliverables/contacts-summary.md
 * (count + confidence distribution, reported alongside the count rather than
 * buried inside the CSV itself).
 *
 *   npm run contacts:csv
 *
 * All logic lives in lib/buildContactsCsv.mjs (testable against a temp
 * dir); this script wires it to the real runs/ directory and contacts-master.md
 * (read-only, for status carry-over — this script never writes it).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildContactsCsvContent } from '../lib/buildContactsCsv.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const RUNS_DIR = join(ROOT, 'runs');
const MASTER_PATH = join(ROOT, 'contacts-master.md');
const DELIVERABLES_DIR = join(ROOT, 'deliverables');
const CSV_PATH = join(DELIVERABLES_DIR, 'contacts.csv');
const SUMMARY_PATH = join(DELIVERABLES_DIR, 'contacts-summary.md');

const existingMasterText = existsSync(MASTER_PATH) ? readFileSync(MASTER_PATH, 'utf8') : '';
const result = buildContactsCsvContent({ runsDir: RUNS_DIR, existingMasterText });

mkdirSync(DELIVERABLES_DIR, { recursive: true });
writeFileSync(CSV_PATH, result.csv);

const { high, mid, low, unknown } = result.distribution;
const summary = [
  '# Contacts — confidence distribution',
  '',
  `Generated from \`deliverables/contacts.csv\` — ${result.count} contacts, from ${result.runs.length} Gate-2-approved runs.`,
  '',
  `- High confidence (≥0.7): ${high}`,
  `- Mid confidence (0.4–0.7): ${mid}`,
  `- Low confidence (<0.4): ${low}`,
  `- Unknown (no confidence recorded): ${unknown}`,
  '',
  'Regenerate with `npm run contacts:csv` after any new Gate-2 approval.',
  '',
].join('\n');
writeFileSync(SUMMARY_PATH, summary);

console.log(`✓  deliverables/contacts.csv written: ${result.count} contacts, from ${result.runs.length} Gate-2-approved run(s).`);
console.log(`   Confidence: ${high} high (≥0.7), ${mid} mid (0.4–0.7), ${low} low (<0.4), ${unknown} unknown.`);
