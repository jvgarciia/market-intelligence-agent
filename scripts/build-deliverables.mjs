/**
 * scripts/build-deliverables.mjs — runs every Phase 3 hand-off build in
 * order (contacts-master.md, then the three deliverables/ files that
 * consume Gate-2-approved run data) and writes deliverables/README.md as a
 * single index pointing at all of them, so there's one file to open first.
 *
 *   npm run deliverables:build
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const DELIVERABLES_DIR = join(ROOT, 'deliverables');

for (const script of [
  'build-contacts-master.mjs',
  'build-contacts-csv.mjs',
  'build-qualified-leads.mjs',
  'build-pnrr-flags.mjs',
]) {
  execFileSync(process.execPath, [join(here, script)], { stdio: 'inherit', cwd: ROOT });
}

mkdirSync(DELIVERABLES_DIR, { recursive: true });
writeFileSync(
  join(DELIVERABLES_DIR, 'README.md'),
  [
    '# Deliverables',
    '',
    'Hand-off exports built from every Gate-2-approved run. Regenerate all of',
    'them with `npm run deliverables:build` after any new run is approved.',
    '',
    '- `contacts.csv` — every contact, one row each, ready to import into a',
    '  spreadsheet or CRM. See `contacts-summary.md` for the confidence',
    '  distribution.',
    '- `contacts-summary.md` — contact count + confidence distribution,',
    '  reported alongside the count rather than buried in the CSV.',
    '- `qualified-leads.md` — **V1, pending ICP calibration with HULO.** The',
    '  hard-filter-then-rank selection rule is durable; the specific',
    '  companies listed are provisional.',
    '- `pnrr-dependency.md` — pre-outreach re-source list: which candidates’',
    '  momentum evidence is PNRR-anchored, ahead of the 31 August 2026 RRF',
    '  milestone deadline. Not a re-score.',
    '',
    'The root-level `contacts-master.md` (human-readable, no CSV columns) is',
    'the older, simpler rollup this project already had — `contacts.csv` is',
    'the superset built for an actual hand-off.',
    '',
  ].join('\n')
);

console.log('✓  deliverables/README.md written.');
