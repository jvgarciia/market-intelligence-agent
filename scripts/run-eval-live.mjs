/**
 * scripts/run-eval-live.mjs — live evaluation runner (real API calls).
 *
 * Usage: npm run eval:live -- --case <caseId> --mode cheap
 *
 * COST AND SAFETY RULES:
 *   1. Only one case at a time — no accidental batch runs.
 *   2. Displays an estimated call count before running.
 *   3. Requires explicit confirmation ("yes") before any API call is made.
 *   4. Refuses to run if --mode is "mock" (use npm run eval:mock for that).
 *   5. Records real API errors — does not swallow them.
 *   6. Does not silently fall back to another mode or model.
 *
 * IMPLEMENTATION STATUS:
 *   Live stage execution in the staged workflow is not yet wired (runWorkflow
 *   throws for cheap/full mode). This script is ready infrastructure — it
 *   validates inputs, shows cost estimates, and requests confirmation, but the
 *   live adapter calls will be wired when live stage execution is enabled.
 *
 * APPROXIMATE COSTS (cheap mode, as of 2026-06):
 *   Baseline: ~1 Claude Haiku call + ~1 Tavily search
 *     ≈ 1,500 output tokens × $0.00125/1K = ~$0.002
 *   Staged (when wired): ~5 calls (one per stage) × Haiku rate ≈ ~$0.01–0.03
 *   Full mode multiplies these by ~5× (Sonnet rate, more tokens).
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadCase, listCases } from '../evals/harness/run.mjs';

// ─── parse args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const caseFlag = args.indexOf('--case');
const modeFlag = args.indexOf('--mode');
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  console.log(`
Usage: npm run eval:live -- --case <caseId> --mode <cheap|full>

Options:
  --case <id>    Which eval case to run (required). One case only.
  --mode <mode>  "cheap" (Haiku, 1 search) or "full" (Sonnet, 4 searches).
                 Never "mock" — use npm run eval:mock for that.
  --help         Show this message.

Available cases:`);
  for (const c of listCases()) console.log(`  ${c}`);
  console.log('');
  process.exit(0);
}

const caseId = caseFlag !== -1 ? args[caseFlag + 1] : null;
const mode   = modeFlag !== -1 ? args[modeFlag + 1] : null;

// ─── validation ──────────────────────────────────────────────────────────────

const errors = [];
if (!caseId)           errors.push('--case is required. Specify one case ID.');
if (!mode)             errors.push('--mode is required. Use "cheap" or "full".');
if (mode === 'mock')   errors.push('--mode mock is not valid here. Use npm run eval:mock instead.');
if (mode && !['cheap', 'full'].includes(mode)) errors.push(`Unknown mode "${mode}". Use "cheap" or "full".`);

if (errors.length) {
  for (const e of errors) console.error(`✗  ${e}`);
  console.error('\nRun `npm run eval:live -- --help` for usage.');
  process.exit(1);
}

// ─── load case ───────────────────────────────────────────────────────────────

let evalCase;
try {
  evalCase = loadCase(caseId);
} catch {
  console.error(`✗  Case not found: ${caseId}`);
  console.error('Available cases:', listCases().join(', '));
  process.exit(1);
}

// ─── cost estimate ───────────────────────────────────────────────────────────

const estimates = {
  cheap: {
    baselineModelCalls: 1,
    baselineSearches: 1,
    stagedModelCalls: 5,
    stagedSearches: 5,
    estimatedCostUsd: '$0.02–$0.05',
    model: 'Claude Haiku',
  },
  full: {
    baselineModelCalls: 5,
    baselineSearches: 4,
    stagedModelCalls: 5,
    stagedSearches: 5,
    estimatedCostUsd: '$0.10–$0.30',
    model: 'Claude Sonnet',
  },
};

const est = estimates[mode];

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Market Intelligence Agent — LIVE Evaluation Run');
console.log('  ⚠  REAL API CALLS — REAL COST');
console.log('═══════════════════════════════════════════════════════\n');
console.log(`  Case:  ${caseId} — ${evalCase.title}`);
console.log(`  Mode:  ${mode} (${est.model})`);
console.log('');
console.log('  Estimated API calls:');
console.log(`    Baseline: up to ${est.baselineModelCalls} model call(s) + ${est.baselineSearches} search(es)`);
console.log(`    Staged:   up to ${est.stagedModelCalls} model call(s) + ${est.stagedSearches} search(es)`);
console.log('');
console.log(`  Estimated cost: ${est.estimatedCostUsd} USD`);
console.log('  (Actual cost depends on token usage. Check Anthropic dashboard after the run.)');
console.log('');
console.log('  IMPORTANT: The staged workflow live execution is not yet wired.');
console.log('  Running now will run the baseline live and the staged in mock mode.');
console.log('  Full live comparison will be available after evals/README.md Phase 2.');
console.log('');

// ─── confirmation ─────────────────────────────────────────────────────────────

const rl = createInterface({ input, output });
const answer = await rl.question('  Type "yes" to proceed with real API calls, or anything else to cancel: ');
rl.close();

if (answer.trim().toLowerCase() !== 'yes') {
  console.log('\n  Cancelled. No API calls were made.\n');
  process.exit(0);
}

console.log('\n  Confirmed. Starting live evaluation...\n');

// ─── execution ───────────────────────────────────────────────────────────────
//
// When live stage execution is wired, replace the block below with real calls.
// The runEvaluation() function currently throws for non-mock mode, which is the
// correct safe behaviour. This script structure is ready — just replace the
// throw-guard in runEvaluation() and wire the live adapters.
//

console.log('  ✗  Live stage execution is not yet wired.');
console.log('     The staged workflow only supports mock mode right now.');
console.log('     This is by design — live execution is gated on the eval harness proving');
console.log('     that the infrastructure works (run npm run eval:mock first).');
console.log('');
console.log('  When you are ready to wire live execution:');
console.log('     1. Implement live cheap/full mode in lib/workflow/runWorkflow.mjs');
console.log('     2. Remove the mode guard in evals/harness/run.mjs runEvaluation()');
console.log('     3. Update the baseline adapter to call POST /api/chat directly');
console.log('     4. Re-run this script');
console.log('');
console.log('  No API calls were made during this run.\n');

process.exit(0);
