/**
 * tests/stage03.test.mjs — tests for Stage 03 (evidence validation) logic and
 * its live orchestrator.
 *
 * All tests use a mock provider — NO real Claude CLI is invoked.
 *
 * Coverage:
 *   stage03:          buildSystemPrompt, buildUserMessage, parseAndValidateOutput
 *   runStage03Local:  approval + Stage-02-completed preconditions, artifact
 *                     writing, metadata update, stage failure handling,
 *                     no-validated-evidence result
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
} from '../lib/workflow/stage03.mjs';

import { runStage03Local } from '../lib/workflow/runStage03Local.mjs';

// ─── helpers ──────────────────────────────────────────────────────────────────

const VALID_SOURCE = {
  sourceId: 'src-1',
  url: 'https://example.gov/water-regulation',
  title: 'Water Regulation 2024',
  publisher: 'Ministry of Water',
  publicationDate: '2024-01-01',
  retrievedAt: '2026-07-23T00:00:00Z',
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
  metadata: { runId: 'run-test', stage: 'market-signals', createdAt: '2026-07-23T00:00:00Z' },
};

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

const VALID_VALIDATED = (runId = 'run-test') => ({
  evidenceId: 'ev-1',
  claim: 'Italy requires water utilities to reduce losses below 15%.',
  validationStatus: 'validated',
  supportingSourceIds: ['src-1'],
  recencyOk: true,
  confidence: 0.85,
  metadata: { runId, stage: 'evidence-validation', createdAt: '2026-07-23T00:00:00Z' },
});

const VALID_REJECTED = (runId = 'run-test') => ({
  evidenceId: 'ev-2',
  claim: 'Utilities are rapidly replacing all infrastructure.',
  rejectionReason: 'weak-evidence',
  notes: 'Only a Tier-C source; overstated claim.',
  metadata: { runId, stage: 'evidence-validation', createdAt: '2026-07-23T00:00:00Z' },
});

const REQUEST = {
  targetMarket: 'Italy',
  targetCustomerType: 'drinking-water utilities and multi-utility companies',
  solutionDescription: 'AI leak-detection software',
  businessObjective: 'Find 5+ qualified leads for outbound marketing',
  constraints: ['Italy only'],
};

// ─── stage03: prompt builders ─────────────────────────────────────────────────

test('buildSystemPrompt: returns a non-empty string', () => {
  const sp = buildSystemPrompt();
  assert.equal(typeof sp, 'string');
  assert.ok(sp.length > 10);
});

test('buildUserMessage: includes request fields and upstream data', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(
    REQUEST, ctx, [VALID_SOURCE], [VALID_SIGNAL], [VALID_CANDIDATE], 'run-test', '2026-07-23T00:00:00Z'
  );
  assert.ok(msg.includes(REQUEST.targetMarket), 'should include targetMarket');
  assert.ok(msg.includes(REQUEST.businessObjective), 'should include businessObjective');
  assert.ok(msg.includes('src-1'), 'should include upstream source data');
  assert.ok(msg.includes('sig-1'), 'should include upstream signal data');
  assert.ok(msg.includes('cand-1'), 'should include upstream candidate data');
});

test('buildUserMessage: includes stage contract from CONTEXT.md', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_SOURCE], [VALID_SIGNAL], [VALID_CANDIDATE], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('Evidence Validation'), 'should include stage content from CONTEXT.md');
});

test('buildUserMessage: includes JSON output format instruction', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_SOURCE], [VALID_SIGNAL], [VALID_CANDIDATE], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('"validated"'), 'should instruct about validated field');
  assert.ok(msg.includes('"rejected"'), 'should instruct about rejected field');
});

// ─── stage03: parseAndValidateOutput ─────────────────────────────────────────

test('parseAndValidateOutput: returns validated and rejected items', () => {
  const providerResult = {
    structuredOutput: { validated: [VALID_VALIDATED()], rejected: [VALID_REJECTED()] },
    warnings: [],
    content: '{}',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.validated.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.warnings.length, 0);
});

test('parseAndValidateOutput: throws when structuredOutput is null', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: null, warnings: [], content: '' }, []),
    /no parseable JSON/
  );
});

test('parseAndValidateOutput: throws when "validated" array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: { rejected: [] }, warnings: [], content: '' }, []),
    /missing "validated"/
  );
});

test('parseAndValidateOutput: throws when "rejected" array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: { validated: [] }, warnings: [], content: '' }, []),
    /missing "rejected"/
  );
});

test('parseAndValidateOutput: everything rejected (empty validated) is accepted', () => {
  const providerResult = {
    structuredOutput: { validated: [], rejected: [VALID_REJECTED()] },
    warnings: [],
    content: '{}',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.validated.length, 0);
  assert.equal(result.rejected.length, 1);
});

test('parseAndValidateOutput: drops validated item with invalid schema and warns', () => {
  const badItem = { evidenceId: 'ev-bad', claim: 'x' }; // missing required fields
  const providerResult = {
    structuredOutput: { validated: [VALID_VALIDATED(), badItem], rejected: [] },
    warnings: [],
    content: '',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.validated.length, 1, 'invalid item should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('ev-bad')));
});

test('parseAndValidateOutput: drops validated item referencing an unknown sourceId', () => {
  const badRef = { ...VALID_VALIDATED(), evidenceId: 'ev-3', supportingSourceIds: ['src-missing'] };
  const providerResult = { structuredOutput: { validated: [badRef], rejected: [] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.validated.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('src-missing')));
});

test('parseAndValidateOutput: drops duplicate validated claim', () => {
  const dup = { ...VALID_VALIDATED(), evidenceId: 'ev-4' };
  const providerResult = {
    structuredOutput: { validated: [VALID_VALIDATED(), dup], rejected: [] },
    warnings: [],
    content: '',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.validated.length, 1, 'the second, duplicate validated claim should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('duplicate')));
});

test('parseAndValidateOutput: drops rejected item with invalid rejectionReason', () => {
  const badReason = { ...VALID_REJECTED(), rejectionReason: 'not-a-real-reason' };
  const providerResult = { structuredOutput: { validated: [], rejected: [badReason] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.rejected.length, 0);
  assert.ok(result.warnings.length > 0);
});

test('parseAndValidateOutput: drops rejected item whose claim already appears in validated', () => {
  const clash = { ...VALID_REJECTED(), evidenceId: 'ev-5', claim: VALID_VALIDATED().claim };
  const providerResult = {
    structuredOutput: { validated: [VALID_VALIDATED()], rejected: [clash] },
    warnings: [],
    content: '',
  };
  const result = parseAndValidateOutput(providerResult, [VALID_SOURCE]);
  assert.equal(result.rejected.length, 0, 'a claim may not appear in both lists');
  assert.ok(result.warnings.some((w) => w.includes('both lists')));
});

// ─── runStage03Local: orchestration ──────────────────────────────────────────

const MOCK_PROVIDER = {
  generate: async () => ({
    content: JSON.stringify({ validated: [VALID_VALIDATED('run-x')], rejected: [VALID_REJECTED('run-x')] }),
    structuredOutput: { validated: [VALID_VALIDATED('run-x')], rejected: [VALID_REJECTED('run-x')] },
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

/** Seed a fake run directory as if Stage 01 + Stage 02 already ran and Stage 01 was approved. */
function seedRun(baseDir, runId, { stagesCompleted = ['market-signals', 'candidate-discovery'], gateOverrides = {} } = {}) {
  const dir = join(baseDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'request.json'), JSON.stringify({ ...REQUEST, runId, mode: 'local-cli', createdAt: '2026-07-23T00:00:00.000Z' }));
  writeFileSync(join(dir, '00-sources.json'), JSON.stringify([VALID_SOURCE]));
  writeFileSync(join(dir, '01-market-signals.json'), JSON.stringify([VALID_SIGNAL]));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify([VALID_CANDIDATE]));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    runId, workflow: 'market-opportunity', mode: 'local-cli',
    createdAt: '2026-07-23T00:00:00.000Z', completedAt: '2026-07-23T00:02:00.000Z',
    stagesCompleted, schemaVersion: '1.0.0',
    reviewGates: { gate1: 'pending', gate2: 'pending' },
  }));
  writeFileSync(join(dir, 'review-gate.json'), JSON.stringify({
    runId, stage: 'market-signals', status: 'stage_01_completed', awaitingReview: false,
    stageError: null, decision: 'approve', note: null, decidedAt: '2026-07-23T00:02:30.000Z',
    ...gateOverrides,
  }));
  return dir;
}

test('runStage03Local: refuses to run when Stage 01 was never approved', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  try {
    seedRun(base, 'run-unapproved', { gateOverrides: { decision: null, status: 'stage_01_completed' } });
    await assert.rejects(
      () => runStage03Local('run-unapproved', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not been approved/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: refuses to run when Stage 01 was rejected', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  try {
    seedRun(base, 'run-rejected', { gateOverrides: { decision: 'reject', status: 'rejected' } });
    await assert.rejects(
      () => runStage03Local('run-rejected', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not been approved/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: refuses to run when the run does not exist at all', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  try {
    await assert.rejects(
      () => runStage03Local('no-such-run', { baseDir: base, _provider: MOCK_PROVIDER }),
      /no review-gate\.json found/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: refuses to run when Stage 02 has not completed yet', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  try {
    seedRun(base, 'run-no-stage02', { stagesCompleted: ['market-signals'] });
    await assert.rejects(
      () => runStage03Local('run-no-stage02', { baseDir: base, _provider: MOCK_PROVIDER }),
      /has not completed Stage 02/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: writes validation and raw output for an approved run', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  try {
    seedRun(base, 'run-approved');
    const result = await runStage03Local('run-approved', { baseDir: base, _provider: MOCK_PROVIDER });

    assert.equal(result.status, 'stage_03_completed');
    assert.equal(result.validatedCount, 1);
    assert.equal(result.rejectedCount, 1);
    assert.ok(result.files.includes('03-validation.json'));
    assert.ok(result.files.includes('03-raw-output.json'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: updates metadata.stagesCompleted to include evidence-validation', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  try {
    const { readFileSync } = await import('node:fs');
    seedRun(base, 'run-approved-2');
    const result = await runStage03Local('run-approved-2', { baseDir: base, _provider: MOCK_PROVIDER });
    const meta = JSON.parse(readFileSync(join(result.dir, 'metadata.json'), 'utf8'));
    assert.deepEqual(meta.stagesCompleted, ['market-signals', 'candidate-discovery', 'evidence-validation']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: does not silently fall back to mock on provider error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  const brokenProvider = { generate: async () => { throw new Error('provider unavailable'); } };
  try {
    seedRun(base, 'run-approved-3');
    await assert.rejects(
      () => runStage03Local('run-approved-3', { baseDir: base, _provider: brokenProvider }),
      /Stage 03 failed/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: writes a stage-failure file on error, preserving artifacts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  const brokenProvider = { generate: async () => { throw new Error('timeout'); } };
  try {
    const { existsSync, readFileSync } = await import('node:fs');
    seedRun(base, 'run-approved-4');
    await assert.rejects(() => runStage03Local('run-approved-4', { baseDir: base, _provider: brokenProvider }));
    const failurePath = join(base, 'run-approved-4', '03-stage-failure.json');
    assert.ok(existsSync(failurePath));
    const failure = JSON.parse(readFileSync(failurePath, 'utf8'));
    assert.equal(failure.stage, 'evidence-validation');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage03Local: zero validated evidence is reported as its own status, not an error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage03-'));
  const allRejectedProvider = {
    generate: async () => ({
      content: JSON.stringify({ validated: [], rejected: [VALID_REJECTED()] }),
      structuredOutput: { validated: [], rejected: [VALID_REJECTED()] },
      provider: 'local-cli', model: 'sonnet', executionMode: 'local-cli',
      startedAt: '2026-07-23T00:00:00Z', completedAt: '2026-07-23T00:00:30Z', latencyMs: 30000,
      usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
      toolActivity: 'not_available', warnings: [], rawProviderOutput: { exitCode: 0 },
      estimatedApiCost: 'not_applicable', subscriptionUsage: 'not_available',
    }),
  };
  try {
    seedRun(base, 'run-approved-5');
    const result = await runStage03Local('run-approved-5', { baseDir: base, _provider: allRejectedProvider });
    assert.equal(result.status, 'stage_03_no_evidence_validated');
    assert.equal(result.validatedCount, 0);
    assert.equal(result.rejectedCount, 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
