/**
 * tests/stage02.test.mjs — tests for Stage 02 (candidate discovery) logic and
 * its live orchestrator.
 *
 * All tests use a mock provider/spawnFn — NO real Claude CLI is invoked.
 *
 * Coverage:
 *   stage02:          buildSystemPrompt, buildUserMessage, parseAndValidateOutput
 *   runStage02Local:  approval precondition, artifact writing, metadata update,
 *                     stage failure handling, no-candidates result
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
} from '../lib/workflow/stage02.mjs';

import { runStage02Local } from '../lib/workflow/runStage02Local.mjs';

// ─── helpers ──────────────────────────────────────────────────────────────────

const VALID_SOURCE = {
  sourceId: 'src-1',
  url: 'https://example.gov/water-regulation',
  title: 'Water Regulation 2024',
  publisher: 'Ministry of Water',
  publicationDate: '2024-01-01',
  retrievedAt: '2026-06-15T00:00:00Z',
  sourceType: 'regulation',
  qualityTier: 'A',
};

const VALID_SIGNAL = {
  signalId: 'sig-1',
  claim: 'Italy requires water utilities to reduce losses below 15%.',
  signalType: 'regulation',
  relevance: 'high',
  confidence: 0.9,
  uncertainty: 'Exact enforcement date unclear.',
  sourceIds: ['src-1'],
  metadata: { runId: 'run-test', stage: 'market-signals', createdAt: '2026-06-15T00:00:00Z' },
};

const VALID_CANDIDATE = (runId = 'run-test') => ({
  candidateId: 'cand-1',
  name: 'Acquedotto Esempio S.p.A.',
  organisationType: 'multi-utility-company',
  location: { country: 'Italy', region: 'Lombardy' },
  relevanceEvidence: [
    { claim: 'Subject to the new loss-reduction rule.', signalIds: ['sig-1'], sourceIds: ['src-1'] },
  ],
  confidence: 0.75,
  uncertainty: 'Ownership structure unclear.',
  metadata: { runId, stage: 'candidate-discovery', createdAt: '2026-06-15T00:00:00Z' },
});

const REQUEST = {
  targetMarket: 'Italy',
  targetCustomerType: 'drinking-water utilities and multi-utility companies',
  solutionDescription: 'AI leak-detection software',
  businessObjective: 'Find 5+ qualified leads for outbound marketing',
  constraints: ['Italy only'],
};

// ─── stage02: prompt builders ─────────────────────────────────────────────────

test('buildSystemPrompt: returns a non-empty string', () => {
  const sp = buildSystemPrompt();
  assert.equal(typeof sp, 'string');
  assert.ok(sp.length > 10);
});

test('buildUserMessage: includes request fields and upstream sources/signals', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(
    REQUEST, ctx, [VALID_SOURCE], [VALID_SIGNAL], 'run-test', '2026-06-15T00:00:00Z'
  );
  assert.ok(msg.includes(REQUEST.targetMarket), 'should include targetMarket');
  assert.ok(msg.includes(REQUEST.businessObjective), 'should include businessObjective');
  assert.ok(msg.includes('src-1'), 'should include upstream source data');
  assert.ok(msg.includes('sig-1'), 'should include upstream signal data');
  assert.ok(msg.includes('multi-utility-company'), 'should document the multi-utility-company enum value');
});

test('buildUserMessage: includes stage contract from CONTEXT.md', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_SOURCE], [VALID_SIGNAL], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('Candidate Discovery'), 'should include stage content from CONTEXT.md');
});

test('buildUserMessage: includes JSON output format instruction', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_SOURCE], [VALID_SIGNAL], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('"candidates"'), 'should instruct about candidates field');
});

// ─── stage02: parseAndValidateOutput ─────────────────────────────────────────

test('parseAndValidateOutput: returns validated candidates', () => {
  const providerResult = {
    structuredOutput: { candidates: [VALID_CANDIDATE()] },
    warnings: [],
    content: '{}',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.warnings.length, 0);
});

test('parseAndValidateOutput: throws when structuredOutput is null', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: null, warnings: [], content: '' }, [], []),
    /no parseable JSON/
  );
});

test('parseAndValidateOutput: throws when candidates array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: {}, warnings: [], content: '' }, [], []),
    /missing "candidates"/
  );
});

test('parseAndValidateOutput: empty candidates array is accepted (zero findings)', () => {
  const providerResult = { structuredOutput: { candidates: [] }, warnings: [], content: '{}' };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 0);
});

test('parseAndValidateOutput: drops candidate with invalid schema and warns', () => {
  const badCandidate = { candidateId: 'cand-bad', name: 'Bad Co' }; // missing required fields
  const providerResult = {
    structuredOutput: { candidates: [VALID_CANDIDATE(), badCandidate] },
    warnings: [],
    content: '',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 1, 'invalid candidate should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('cand-bad')));
});

test('parseAndValidateOutput: drops candidate referencing an unknown signalId', () => {
  const badRef = { ...VALID_CANDIDATE(), relevanceEvidence: [{ claim: 'x', signalIds: ['sig-missing'], sourceIds: ['src-1'] }] };
  const providerResult = { structuredOutput: { candidates: [badRef] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('sig-missing')));
});

test('parseAndValidateOutput: drops candidate referencing an unknown sourceId', () => {
  const badRef = { ...VALID_CANDIDATE(), relevanceEvidence: [{ claim: 'x', signalIds: ['sig-1'], sourceIds: ['src-missing'] }] };
  const providerResult = { structuredOutput: { candidates: [badRef] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('src-missing')));
});

test('parseAndValidateOutput: drops duplicate candidate (same name + country)', () => {
  const dup = { ...VALID_CANDIDATE(), candidateId: 'cand-2' };
  const providerResult = {
    structuredOutput: { candidates: [VALID_CANDIDATE(), dup] },
    warnings: [],
    content: '',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 1, 'the second, duplicate candidate should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('duplicate')));
});

test('parseAndValidateOutput: accepts multi-utility-company as an organisationType', () => {
  const cand = { ...VALID_CANDIDATE(), organisationType: 'multi-utility-company' };
  const providerResult = { structuredOutput: { candidates: [cand] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE], [VALID_SIGNAL]);
  assert.equal(result.candidates.length, 1);
});

// ─── runStage02Local: orchestration ──────────────────────────────────────────

const MOCK_PROVIDER = {
  generate: async () => ({
    content: JSON.stringify({ candidates: [VALID_CANDIDATE('run-x')] }),
    structuredOutput: { candidates: [VALID_CANDIDATE('run-x')] },
    provider: 'local-cli',
    model: 'sonnet',
    executionMode: 'local-cli',
    startedAt: '2026-06-15T00:00:00Z',
    completedAt: '2026-06-15T00:01:00Z',
    latencyMs: 5000,
    usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
    toolActivity: 'not_available',
    warnings: [],
    rawProviderOutput: { exitCode: 0 },
    estimatedApiCost: 'not_applicable',
    subscriptionUsage: 'not_available',
  }),
};

/** Seed a fake run directory as if Stage 01 already ran and was approved. */
function seedApprovedRun(baseDir, runId, overrides = {}) {
  const dir = join(baseDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'request.json'), JSON.stringify({ ...REQUEST, runId, mode: 'local-cli', createdAt: '2026-06-15T00:00:00.000Z' }));
  writeFileSync(join(dir, '00-sources.json'), JSON.stringify([VALID_SOURCE]));
  writeFileSync(join(dir, '01-market-signals.json'), JSON.stringify([VALID_SIGNAL]));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    runId, workflow: 'market-opportunity', mode: 'local-cli',
    createdAt: '2026-06-15T00:00:00.000Z', completedAt: '2026-06-15T00:01:00.000Z',
    stagesCompleted: ['market-signals'], schemaVersion: '1.0.0',
    reviewGates: { gate1: 'pending', gate2: 'pending' },
  }));
  writeFileSync(join(dir, 'review-gate.json'), JSON.stringify({
    runId, stage: 'market-signals', status: 'stage_01_completed', awaitingReview: false,
    stageError: null, decision: 'approve', note: null, decidedAt: '2026-06-15T00:02:00.000Z',
    ...overrides,
  }));
  return dir;
}

test('runStage02Local: refuses to run when Stage 01 was never approved', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  try {
    seedApprovedRun(base, 'run-unapproved', { decision: null, status: 'stage_01_completed' });
    await assert.rejects(
      () => runStage02Local('run-unapproved', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not been approved/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: refuses to run when Stage 01 was rejected', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  try {
    seedApprovedRun(base, 'run-rejected', { decision: 'reject', status: 'rejected' });
    await assert.rejects(
      () => runStage02Local('run-rejected', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not been approved/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: refuses to run when the run does not exist at all', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  try {
    await assert.rejects(
      () => runStage02Local('no-such-run', { baseDir: base, _provider: MOCK_PROVIDER }),
      /no review-gate\.json found/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: writes candidates and raw output for an approved run', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  try {
    seedApprovedRun(base, 'run-approved');
    const result = await runStage02Local('run-approved', { baseDir: base, _provider: MOCK_PROVIDER });

    assert.equal(result.status, 'stage_02_completed');
    assert.equal(result.candidateCount, 1);
    assert.ok(result.files.includes('02-candidates.json'));
    assert.ok(result.files.includes('02-raw-output.json'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: updates metadata.stagesCompleted to include candidate-discovery', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  try {
    const { readFileSync } = await import('node:fs');
    seedApprovedRun(base, 'run-approved-2');
    const result = await runStage02Local('run-approved-2', { baseDir: base, _provider: MOCK_PROVIDER });
    const meta = JSON.parse(readFileSync(join(result.dir, 'metadata.json'), 'utf8'));
    assert.deepEqual(meta.stagesCompleted, ['market-signals', 'candidate-discovery']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: does not silently fall back to mock on provider error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  const brokenProvider = { generate: async () => { throw new Error('provider unavailable'); } };
  try {
    seedApprovedRun(base, 'run-approved-3');
    await assert.rejects(
      () => runStage02Local('run-approved-3', { baseDir: base, _provider: brokenProvider }),
      /Stage 02 failed/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: writes a stage-failure file on error, preserving artifacts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  const brokenProvider = { generate: async () => { throw new Error('timeout'); } };
  try {
    const { existsSync, readFileSync } = await import('node:fs');
    seedApprovedRun(base, 'run-approved-4');
    await assert.rejects(() => runStage02Local('run-approved-4', { baseDir: base, _provider: brokenProvider }));
    const failurePath = join(base, 'run-approved-4', '02-stage-failure.json');
    assert.ok(existsSync(failurePath));
    const failure = JSON.parse(readFileSync(failurePath, 'utf8'));
    assert.equal(failure.stage, 'candidate-discovery');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage02Local: zero candidates found is reported as its own status, not an error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage02-'));
  const emptyProvider = {
    generate: async () => ({
      content: JSON.stringify({ candidates: [] }),
      structuredOutput: { candidates: [] },
      provider: 'local-cli', model: 'sonnet', executionMode: 'local-cli',
      startedAt: '2026-06-15T00:00:00Z', completedAt: '2026-06-15T00:00:30Z', latencyMs: 30000,
      usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
      toolActivity: 'not_available', warnings: [], rawProviderOutput: { exitCode: 0 },
      estimatedApiCost: 'not_applicable', subscriptionUsage: 'not_available',
    }),
  };
  try {
    seedApprovedRun(base, 'run-approved-5');
    const result = await runStage02Local('run-approved-5', { baseDir: base, _provider: emptyProvider });
    assert.equal(result.status, 'stage_02_no_candidates_found');
    assert.equal(result.candidateCount, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
