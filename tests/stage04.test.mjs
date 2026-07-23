/**
 * tests/stage04.test.mjs — tests for Stage 04 (opportunity scoring) logic and
 * its live orchestrator.
 *
 * All tests use a mock provider — NO real Claude CLI is invoked.
 *
 * Coverage:
 *   stage04:          buildSystemPrompt, buildUserMessage, parseAndValidateOutput
 *   runStage04Local:  approval + Stage-03-completed + Gate-1-approved
 *                     preconditions, artifact writing, metadata update, stage
 *                     failure handling, no-scores result
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildSystemPrompt,
  buildUserMessage,
  loadStageContext,
  parseAndValidateOutput,
} from '../lib/workflow/stage04.mjs';

import { runStage04Local } from '../lib/workflow/runStage04Local.mjs';

// ─── helpers ──────────────────────────────────────────────────────────────────

const VALID_CANDIDATE = {
  candidateId: 'cand-1',
  name: 'Acquedotto Esempio S.p.A.',
  organisationType: 'multi-utility-company',
  location: { country: 'Italy', region: 'Lombardy' },
  relevanceEvidence: [
    { claim: 'Subject to the new loss-reduction rule.', signalIds: ['sig-1'], sourceIds: ['src-1'] },
  ],
  confidence: 0.75,
  uncertainty: 'Ownership structure unclear.',
  metadata: { runId: 'run-test', stage: 'candidate-discovery', createdAt: '2026-07-23T00:00:00Z' },
};

const VALID_VALIDATED_EVIDENCE = {
  evidenceId: 'ev-1',
  claim: 'Italy requires water utilities to reduce losses below 15%.',
  validationStatus: 'validated',
  supportingSourceIds: ['src-1'],
  recencyOk: true,
  confidence: 0.85,
  metadata: { runId: 'run-test', stage: 'evidence-validation', createdAt: '2026-07-23T00:00:00Z' },
};

const VALID_SCORE = (runId = 'run-test', candidateId = 'cand-1') => ({
  candidateId,
  dimensions: {
    utilitySize: { score: 3, justification: 'Population served ~200k per ev-1.' },
    nrwEvidence: { score: 4, justification: 'Named NRW programme per ev-1.' },
    regionFit: { score: 5, justification: 'Confirmed Italian operator per ev-1.' },
    targetRolePresence: { score: 2, justification: 'inference — no validated evidence' },
    momentumSignal: { score: 0, justification: 'inference — no validated evidence' },
  },
  totalScore: 14,
  rationale: 'Strong regional and size fit; role and momentum unconfirmed.',
  metadata: { runId, stage: 'opportunity-scoring', createdAt: '2026-07-23T00:00:00Z' },
});

const REQUEST = {
  targetMarket: 'Italy',
  targetCustomerType: 'drinking-water utilities and multi-utility companies',
  solutionDescription: 'AI leak-detection software',
  businessObjective: 'Find 5+ qualified leads for outbound marketing',
  constraints: ['Italy only'],
};

// ─── stage04: prompt builders ─────────────────────────────────────────────────

test('buildSystemPrompt: returns a non-empty string', () => {
  const sp = buildSystemPrompt();
  assert.equal(typeof sp, 'string');
  assert.ok(sp.length > 10);
});

test('buildUserMessage: includes request fields and upstream data', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(
    REQUEST, ctx, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE], 'run-test', '2026-07-23T00:00:00Z'
  );
  assert.ok(msg.includes(REQUEST.targetMarket), 'should include targetMarket');
  assert.ok(msg.includes(REQUEST.businessObjective), 'should include businessObjective');
  assert.ok(msg.includes('cand-1'), 'should include upstream candidate data');
  assert.ok(msg.includes('ev-1'), 'should include upstream validated evidence');
});

test('buildUserMessage: includes stage contract from CONTEXT.md', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('Opportunity Scoring'), 'should include stage content from CONTEXT.md');
});

test('buildUserMessage: includes JSON output format instruction', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('"scores"'), 'should instruct about scores field');
  assert.ok(msg.includes('totalScore'), 'should instruct about totalScore field');
});

// ─── stage04: parseAndValidateOutput ─────────────────────────────────────────

test('parseAndValidateOutput: returns scores', () => {
  const providerResult = {
    structuredOutput: { scores: [VALID_SCORE()] },
    warnings: [],
    content: '{}',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE]);
  assert.equal(result.scores.length, 1);
  assert.equal(result.warnings.length, 0);
});

test('parseAndValidateOutput: throws when structuredOutput is null', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: null, warnings: [], content: '' }, []),
    /no parseable JSON/
  );
});

test('parseAndValidateOutput: throws when "scores" array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: {}, warnings: [], content: '' }, []),
    /missing "scores"/
  );
});

test('parseAndValidateOutput: recomputes totalScore when it does not match the sum', () => {
  const wrongSum = { ...VALID_SCORE(), totalScore: 999 };
  const providerResult = { structuredOutput: { scores: [wrongSum] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE]);
  assert.equal(result.scores.length, 1);
  assert.equal(result.scores[0].totalScore, 14, 'should be recomputed from the five dimensions');
  assert.ok(result.warnings.some((w) => w.includes('Corrected totalScore')));
});

test('parseAndValidateOutput: drops score with invalid schema and warns', () => {
  const badItem = { candidateId: 'cand-1' }; // missing dimensions, totalScore, etc.
  const providerResult = { structuredOutput: { scores: [badItem] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE]);
  assert.equal(result.scores.length, 0, 'invalid item should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('cand-1')));
});

test('parseAndValidateOutput: drops score referencing an unknown candidateId', () => {
  const badRef = VALID_SCORE('run-test', 'cand-missing');
  const providerResult = { structuredOutput: { scores: [badRef] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE]);
  assert.equal(result.scores.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('not found in Stage 02 candidates')));
});

test('parseAndValidateOutput: drops duplicate score for the same candidate', () => {
  const dup = VALID_SCORE();
  const providerResult = { structuredOutput: { scores: [VALID_SCORE(), dup] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE]);
  assert.equal(result.scores.length, 1, 'the second, duplicate score should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('duplicate')));
});

// ─── runStage04Local: orchestration ──────────────────────────────────────────

const MOCK_PROVIDER = {
  generate: async () => ({
    content: JSON.stringify({ scores: [VALID_SCORE('run-x')] }),
    structuredOutput: { scores: [VALID_SCORE('run-x')] },
    provider: 'local-cli',
    model: 'sonnet',
    executionMode: 'local-cli',
    startedAt: '2026-07-23T00:00:00Z',
    completedAt: '2026-07-23T00:01:00Z',
    latencyMs: 5000,
    usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
    toolActivity: 'not_available',
    warnings: [],
    rawProviderOutput: { exitCode: 0 },
    estimatedApiCost: 'not_applicable',
    subscriptionUsage: 'not_available',
  }),
};

/** Seed a fake run directory as if Stage 01-03 already ran, Stage 01 approved, Gate 1 approved. */
function seedRun(baseDir, runId, {
  stagesCompleted = ['market-signals', 'candidate-discovery', 'evidence-validation'],
  gateOverrides = {},
  reviewGates = { gate1: 'approved', gate2: 'pending' },
} = {}) {
  const dir = join(baseDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'request.json'), JSON.stringify({ ...REQUEST, runId, mode: 'local-cli', createdAt: '2026-07-23T00:00:00.000Z' }));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify([VALID_CANDIDATE]));
  writeFileSync(join(dir, '03-validation.json'), JSON.stringify({ validated: [VALID_VALIDATED_EVIDENCE], rejected: [] }));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    runId, workflow: 'market-opportunity', mode: 'local-cli',
    createdAt: '2026-07-23T00:00:00.000Z', completedAt: '2026-07-23T00:02:00.000Z',
    stagesCompleted, schemaVersion: '1.0.0',
    reviewGates,
  }));
  writeFileSync(join(dir, 'review-gate.json'), JSON.stringify({
    runId, stage: 'market-signals', status: 'stage_01_completed', awaitingReview: false,
    stageError: null, decision: 'approve', note: null, decidedAt: '2026-07-23T00:02:30.000Z',
    ...gateOverrides,
  }));
  return dir;
}

test('runStage04Local: refuses to run when Stage 01 was never approved', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  try {
    seedRun(base, 'run-unapproved', { gateOverrides: { decision: null, status: 'stage_01_completed' } });
    await assert.rejects(
      () => runStage04Local('run-unapproved', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not been approved/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: refuses to run when the run does not exist at all', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  try {
    await assert.rejects(
      () => runStage04Local('no-such-run', { baseDir: base, _provider: MOCK_PROVIDER }),
      /no review-gate\.json found/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: refuses to run when Stage 03 has not completed yet', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  try {
    seedRun(base, 'run-no-stage03', { stagesCompleted: ['market-signals', 'candidate-discovery'] });
    await assert.rejects(
      () => runStage04Local('run-no-stage03', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not completed Stage 03/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: refuses to run when Review Gate 1 is not approved', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  try {
    seedRun(base, 'run-gate1-pending', { reviewGates: { gate1: 'pending', gate2: 'pending' } });
    await assert.rejects(
      () => runStage04Local('run-gate1-pending', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not passed Review Gate 1/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: writes scores and raw output for an approved, gate-1-cleared run', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  try {
    seedRun(base, 'run-approved');
    const result = await runStage04Local('run-approved', { baseDir: base, _provider: MOCK_PROVIDER });

    assert.equal(result.status, 'stage_04_completed');
    assert.equal(result.scoredCount, 1);
    assert.ok(result.files.includes('04-scores.json'));
    assert.ok(result.files.includes('04-raw-output.json'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: updates metadata.stagesCompleted to include opportunity-scoring', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  try {
    const { readFileSync } = await import('node:fs');
    seedRun(base, 'run-approved-2');
    const result = await runStage04Local('run-approved-2', { baseDir: base, _provider: MOCK_PROVIDER });
    const meta = JSON.parse(readFileSync(join(result.dir, 'metadata.json'), 'utf8'));
    assert.deepEqual(meta.stagesCompleted, ['market-signals', 'candidate-discovery', 'evidence-validation', 'opportunity-scoring']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: does not silently fall back to mock on provider error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  const brokenProvider = { generate: async () => { throw new Error('provider unavailable'); } };
  try {
    seedRun(base, 'run-approved-3');
    await assert.rejects(
      () => runStage04Local('run-approved-3', { baseDir: base, _provider: brokenProvider }),
      /Stage 04 failed/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: writes a stage-failure file on error, preserving artifacts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  const brokenProvider = { generate: async () => { throw new Error('timeout'); } };
  try {
    const { existsSync, readFileSync } = await import('node:fs');
    seedRun(base, 'run-approved-4');
    await assert.rejects(() => runStage04Local('run-approved-4', { baseDir: base, _provider: brokenProvider }));
    const failurePath = join(base, 'run-approved-4', '04-stage-failure.json');
    assert.ok(existsSync(failurePath));
    const failure = JSON.parse(readFileSync(failurePath, 'utf8'));
    assert.equal(failure.stage, 'opportunity-scoring');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage04Local: zero scores is reported as its own status, not an error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage04-'));
  const noScoresProvider = {
    generate: async () => ({
      content: JSON.stringify({ scores: [] }),
      structuredOutput: { scores: [] },
      provider: 'local-cli', model: 'sonnet', executionMode: 'local-cli',
      startedAt: '2026-07-23T00:00:00Z', completedAt: '2026-07-23T00:00:30Z', latencyMs: 30000,
      usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
      toolActivity: 'not_available', warnings: [], rawProviderOutput: { exitCode: 0 },
      estimatedApiCost: 'not_applicable', subscriptionUsage: 'not_available',
    }),
  };
  try {
    seedRun(base, 'run-approved-5');
    const result = await runStage04Local('run-approved-5', { baseDir: base, _provider: noScoresProvider });
    assert.equal(result.status, 'stage_04_no_scores');
    assert.equal(result.scoredCount, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
