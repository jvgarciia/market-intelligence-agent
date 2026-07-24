/**
 * scripts/review-gate.mjs — developer CLI for Review Gate 1 and Review Gate 2.
 *
 *   npm run workflow:review2 -- --run <run-id> --gate 1
 *   npm run workflow:review2 -- --run <run-id> --gate 2
 *   npm run workflow:review2 -- --run <run-id> --gate 1 --decision approve [--note "text"]
 *   npm run workflow:review2 -- --list
 *
 * Gate 1 (per workflows/market-opportunity/CONTEXT.md) sits after Stage 03
 * (evidence-validation): a person checks that Stage 02 candidates and Stage 03
 * validated/rejected evidence look right before scoring runs on top of them.
 * Gate 2 sits after Stage 05 (opportunity-brief): a person confirms the
 * fact/interpretation split and every flagged verification item before a
 * brief is treated as final.
 *
 * Before this script, both gates were recorded by hand-editing
 * metadata.json's reviewGates.gate1/gate2 (and, for gate 2, a hand-written
 * 05-review-gate.json) — the same gap Stage 01's review-run.mjs already
 * solved for the pre-Stage-01 decision. This closes it for gate 1 and gate 2.
 *
 * The decision updates metadata.json → reviewGates.gate<N> (the field every
 * downstream stage and buildContactsMaster.mjs actually reads) and writes a
 * human-readable record to 03-review-gate.json (gate 1) or 05-review-gate.json
 * (gate 2), matching the file already in use for gate 2 on past runs.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertArtifact } from '../lib/workflow/schemas.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(here, '..', 'runs');

const GATES = {
  1: { stage: 'evidence-validation', requiredStage: 'evidence-validation', gateKey: 'gate1', file: '03-review-gate.json' },
  2: { stage: 'opportunity-brief', requiredStage: 'opportunity-brief', gateKey: 'gate2', file: '05-review-gate.json' },
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runFlag = args.indexOf('--run');
const gateFlag = args.indexOf('--gate');
const listFlag = args.includes('--list') || args.includes('-l');
const helpFlag = args.includes('--help') || args.includes('-h');
const decisionFlag = args.indexOf('--decision');
const nonInteractiveDecision = decisionFlag !== -1 ? args[decisionFlag + 1] : null;
const noteFlag = args.indexOf('--note');
const nonInteractiveNote = noteFlag !== -1 ? args[noteFlag + 1] : null;

if (helpFlag) {
  console.log(`
Usage: npm run workflow:review2 -- --run <run-id> --gate <1|2>
       npm run workflow:review2 -- --run <run-id> --gate <1|2> --decision approve [--note "text"]
       npm run workflow:review2 -- --list

Options:
  --run <id>          Run to review
  --gate <1|2>        Which review gate to record (1 = after Stage 03, 2 = after Stage 05)
  --list              List all runs with gate1/gate2 status
  --decision <val>    Record decision non-interactively (approve|changes-requested|skip)
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
const gateNum = gateFlag !== -1 ? args[gateFlag + 1] : null;

if (!runId) {
  console.error('✗  --run <run-id> is required.');
  console.error('   Use --list to see available runs.');
  process.exit(1);
}

if (!gateNum || !GATES[gateNum]) {
  console.error('✗  --gate <1|2> is required.');
  process.exit(1);
}

const gate = GATES[gateNum];

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

const metadata = readJson('metadata.json');

if (!metadata) {
  console.error(`✗  No metadata.json found for run ${runId}.`);
  process.exit(1);
}

if (!metadata.stagesCompleted.includes(gate.requiredStage)) {
  console.error(
    `✗  Run ${runId} has not completed Stage ${gateNum === '1' ? '03 (evidence-validation)' : '05 (opportunity-brief)'} yet.`
  );
  console.error(`   stagesCompleted: ${metadata.stagesCompleted.join(', ') || '(none)'}`);
  process.exit(1);
}

const existingGateFile = readJson(gate.file);

// ─── display ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  Review Gate ${gateNum} — Run ${runId}`);
console.log('══════════════════════════════════════════════════════════\n');

console.log(`  Mode:    ${metadata.mode}`);
console.log(`  Gate ${gateNum} status: ${metadata.reviewGates?.[gate.gateKey] || 'unknown'}`);
console.log(`  Created: ${metadata.createdAt}`);

if (existingGateFile?.decision) {
  console.log(`\n  ⚠  This gate has already been reviewed.`);
  console.log(`  Decision: ${existingGateFile.decision}`);
  if (existingGateFile.note) console.log(`  Note:     ${existingGateFile.note}`);
  console.log(`  Decided:  ${existingGateFile.decidedAt}`);
}

if (gateNum === '1') {
  displayGate1();
} else {
  displayGate2();
}

function displayGate1() {
  const candidates = readJson('02-candidates.json') || [];
  const validation = readJson('03-validation.json') || { validated: [], rejected: [] };

  console.log('\n─── Candidates (Stage 02) ────────────────────────────────\n');
  if (candidates.length === 0) {
    console.log('  (no candidates)');
  } else {
    for (const c of candidates) {
      console.log(`  ${c.candidateId} — ${c.name} [${c.organisationType}] ${c.location?.region || ''}, ${c.location?.country || ''}`);
    }
  }

  console.log(`\n─── Evidence Validation (Stage 03) ───────────────────────\n`);
  console.log(`  Validated: ${validation.validated.length}   Rejected: ${validation.rejected.length}`);

  if (validation.validated.length) {
    console.log('\n  Validated claims:');
    for (const ev of validation.validated) {
      console.log(`   ✓ [${ev.evidenceId}] ${ev.claim}`);
    }
  }

  if (validation.rejected.length) {
    console.log('\n  Rejected claims:');
    for (const ev of validation.rejected) {
      console.log(`   ✗ [${ev.evidenceId}] (${ev.rejectionReason}) ${ev.claim}`);
    }
  }
}

function displayGate2() {
  const briefs = readJson('05-briefs.json') || [];

  console.log('\n─── Opportunity Briefs (Stage 05) ────────────────────────\n');
  if (briefs.length === 0) {
    console.log('  (no briefs — nothing survived Stage 05)');
  } else {
    for (const b of briefs) {
      console.log(`  ${b.candidateId} — ${b.title}`);
      if (b.humanVerificationRequired?.length) {
        console.log(`    Verification needed:`);
        for (const item of b.humanVerificationRequired) console.log(`      - ${item}`);
      }
      if (b.contacts?.length) {
        for (const c of b.contacts) {
          console.log(`    Contact: ${c.name} — ${c.role} (${c.sourceType}, confidence ${c.confidence})`);
        }
      }
      console.log('');
    }
  }
  console.log(`  Full human-readable brief: ${join(runDir, '05-brief.md')}`);
}

// ─── review decision ──────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log('  Review Decision');
console.log('══════════════════════════════════════════════════════════\n');
console.log('  Options:');
console.log('    approve            — this gate is cleared');
console.log('    changes-requested  — needs rework before it can be treated as final');
console.log('    skip               — exit without recording a decision');
console.log('');

let decision;
let note = '';

if (nonInteractiveDecision) {
  decision = nonInteractiveDecision.trim().toLowerCase();
  note = nonInteractiveNote ? nonInteractiveNote.trim() : '';
  if (!['approve', 'changes-requested', 'skip'].includes(decision)) {
    console.error(`\n  ✗  Invalid --decision value: "${decision}". Use approve, changes-requested, or skip.\n`);
    process.exit(1);
  }
  console.log(`  Decision: ${decision}${note ? ` — "${note}"` : ''}`);
} else {
  const rl = createInterface({ input, output });
  decision = (await rl.question('  Decision (approve / changes-requested / skip): ')).trim().toLowerCase();

  if (!['approve', 'changes-requested', 'skip'].includes(decision)) {
    console.log('\n  Unrecognised input. No decision recorded.\n');
    rl.close();
    process.exit(0);
  }

  if (decision === 'skip') {
    console.log('\n  Skipped. No decision recorded.\n');
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
const gateStatus = decision === 'approve' ? 'approved' : 'changes-requested';

const newGateFile = {
  runId,
  stage: gate.stage,
  decision,
  note: note || null,
  decidedAt,
};

writeFileSync(join(runDir, gate.file), JSON.stringify(newGateFile, null, 2) + '\n');

const updatedMetadata = assertArtifact('run-metadata', {
  ...metadata,
  reviewGates: {
    ...metadata.reviewGates,
    [gate.gateKey]: gateStatus,
  },
});
writeFileSync(join(runDir, 'metadata.json'), JSON.stringify(updatedMetadata, null, 2) + '\n');

console.log('');
console.log(`  ✓  Decision recorded: ${decision}`);
if (note) console.log(`     Note: ${note}`);
console.log(`     metadata.json → reviewGates.${gate.gateKey} = "${gateStatus}"`);
console.log(`     Written to: ${join(runDir, gate.file)}`);
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
    console.log('No runs found.');
    return;
  }

  console.log('\nRuns (newest first):\n');
  for (const id of entries) {
    const meta = readJsonFromDir(join(RUNS_DIR, id), 'metadata.json');
    if (!meta) continue;
    console.log(`  ${id}`);
    console.log(`    mode: ${meta.mode} | gate1: ${meta.reviewGates?.gate1 || 'unknown'} | gate2: ${meta.reviewGates?.gate2 || 'unknown'}`);
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
