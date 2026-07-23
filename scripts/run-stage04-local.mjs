/**
 * scripts/run-stage04-local.mjs — run Stage 04 opportunity scoring on an
 * already-approved, Gate-1-cleared run, using the local Claude Code CLI.
 *
 *   npm run workflow:stage04 -- --run <run-id>
 *   npm run workflow:stage04 -- --run <run-id> --model opus
 *
 * Requires that <run-id>'s Stage 01 output was already approved via:
 *   npm run workflow:review -- --run <run-id> --decision approve
 * that Stage 03 has already run:
 *   npm run workflow:stage03 -- --run <run-id>
 * and that Review Gate 1 has been recorded as approved — open
 * 02-candidates.json and 03-validation.json together, then set
 * metadata.json → reviewGates.gate1 to "approved" by hand.
 *
 * This uses your Claude Code subscription allowance — not metered API billing.
 * Adds to the existing run folder:
 *   runs/<run-id>/04-scores.json
 *   runs/<run-id>/04-raw-output.json
 *   runs/<run-id>/metadata.json (updated)
 */

import { runStage04Local } from '../lib/workflow/runStage04Local.mjs';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runFlag = args.indexOf('--run');
const modelFlag = args.indexOf('--model');
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  console.log(`
Usage: npm run workflow:stage04 -- --run <run-id> [--model <model>]

Options:
  --run <id>      An existing run with Stage 01 approved, Stage 03 completed,
                   and Review Gate 1 approved (required)
  --model <name>  Claude model alias or full ID (default: sonnet)
  --help          Show this message

Environment variables:
  LOCAL_CLAUDE_MODEL        Override model (e.g. "sonnet", "opus")
  LOCAL_CLAUDE_TIMEOUT_MS   Override timeout (default: 360000)

This uses your Claude Code subscription, not metered API billing.
The target run must already have:
  npm run workflow:review -- --run <run-id> --decision approve
  npm run workflow:stage03 -- --run <run-id>
  metadata.json → reviewGates.gate1 set to "approved" (no CLI for this yet)
`);
  process.exit(0);
}

const runId = runFlag !== -1 ? args[runFlag + 1] : null;
const modelOverride = modelFlag !== -1 ? args[modelFlag + 1] : null;

if (!runId) {
  console.error('✗  --run <run-id> is required.');
  console.error('   Use `npm run workflow:review -- --list` to see available runs.');
  console.error('   Run with --help for usage.');
  process.exit(1);
}

if (modelOverride) {
  process.env.LOCAL_CLAUDE_MODEL = modelOverride;
}

// ─── run ──────────────────────────────────────────────────────────────────────

const model = process.env.LOCAL_CLAUDE_MODEL || 'sonnet';
const timeoutSec = Math.round(
  parseInt(process.env.LOCAL_CLAUDE_TIMEOUT_MS || '360000', 10) / 1000
);

console.log('\n══════════════════════════════════════════════════════════');
console.log('  Market Intelligence Agent — Stage 04 Opportunity Scoring');
console.log('══════════════════════════════════════════════════════════\n');
console.log(`  Run:     ${runId}`);
console.log(`  Model:   ${model}`);
console.log(`  Timeout: ${timeoutSec}s`);
console.log('');
console.log('  This run uses your Claude Code subscription allowance.');
console.log('  It does NOT use ANTHROPIC_API_KEY or incur metered API charges.');
console.log('');
console.log('  Running Stage 04...');
console.log('');

const startMs = Date.now();

let result;
try {
  result = await runStage04Local(runId);
} catch (err) {
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.error(`✗  Stage 04 failed after ${elapsed}s`);
  console.error(`   ${err.message}`);
  if (err.dir) {
    console.error(`   Failure artifacts: ${err.dir}`);
  }
  process.exit(1);
}

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

console.log(`✓  Stage 04 completed in ${elapsed}s`);
console.log('');
console.log(`  Run ID:      ${result.runId}`);
console.log(`  Folder:      ${result.dir}`);
console.log(`  Scored:      ${result.scoredCount}`);
console.log(`  Dropped:     ${result.droppedCount}`);
console.log(`  Status:      ${result.status}`);
console.log('');
console.log('  Artifacts to inspect:');
for (const f of result.files) console.log(`    - ${f}`);
console.log('');
console.log(`  Inspect: cat "${result.dir}/04-scores.json"`);
console.log('');
