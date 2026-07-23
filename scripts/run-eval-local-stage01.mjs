/**
 * scripts/run-eval-local-stage01.mjs — run Stage 01 evaluation using the local
 * Claude Code CLI.
 *
 *   npm run eval:local-stage01 -- --case 01-water-utilities-spain
 *
 * This makes real local CLI calls — it uses your Claude Code subscription
 * allowance, not metered API billing. One case runs one Stage 01 research task.
 *
 * Results are written to evals/results/<eval-run-id>/local-stage01/.
 *
 * Safety rules:
 *   1. One case at a time — no accidental batch runs.
 *   2. Confirms before running.
 *   3. Never runs eval:mock automatically (those remain deterministic and free).
 *   4. Does not start Stage 02 or later.
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runLocalStage01Adapter } from '../evals/harness/adapters/local-stage01.mjs';
import { normalizeStagedOutput } from '../evals/harness/normalize/staged.mjs';
import { runDeterministicChecks, summarizeIssues } from '../evals/harness/checks/deterministic.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(here, '..', 'evals', 'cases');
const RESULTS_DIR = join(here, '..', 'evals', 'results');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const caseFlag = args.indexOf('--case');
const helpFlag = args.includes('--help') || args.includes('-h');

function listCases() {
  return readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

if (helpFlag) {
  console.log(`
Usage: npm run eval:local-stage01 -- --case <caseId>

Options:
  --case <id>   Eval case to run (required)
  --help        Show this message

Available cases:`);
  for (const c of listCases()) console.log(`  ${c}`);
  console.log(`
Environment variables:
  LOCAL_CLAUDE_MODEL        Model alias (default: sonnet)
  LOCAL_CLAUDE_TIMEOUT_MS   Timeout in ms (default: 540000)

Dimensions evaluated:
  - Signal count and relevance distribution
  - Source count and quality tiers
  - Schema validity
  - Source URL presence
  - Duplicate detection
  - Uncertainty coverage
  - Execution latency
  - Provider and model info

Note: estimatedApiCost is "not_applicable" (subscription, not metered billing).
`);
  process.exit(0);
}

const caseId = caseFlag !== -1 ? args[caseFlag + 1] : null;

if (!caseId) {
  console.error('✗  --case is required.');
  console.error('   Available cases:', listCases().join(', '));
  process.exit(1);
}

let evalCase;
try {
  evalCase = JSON.parse(readFileSync(join(CASES_DIR, `${caseId}.json`), 'utf8'));
} catch {
  console.error(`✗  Case not found: ${caseId}`);
  process.exit(1);
}

const model = process.env.LOCAL_CLAUDE_MODEL || 'sonnet';
const timeoutSec = Math.round(
  parseInt(process.env.LOCAL_CLAUDE_TIMEOUT_MS || '540000', 10) / 1000
);

// ─── confirmation ─────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log('  Market Intelligence Agent — Stage 01 Local Evaluation');
console.log('  LOCAL CLI CALL — USES SUBSCRIPTION ALLOWANCE');
console.log('══════════════════════════════════════════════════════════\n');
console.log(`  Case:    ${caseId} — ${evalCase.title}`);
console.log(`  Model:   ${model}`);
console.log(`  Timeout: ${timeoutSec}s`);
console.log('');
console.log('  This will:');
console.log('    1. Call the local Claude CLI once for Stage 01 research');
console.log('    2. Claude will search the web for market signals');
console.log('    3. Validate the output against the Stage 01 schemas');
console.log('    4. Write eval results to evals/results/');
console.log('');
console.log('  Cost: Subscription allowance (not metered API billing).');
console.log('  estimatedApiCost will be reported as "not_applicable".');
console.log('');

const rl = createInterface({ input, output });
const answer = await rl.question('  Type "yes" to proceed, anything else to cancel: ');
rl.close();

if (answer.trim().toLowerCase() !== 'yes') {
  console.log('\n  Cancelled. No CLI calls were made.\n');
  process.exit(0);
}

console.log('\n  Running Stage 01 evaluation...\n');

// ─── run ──────────────────────────────────────────────────────────────────────

const evalRunId = `eval-${new Date().toISOString().replace(/[:.]/g, '-')}__${randomUUID().slice(0, 8)}`;
const evalDir = join(RESULTS_DIR, evalRunId);
mkdirSync(evalDir, { recursive: true });

const startMs = Date.now();

let adapterResult;
try {
  adapterResult = await runLocalStage01Adapter(evalCase, {});
} catch (err) {
  console.error(`\n✗  Stage 01 evaluation failed: ${err.message}\n`);
  writeFileSync(
    join(evalDir, 'failure.json'),
    JSON.stringify({ error: err.message, caseId, evalRunId }, null, 2)
  );
  process.exit(1);
}

const totalMs = Date.now() - startMs;

// ─── normalize and check ──────────────────────────────────────────────────────

// Normalize using the staged normalizer (Stage 01 artifacts are a subset of full staged output)
let normalized;
try {
  normalized = normalizeStagedOutput(adapterResult.rawOutput);
} catch (err) {
  normalized = { _normalizationError: err.message };
}

const issues = Array.isArray(normalized._normalizationError)
  ? []
  : runDeterministicChecks(normalized);

const issueSummary = summarizeIssues(issues);

// ─── write results ─────────────────────────────────────────────────────────────

const metadata = {
  evalRunId,
  caseId,
  adapterName: 'local-stage01-v1',
  generatedAt: new Date().toISOString(),
  localCliCallMade: true,
  paidApiCallsMade: false,
  subscriptionCallMade: true,
};

const writeJson = (name, data) =>
  writeFileSync(join(evalDir, name), JSON.stringify(data, null, 2) + '\n');

writeJson('metadata.json', metadata);
writeJson('test-case.json', evalCase);
writeJson('raw-output.json', adapterResult.rawOutput);
writeJson('metrics.json', adapterResult.metrics);
writeJson('normalized-output.json', normalized);
writeJson('issues.json', { issues, summary: issueSummary });

// ─── summary ──────────────────────────────────────────────────────────────────

const m = adapterResult.metrics;
const sources = adapterResult.rawOutput.artifacts?.['00-sources.json'] || [];
const signals = adapterResult.rawOutput.artifacts?.['01-market-signals.json'] || [];

const highSignals = signals.filter((s) => s.relevance === 'high').length;
const tierA = sources.filter((s) => s.qualityTier === 'A').length;
const tierB = sources.filter((s) => s.qualityTier === 'B').length;

console.log('══════════════════════════════════════════════════════════');
console.log('  Stage 01 Evaluation Complete');
console.log('══════════════════════════════════════════════════════════\n');
console.log(`  Eval run ID: ${evalRunId}`);
console.log(`  Total time:  ${totalMs}ms`);
console.log(`  Provider:    ${m.provider}`);
console.log(`  Model:       ${m.model}`);
console.log('');
console.log('  Stage 01 results:');
console.log(`    Signals:   ${m.signalCount} (${highSignals} high-relevance)`);
console.log(`    Sources:   ${m.sourceCount} (Tier A: ${tierA}, Tier B: ${tierB})`);
console.log(`    Rejected:  ${m.rejectedSignals}`);
console.log(`    Warnings:  ${m.warnings?.length || 0}`);
console.log('');
console.log('  Automated checks:');
console.log(`    Errors:    ${issueSummary.errors}`);
console.log(`    Warnings:  ${issueSummary.warnings}`);
console.log(`    Info:      ${issueSummary.infos}`);
console.log('');
console.log('  Cost:');
console.log('    API cost:  not_applicable (subscription, not metered billing)');
console.log('    Tokens:    not_available (local CLI text mode)');
console.log('');
console.log(`  Results:   ${evalDir}`);
console.log('');
console.log('  Next step: review the run artifacts and record a decision.');
console.log(`  npm run workflow:review -- --run ${adapterResult.rawOutput.runId}`);
console.log('');
