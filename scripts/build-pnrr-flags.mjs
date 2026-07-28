/**
 * scripts/build-pnrr-flags.mjs — writes deliverables/pnrr-dependency.md, the
 * per-candidate PNRR dependency re-source list.
 *
 *   npm run pnrr:flags
 *
 * All logic lives in lib/buildPnrrFlags.mjs (testable against a temp dir);
 * this script just wires it to the real runs/ directory.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPnrrFlagsContent } from '../lib/buildPnrrFlags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const RUNS_DIR = join(ROOT, 'runs');
const DELIVERABLES_DIR = join(ROOT, 'deliverables');
const OUTPUT_PATH = join(DELIVERABLES_DIR, 'pnrr-dependency.md');

const result = buildPnrrFlagsContent({ runsDir: RUNS_DIR });

mkdirSync(DELIVERABLES_DIR, { recursive: true });
writeFileSync(OUTPUT_PATH, result.content);

console.log(`✓  deliverables/pnrr-dependency.md written: ${result.flags.length} candidates tagged, from ${result.runs.length} Gate-2-approved run(s).`);
