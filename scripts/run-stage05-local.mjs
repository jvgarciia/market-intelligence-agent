/**
 * scripts/run-stage05-local.mjs — run Stage 05 opportunity briefs on an
 * already-approved run, using the local Claude Code CLI.
 *
 *   npm run workflow:stage05 -- --run <run-id>
 *   npm run workflow:stage05 -- --run <run-id> --model opus
 *
 * Requires that <run-id>'s Stage 01 output was already approved via:
 *   npm run workflow:review -- --run <run-id> --decision approve
 * and that Stage 04 has already run:
 *   npm run workflow:stage04 -- --run <run-id>
 *
 * This uses your Claude Code subscription allowance — not metered API billing.
 * Contact-finding is restricted to WebSearch only (no WebFetch), so the CLI
 * cannot fetch any URL, including a LinkedIn profile page.
 * Adds to the existing run folder:
 *   runs/<run-id>/05-briefs.json
 *   runs/<run-id>/05-brief.md   (human-readable — this is Review Gate 2)
 *   runs/<run-id>/05-raw-output.json
 *   runs/<run-id>/metadata.json (updated)
 */

import { runStage05Local } from '../lib/workflow/runStage05Local.mjs';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runFlag = args.indexOf('--run');
const modelFlag = args.indexOf('--model');
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  console.log(`
Usage: npm run workflow:stage05 -- --run <run-id> [--model <model>]

Options:
  --run <id>      An existing run with Stage 01 approved and Stage 04 completed (required)
  --model <name>  Claude model alias or full ID (default: sonnet)
  --help          Show this message

Environment variables:
  LOCAL_CLAUDE_MODEL        Override model (e.g. "sonnet", "opus")
  LOCAL_CLAUDE_TIMEOUT_MS   Override timeout (default: 540000)

This uses your Claude Code subscription, not metered API billing.
The target run must already have:
  npm run workflow:review -- --run <run-id> --decision approve
  npm run workflow:stage04 -- --run <run-id>

This stage produces Review Gate 2's source material — open 05-brief.md and
confirm the fact/interpretation split and every flagged verification item
before treating any brief as final.
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
  parseInt(process.env.LOCAL_CLAUDE_TIMEOUT_MS || '540000', 10) / 1000
);

console.log('\n══════════════════════════════════════════════════════════');
console.log('  Market Intelligence Agent — Stage 05 Opportunity Brief');
console.log('══════════════════════════════════════════════════════════\n');
console.log(`  Run:     ${runId}`);
console.log(`  Model:   ${model}`);
console.log(`  Timeout: ${timeoutSec}s`);
console.log('');
console.log('  This run uses your Claude Code subscription allowance.');
console.log('  It does NOT use ANTHROPIC_API_KEY or incur metered API charges.');
console.log('  Contact-finding uses WebSearch only — no WebFetch, no page visits.');
console.log('');
console.log('  Running Stage 05...');
console.log('');

const startMs = Date.now();

let result;
try {
  result = await runStage05Local(runId);
} catch (err) {
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.error(`✗  Stage 05 failed after ${elapsed}s`);
  console.error(`   ${err.message}`);
  if (err.dir) {
    console.error(`   Failure artifacts: ${err.dir}`);
  }
  process.exit(1);
}

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

console.log(`✓  Stage 05 completed in ${elapsed}s`);
console.log('');
console.log(`  Run ID:      ${result.runId}`);
console.log(`  Folder:      ${result.dir}`);
console.log(`  Briefed:     ${result.briefedCount}`);
console.log(`  Dropped:     ${result.droppedCount}`);
console.log(`  Status:      ${result.status}`);
console.log('');
console.log('  Artifacts to inspect:');
for (const f of result.files) console.log(`    - ${f}`);
console.log('');
console.log('  This stage is Review Gate 2 — open 05-brief.md and confirm the');
console.log('  fact/interpretation split and every flagged verification item.');
console.log('');
console.log(`  Inspect: cat "${result.dir}/05-brief.md"`);
console.log('');
