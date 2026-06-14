/**
 * evals/harness/rubric/review-cli.mjs — simple CLI for entering human review scores.
 *
 * Usage: node evals/harness/rubric/review-cli.mjs --run <evalRunId>
 *   (or)  npm run eval:review -- --run <evalRunId>
 *
 * The reviewer is shown the eval case context and the comparison summary, then
 * prompted for a 1–5 score and an optional comment on each dimension. Results
 * are written to evals/results/<evalRunId>/human-review.json.
 *
 * If the run's summary.md is not found, the reviewer is shown a short error
 * and the process exits cleanly (no crash, no partial writes).
 *
 * Scores are NOT validated against the rubric — the rubric is a guide, not
 * a constraint. A reviewer may skip any dimension by pressing Enter (recorded
 * as null, not 0).
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, '..', '..', 'results');

const DIMENSIONS = [
  {
    key: 'relevance',
    label: 'Relevance',
    prompt: 'Are signals and candidates relevant to the right market and customer type?',
  },
  {
    key: 'factualCredibility',
    label: 'Factual credibility',
    prompt: 'Do named organisations exist? Do claims seem accurate and non-invented?',
  },
  {
    key: 'sourceQuality',
    label: 'Source quality',
    prompt: 'Are sources Tier A/B (official portals, trade press), not vendor marketing?',
  },
  {
    key: 'candidateUsefulness',
    label: 'Candidate usefulness',
    prompt: 'Would you actually want to research these organisations further?',
  },
  {
    key: 'rankingLogic',
    label: 'Ranking logic',
    prompt: 'Does the ranking/scoring explain clearly why one opportunity outranks another?',
  },
  {
    key: 'clarity',
    label: 'Clarity',
    prompt: 'Could you use this in a real work conversation with minimal editing?',
  },
  {
    key: 'actionability',
    label: 'Actionability',
    prompt: 'Is the recommended next step concrete? (not "do more research")',
  },
  {
    key: 'uncertaintyHandling',
    label: 'Uncertainty handling',
    prompt: 'Does the output honestly flag what it does not know?',
  },
];

async function main() {
  const args = process.argv.slice(2);
  const runFlagIndex = args.indexOf('--run');
  const evalRunId = runFlagIndex !== -1 ? args[runFlagIndex + 1] : null;

  if (!evalRunId) {
    console.error('Usage: npm run eval:review -- --run <evalRunId>');
    console.error('Example: npm run eval:review -- --run eval-2026-06-14T10-00-00-000Z__abc12345');
    process.exit(1);
  }

  const runDir  = join(RESULTS_DIR, evalRunId);
  const metaFile    = join(runDir, 'metadata.json');
  const summaryFile = join(runDir, 'summary.md');
  const reviewFile  = join(runDir, 'human-review.json');

  if (!existsSync(metaFile)) {
    console.error(`Eval run not found: ${evalRunId}`);
    console.error(`Expected directory: ${runDir}`);
    console.error('Run `npm run eval:mock` first to generate results.');
    process.exit(1);
  }

  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const summaryText = existsSync(summaryFile) ? readFileSync(summaryFile, 'utf8') : null;

  console.log('\n─────────────────────────────────────────────────');
  console.log('  Market Intelligence Agent — Human Review');
  console.log('─────────────────────────────────────────────────');
  console.log(`\nEval run: ${evalRunId}`);
  console.log(`Case:     ${meta.caseId}`);
  console.log(`Mode:     ${meta.mode}`);
  if (meta.mode === 'mock') {
    console.log('\n⚠  This is a MOCK run. Score structural dimensions only.');
    console.log('   Skip factual credibility and source quality — content is synthetic.\n');
  }

  if (summaryText) {
    // Show just the structural comparison section
    const compMatch = summaryText.match(/## Structural comparison[^#]*/);
    if (compMatch) {
      console.log('Summary excerpt:\n');
      console.log(compMatch[0].trim());
      console.log('');
    }
  }

  console.log('Read the full rubric at: evals/harness/rubric/rubric.md');
  console.log('Score each dimension 1–5 (press Enter to skip with null).\n');

  const rl = createInterface({ input, output });

  const reviewScores = {};
  const reviewComments = {};

  for (const dim of DIMENSIONS) {
    const isMockOnly = meta.mode === 'mock' &&
      ['factualCredibility', 'sourceQuality', 'candidateUsefulness'].includes(dim.key);

    console.log(`\n[${dim.label}]`);
    console.log(`  ${dim.prompt}`);

    if (isMockOnly) {
      console.log('  (Skipping — not meaningful for mock output)');
      reviewScores[dim.key]   = null;
      reviewComments[dim.key] = 'skipped: mock run';
      continue;
    }

    let score = null;
    while (true) {
      const raw = await rl.question('  Score (1-5, Enter to skip): ');
      if (raw.trim() === '') { score = null; break; }
      const parsed = parseInt(raw, 10);
      if (parsed >= 1 && parsed <= 5) { score = parsed; break; }
      console.log('  Please enter a number between 1 and 5, or press Enter to skip.');
    }

    const comment = await rl.question('  Comment (optional, Enter to skip): ');
    reviewScores[dim.key]   = score;
    reviewComments[dim.key] = comment.trim() || null;
  }

  const overallNote = await rl.question('\nOverall notes (optional, Enter to skip): ');
  rl.close();

  const reviewOutput = {
    evalRunId,
    caseId:     meta.caseId,
    mode:       meta.mode,
    reviewedAt: new Date().toISOString(),
    scores:     reviewScores,
    comments:   reviewComments,
    overallNotes: overallNote.trim() || null,
    rubricVersion: '1.0.0',
  };

  writeFileSync(reviewFile, JSON.stringify(reviewOutput, null, 2) + '\n');

  const scored = Object.values(reviewScores).filter((s) => s !== null);
  const avg = scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : 'n/a';

  console.log('\n─────────────────────────────────────────────────');
  console.log(`  Review saved: ${reviewFile}`);
  console.log(`  Dimensions scored: ${scored.length} of ${DIMENSIONS.length}`);
  console.log(`  Average score: ${avg}`);
  console.log('─────────────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('Review CLI error:', err.message);
  process.exit(1);
});
