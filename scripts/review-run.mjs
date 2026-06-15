/**
 * scripts/review-run.mjs — developer review gate for a local Stage 01 run.
 *
 *   npm run workflow:review -- --run <run-id>
 *   npm run workflow:review -- --run <run-id> --list
 *
 * Displays the run artifacts in a readable format and lets the developer:
 *   approve  — mark Stage 01 accepted; no further stage is triggered automatically
 *   reject   — mark Stage 01 rejected; add a note for future reruns
 *   rerun    — instructions to rerun; does not trigger automatically
 *   skip     — exit without recording a decision
 *
 * The decision is written to review-gate.json inside the run folder.
 * Nothing is deleted; all raw artifacts are preserved.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(here, '..', 'runs');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runFlag = args.indexOf('--run');
const listFlag = args.includes('--list') || args.includes('-l');
const helpFlag = args.includes('--help') || args.includes('-h');
const decisionFlag = args.indexOf('--decision');
const nonInteractiveDecision = decisionFlag !== -1 ? args[decisionFlag + 1] : null;
const noteFlag = args.indexOf('--note');
const nonInteractiveNote = noteFlag !== -1 ? args[noteFlag + 1] : null;

if (helpFlag) {
  console.log(`
Usage: npm run workflow:review -- --run <run-id>
       npm run workflow:review -- --run <run-id> --decision approve [--note "text"]
       npm run workflow:review -- --list

Options:
  --run <id>          Run to review
  --list              List all runs with their review status
  --decision <val>    Record decision non-interactively (approve|reject|skip)
  --note <text>       Optional note to attach to the decision
  --help              Show this message
`);
  process.exit(0);
}

if (listFlag) {
  listRuns();
  process.exit(0);
}

const runId = runFlag !== -1 ? args[runFlag + 1] : null;

if (!runId) {
  console.error('✗  --run <run-id> is required.');
  console.error('   Use --list to see available runs.');
  process.exit(1);
}

// ─── load run ─────────────────────────────────────────────────────────────────

const runDir = join(RUNS_DIR, runId);

if (!existsSync(runDir)) {
  console.error(`✗  Run not found: ${runId}`);
  console.error(`   Expected directory: ${runDir}`);
  process.exit(1);
}

function readJson(filename) {
  const path = join(runDir, filename);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { _error: `Could not parse ${filename}` };
  }
}

const request = readJson('request.json');
const sources = readJson('00-sources.json');
const signals = readJson('01-market-signals.json');
const rawOutput = readJson('01-raw-output.json');
const gate = readJson('review-gate.json');
const metadata = readJson('metadata.json');

// ─── display ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  Stage 01 Review — Run ${runId}`);
console.log('══════════════════════════════════════════════════════════\n');

if (metadata) {
  console.log(`  Mode:    ${metadata.mode}`);
  console.log(`  Status:  ${gate?.status || 'unknown'}`);
  console.log(`  Created: ${metadata.createdAt}`);
}

if (gate?.decision) {
  console.log(`\n  ⚠  This run has already been reviewed.`);
  console.log(`  Decision: ${gate.decision}`);
  if (gate.note) console.log(`  Note:     ${gate.note}`);
  console.log(`  Decided:  ${gate.decidedAt}`);
}

// ── Request ──
console.log('\n─── Research Request ─────────────────────────────────────\n');
if (request) {
  console.log(`  Target market:    ${request.targetMarket}`);
  console.log(`  Customer type:    ${request.targetCustomerType}`);
  console.log(`  Solution:         ${request.solutionDescription}`);
  console.log(`  Objective:        ${request.businessObjective}`);
  if (request.constraints?.length) {
    console.log(`  Constraints:      ${request.constraints.join('; ')}`);
  }
}

// ── Sources ──
console.log('\n─── Sources Found ────────────────────────────────────────\n');
if (!sources) {
  console.log('  (no sources file)');
} else {
  for (const src of sources) {
    console.log(`  [${src.sourceId}] ${src.title}`);
    console.log(`         ${src.url}`);
    console.log(`         Tier ${src.qualityTier || '?'} · ${src.sourceType} · ${src.publicationDate || 'no date'}`);
    console.log('');
  }
}

// ── Signals ──
console.log('─── Market Signals Found ─────────────────────────────────\n');
if (!signals) {
  console.log('  (no signals file)');
} else if (signals.length === 0) {
  console.log('  (zero signals — model found no usable evidence)');
} else {
  for (const sig of signals) {
    const tier = sig.relevance === 'high' ? '★★★' : sig.relevance === 'medium' ? '★★☆' : '★☆☆';
    console.log(`  ${sig.signalId} [${tier}] ${sig.signalType}`);
    console.log(`  Claim: ${sig.claim}`);
    console.log(`  Confidence: ${sig.confidence} | Sources: ${sig.sourceIds?.join(', ')}`);
    console.log(`  Uncertainty: ${sig.uncertainty}`);
    console.log('');
  }
}

// ── Warnings ──
if (rawOutput?.warnings?.length) {
  console.log('─── Validation Warnings ──────────────────────────────────\n');
  for (const w of rawOutput.warnings) {
    console.log(`  ⚠  ${w}`);
  }
  console.log('');
}
if (rawOutput?.rejectedSignals > 0) {
  console.log(`  ⚠  ${rawOutput.rejectedSignals} signal(s) were dropped during validation.`);
  console.log('     See 01-raw-output.json for details.');
  console.log('');
}

// ── Execution metadata ──
if (rawOutput) {
  console.log('─── Execution Metadata ───────────────────────────────────\n');
  console.log(`  Provider:  ${rawOutput.provider}`);
  console.log(`  Model:     ${rawOutput.model}`);
  console.log(`  Latency:   ${rawOutput.latencyMs}ms`);
  console.log(`  Cost:      Subscription allowance (not metered API billing)`);
  console.log(`  Artifacts: ${runDir}`);
}

// ─── review decision ──────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log('  Review Decision');
console.log('══════════════════════════════════════════════════════════\n');
console.log('  Options:');
console.log('    approve  — signals are credible; mark Stage 01 accepted');
console.log('    reject   — signals are not useful; mark Stage 01 rejected');
console.log('    rerun    — instructions to rerun Stage 01 without deciding');
console.log('    skip     — exit without recording a decision');
console.log('');

let decision;
let note = '';

if (nonInteractiveDecision) {
  decision = nonInteractiveDecision.trim().toLowerCase();
  note = nonInteractiveNote ? nonInteractiveNote.trim() : '';
  if (!['approve', 'reject', 'skip'].includes(decision)) {
    console.error(`\n  ✗  Invalid --decision value: "${decision}". Use approve, reject, or skip.\n`);
    process.exit(1);
  }
  console.log(`  Decision: ${decision}${note ? ` — "${note}"` : ''}`);
} else {
  const rl = createInterface({ input, output });
  decision = (await rl.question('  Decision (approve / reject / rerun / skip): ')).trim().toLowerCase();

  if (!['approve', 'reject', 'rerun', 'skip'].includes(decision)) {
    console.log('\n  Unrecognised input. No decision recorded.\n');
    rl.close();
    process.exit(0);
  }

  if (decision === 'skip') {
    console.log('\n  Skipped. No decision recorded.\n');
    rl.close();
    process.exit(0);
  }

  if (decision === 'rerun') {
    console.log(`\n  To rerun: npm run workflow:local -- --case <case-id>`);
    console.log('  No decision recorded for this run.');
    rl.close();
    process.exit(0);
  }

  const noteAnswer = await rl.question('  Optional note (press Enter to skip): ');
  note = noteAnswer.trim();
  rl.close();
}

if (decision === 'skip') {
  console.log('\n  Skipped. No decision recorded.\n');
  process.exit(0);
}

const decidedAt = new Date().toISOString();
const newGate = {
  ...(gate || {}),
  decision,
  note: note || null,
  decidedAt,
  status: decision === 'approve' ? 'approved' : 'rejected',
  awaitingReview: false,
};

writeFileSync(join(runDir, 'review-gate.json'), JSON.stringify(newGate, null, 2) + '\n');

console.log('');
console.log(`  ✓  Decision recorded: ${decision}`);
if (note) console.log(`     Note: ${note}`);
console.log(`     Written to: ${join(runDir, 'review-gate.json')}`);
console.log('');

// ─── helpers ──────────────────────────────────────────────────────────────────

function listRuns() {
  if (!existsSync(RUNS_DIR)) {
    console.log('No runs directory found.');
    return;
  }
  const entries = readdirSync(RUNS_DIR)
    .filter((d) => !d.startsWith('.') && d !== 'README.md')
    .sort()
    .reverse();

  if (entries.length === 0) {
    console.log('No runs found. Run: npm run workflow:local -- --case <caseId>');
    return;
  }

  console.log('\nRuns (newest first):\n');
  for (const runId of entries) {
    const gate = readJsonFromDir(join(RUNS_DIR, runId), 'review-gate.json');
    const meta = readJsonFromDir(join(RUNS_DIR, runId), 'metadata.json');
    const status = gate?.status || 'unknown';
    const mode = meta?.mode || '?';
    console.log(`  ${runId}`);
    console.log(`    mode: ${mode} | status: ${status} | decision: ${gate?.decision || 'none'}`);
    console.log('');
  }
}

function readJsonFromDir(dir, filename) {
  try {
    return JSON.parse(readFileSync(join(dir, filename), 'utf8'));
  } catch {
    return null;
  }
}
