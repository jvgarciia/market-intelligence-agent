/**
 * scripts/build-qualified-leads.mjs — writes deliverables/qualified-leads.md,
 * the V1 hard-filter-then-rank qualified-leads export.
 *
 *   npm run leads:build
 *
 * All logic lives in lib/buildQualifiedLeads.mjs (testable against a temp
 * dir); this script just wires it to the real runs/ directory.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildQualifiedLeadsContent } from '../lib/buildQualifiedLeads.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const RUNS_DIR = join(ROOT, 'runs');
const DELIVERABLES_DIR = join(ROOT, 'deliverables');
const OUTPUT_PATH = join(DELIVERABLES_DIR, 'qualified-leads.md');

const result = buildQualifiedLeadsContent({ runsDir: RUNS_DIR });

mkdirSync(DELIVERABLES_DIR, { recursive: true });
writeFileSync(OUTPUT_PATH, result.content);

console.log(`✓  deliverables/qualified-leads.md written: ${result.leads.length} of ${result.totalScored} scored candidates qualified, from ${result.runs.length} Gate-2-approved run(s).`);
