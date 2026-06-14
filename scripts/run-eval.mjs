/**
 * scripts/run-eval.mjs — run mock evaluation comparisons for eval cases.
 *
 * Usage:
 *   npm run eval:mock                          # run all 5 cases
 *   npm run eval:mock -- --case 01-water-utilities-spain   # run one case
 *
 * Zero API calls. Zero cost. Validates the eval harness infrastructure only.
 * Content is MOCK/SYNTHETIC throughout — no quality conclusions can be drawn.
 */

import { runEvaluation, listCases } from '../evals/harness/run.mjs';

const args = process.argv.slice(2);
const caseFlag = args.indexOf('--case');
const singleCase = caseFlag !== -1 ? args[caseFlag + 1] : null;

const casesToRun = singleCase ? [singleCase] : listCases();

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Market Intelligence Agent — Mock Evaluation Run');
console.log('  ⚠  SYNTHETIC DATA ONLY — zero API calls — zero cost');
console.log('═══════════════════════════════════════════════════════\n');

const results = [];

for (const caseId of casesToRun) {
  process.stdout.write(`Running case: ${caseId} ... `);
  try {
    const result = runEvaluation(caseId, { mode: 'mock' });
    results.push({ caseId, ok: true, result });
    const bl = result.baselineIssueSummary;
    const st = result.stagedIssueSummary;
    console.log(`done`);
    console.log(`  → ${result.evalRunId}`);
    console.log(`  → baseline: ${bl.errors} err, ${bl.warnings} warn | staged: ${st.errors} err, ${st.warnings} warn`);
    console.log(`  → results: ${result.dir}`);
  } catch (err) {
    results.push({ caseId, ok: false, error: err.message });
    console.log(`FAILED`);
    console.log(`  → ${err.message}`);
  }
  console.log('');
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;

console.log('─────────────────────────────────────────────────────');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('');

if (failed > 0) {
  console.log('  ✗ Some cases failed. Check errors above.');
  process.exit(1);
} else {
  console.log('  ✓ All cases ran. Harness infrastructure is working.');
  console.log('  ✓ No paid API calls were made.');
  console.log('');
  console.log('  Next steps:');
  console.log('    Read the summary.md in any result directory above.');
  console.log('    Score the output: npm run eval:review -- --run <evalRunId>');
  console.log('    When ready for live quality comparison: npm run eval:live -- --case <id> --mode cheap');
}
console.log('─────────────────────────────────────────────────────\n');
