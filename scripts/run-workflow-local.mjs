/**
 * scripts/run-workflow-local.mjs — run Stage 01 market signals using the local
 * Claude Code CLI (OAuth session, no paid API calls).
 *
 *   npm run workflow:local -- --case 01-water-utilities-spain
 *   npm run workflow:local -- --case 01-water-utilities-spain --model opus
 *
 * This uses your Claude Code subscription allowance — not metered API billing.
 * One Stage 01 run makes one or more web searches and produces:
 *   runs/<run-id>/request.json
 *   runs/<run-id>/00-sources.json
 *   runs/<run-id>/01-market-signals.json
 *   runs/<run-id>/01-raw-output.json
 *   runs/<run-id>/review-gate.json
 *   runs/<run-id>/metadata.json
 *
 * After the run, inspect the artifacts and approve/reject:
 *   npm run workflow:review -- --run <run-id>
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runWorkflowLocal } from '../lib/workflow/runWorkflowLocal.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(here, '..', 'evals', 'cases');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const caseFlag = args.indexOf('--case');
const modelFlag = args.indexOf('--model');
const helpFlag = args.includes('--help') || args.includes('-h');

function listCases() {
  return readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

if (helpFlag) {
  console.log(`
Usage: npm run workflow:local -- --case <caseId> [--model <model>]

Options:
  --case <id>     Eval case to use as the run request (required)
  --model <name>  Claude model alias or full ID (default: sonnet)
  --help          Show this message

Available cases:`);
  for (const c of listCases()) console.log(`  ${c}`);
  console.log(`
Environment variables:
  LOCAL_CLAUDE_MODEL        Override model (e.g. "sonnet", "opus")
  LOCAL_CLAUDE_TIMEOUT_MS   Override timeout (default: 360000)

This uses your Claude Code subscription, not metered API billing.
After the run, review with: npm run workflow:review -- --run <run-id>
`);
  process.exit(0);
}

const caseId = caseFlag !== -1 ? args[caseFlag + 1] : null;
const modelOverride = modelFlag !== -1 ? args[modelFlag + 1] : null;

if (!caseId) {
  console.error('✗  --case is required.');
  console.error('   Available cases:', listCases().join(', '));
  console.error('   Run with --help for usage.');
  process.exit(1);
}

// Load the eval case to get the run request
let evalCase;
try {
  evalCase = JSON.parse(readFileSync(join(CASES_DIR, `${caseId}.json`), 'utf8'));
} catch {
  console.error(`✗  Case not found: ${caseId}`);
  console.error('   Available cases:', listCases().join(', '));
  process.exit(1);
}

// Set model override before running (localCli reads process.env)
if (modelOverride) {
  process.env.LOCAL_CLAUDE_MODEL = modelOverride;
}

// ─── run ──────────────────────────────────────────────────────────────────────

const model = process.env.LOCAL_CLAUDE_MODEL || 'sonnet';
const timeoutSec = Math.round(
  parseInt(process.env.LOCAL_CLAUDE_TIMEOUT_MS || '360000', 10) / 1000
);

console.log('\n══════════════════════════════════════════════════════════');
console.log('  Market Intelligence Agent — Stage 01 Local Research');
console.log('══════════════════════════════════════════════════════════\n');
console.log(`  Case:    ${caseId} — ${evalCase.title}`);
console.log(`  Market:  ${evalCase.input.targetMarket}`);
console.log(`  Customer: ${evalCase.input.targetCustomerType}`);
console.log(`  Model:   ${model}`);
console.log(`  Timeout: ${timeoutSec}s`);
console.log('');
console.log('  This run uses your Claude Code subscription allowance.');
console.log('  It does NOT use ANTHROPIC_API_KEY or incur metered API charges.');
console.log('  Claude will search the web and return structured market signals.');
console.log('');
console.log('  Running Stage 01...');
console.log('');

const startMs = Date.now();

let result;
try {
  result = await runWorkflowLocal(evalCase.input);
} catch (err) {
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.error(`✗  Stage 01 failed after ${elapsed}s`);
  console.error(`   ${err.message}`);
  if (err.dir) {
    console.error(`   Failure artifacts: ${err.dir}`);
  }
  process.exit(1);
}

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

console.log(`✓  Stage 01 completed in ${elapsed}s`);
console.log('');
console.log(`  Run ID:   ${result.runId}`);
console.log(`  Folder:   ${result.dir}`);
console.log(`  Signals:  ${result.signalCount}`);
console.log(`  Sources:  ${result.sourceCount}`);
console.log(`  Status:   ${result.status}`);
console.log('');
console.log('  Artifacts to inspect:');
for (const f of result.files) console.log(`    - ${f}`);
console.log('');
console.log('  Next step: review the output before continuing.');
console.log(`  npm run workflow:review -- --run ${result.runId}`);
console.log('');
