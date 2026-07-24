/**
 * tests/eval.harness.test.mjs — evaluation harness tests.
 *
 * Tests cover: ID generation, storage, adapter contracts, normalization,
 * deterministic checks, end-to-end mock run, mock-only enforcement.
 *
 * Uses node:test (zero new dependencies, same framework as existing tests).
 * All tests use temp directories — no writes to evals/results/ or runs/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { newEvalRunId } from '../evals/harness/ids.mjs';
import { createEvalStore } from '../evals/harness/storage.mjs';
import { runBaselineAdapter } from '../evals/harness/adapters/baseline.mjs';
import { runStagedAdapter } from '../evals/harness/adapters/staged.mjs';
import { runFutureMultiAgentAdapter, ADAPTER_CONTRACT } from '../evals/harness/adapters/future-contract.mjs';
import { normalizeBaselineOutput } from '../evals/harness/normalize/baseline.mjs';
import { normalizeStagedOutput } from '../evals/harness/normalize/staged.mjs';
import { normalize } from '../evals/harness/normalize/index.mjs';
import { runDeterministicChecks, summarizeIssues } from '../evals/harness/checks/deterministic.mjs';
import { runEvaluation, loadCase, listCases } from '../evals/harness/run.mjs';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const MINIMAL_EVAL_CASE = {
  id: 'test-fixture',
  title: 'Test fixture case',
  category: 'Test',
  input: {
    targetMarket: 'Test Market',
    targetCustomerType: 'test utilities',
    solutionDescription: 'test AI software',
    businessObjective: 'test objective',
    constraints: ['test only'],
  },
  expectedCharacteristics: {
    marketSignals: ['some signal'],
    candidates: ['some candidate'],
    mustAvoid: ['nothing'],
    sourceExpectations: 'Tier A preferred',
  },
  notes: 'Fixture for tests.',
};

// ─── ID generation ────────────────────────────────────────────────────────────

test('newEvalRunId() generates an ID starting with "eval-"', () => {
  const id = newEvalRunId();
  assert.ok(id.startsWith('eval-'), `Expected "eval-" prefix, got: ${id}`);
});

test('newEvalRunId() generates unique IDs', () => {
  const ids = Array.from({ length: 10 }, () => newEvalRunId());
  const unique = new Set(ids);
  assert.equal(unique.size, 10, 'All 10 IDs should be unique');
});

// ─── storage ─────────────────────────────────────────────────────────────────

test('createEvalStore() creates the expected directory structure', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-store-'));
  try {
    const store = createEvalStore('test-run-001', base);
    assert.ok(existsSync(join(base, 'test-run-001', 'baseline')), 'baseline/ should exist');
    assert.ok(existsSync(join(base, 'test-run-001', 'staged')),   'staged/ should exist');
    assert.equal(store.evalRunId, 'test-run-001');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('createEvalStore() write/read round-trips JSON correctly', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-store-'));
  try {
    const store = createEvalStore('test-run-002', base);
    const data = { hello: 'world', n: 42 };
    store.write('metadata.json', data);
    assert.deepEqual(store.read('metadata.json'), data);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('createEvalStore() write stores strings as-is', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-store-'));
  try {
    const store = createEvalStore('test-run-003', base);
    store.write('summary.md', '# Hello');
    assert.ok(store.exists('summary.md'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ─── adapter contracts ────────────────────────────────────────────────────────

test('runBaselineAdapter() throws on non-mock mode', () => {
  assert.throws(
    () => runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'cheap' }),
    /only mock mode is supported/i
  );
  assert.throws(
    () => runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'full' }),
    /only mock mode is supported/i
  );
});

test('runBaselineAdapter() returns correct shape in mock mode', () => {
  const { rawOutput, metrics } = runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'mock' });
  assert.ok(typeof rawOutput.reply === 'string',        'rawOutput.reply should be a string');
  assert.ok(Array.isArray(rawOutput.sources),            'rawOutput.sources should be an array');
  assert.equal(rawOutput.mode, 'mock',                  'rawOutput.mode should be "mock"');
  assert.equal(metrics.realApiCallMade, false,          'realApiCallMade must be false in mock');
  assert.equal(metrics.estimatedCostUsd, 0.00,          'cost must be 0 in mock');
  assert.equal(metrics.modelCalls, 0,                   'modelCalls must be 0 in mock');
  assert.ok(typeof metrics.latencyMs === 'number',      'latencyMs should be a number');
  assert.equal(metrics.mode, 'mock',                    'metrics.mode should be "mock"');
  assert.ok(metrics.adapterName,                        'adapterName should be set');
});

test('runStagedAdapter() throws on non-mock mode', () => {
  assert.throws(
    () => runStagedAdapter(MINIMAL_EVAL_CASE, { mode: 'cheap' }),
    /only mock mode is supported/i
  );
  assert.throws(
    () => runStagedAdapter(MINIMAL_EVAL_CASE, { mode: 'full' }),
    /only mock mode is supported/i
  );
});

test('runStagedAdapter() returns correct shape in mock mode', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-staged-'));
  try {
    const { rawOutput, metrics } = runStagedAdapter(MINIMAL_EVAL_CASE, {
      mode: 'mock',
      runBaseDir: base,
      now: '2026-06-14T00:00:00.000Z',
    });
    assert.ok(rawOutput.runId,                         'rawOutput.runId should be set');
    assert.ok(Array.isArray(rawOutput.files),          'rawOutput.files should be an array');
    assert.ok(typeof rawOutput.artifacts === 'object', 'rawOutput.artifacts should be an object');
    assert.ok(rawOutput.artifacts['metadata.json'],    'metadata.json should be in artifacts');
    assert.ok(rawOutput.artifacts['00-sources.json'],  '00-sources.json should be in artifacts');
    assert.equal(metrics.realApiCallMade, false,       'realApiCallMade must be false in mock');
    assert.equal(metrics.estimatedCostUsd, 0.00,       'cost must be 0 in mock');
    assert.ok(Array.isArray(metrics.stagesCompleted),  'stagesCompleted should be an array');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runFutureMultiAgentAdapter() throws (placeholder contract)', () => {
  assert.throws(() => runFutureMultiAgentAdapter(MINIMAL_EVAL_CASE), /not implemented/i);
});

test('ADAPTER_CONTRACT defines required fields', () => {
  assert.ok(ADAPTER_CONTRACT.fields.rawOutput,                  'contract should document rawOutput');
  assert.ok(ADAPTER_CONTRACT.fields.metrics.realApiCallMade,    'contract should document realApiCallMade');
  assert.ok(Array.isArray(ADAPTER_CONTRACT.safetyRules),        'contract should have safety rules');
});

// ─── normalization ────────────────────────────────────────────────────────────

test('normalizeBaselineOutput() returns all required top-level fields', () => {
  const { rawOutput } = runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'mock' });
  const norm = normalizeBaselineOutput(rawOutput);

  for (const field of ['adapterName', 'outputType', 'sources', 'marketSignals', 'candidates', 'recommendations', 'uncertainties', 'claims']) {
    assert.ok(field in norm, `Missing field: ${field}`);
  }
  assert.equal(norm.outputType, 'prose-report');
  assert.equal(norm.opportunityScores, 'not_available', 'baseline has no structured scores');
  assert.equal(norm.humanVerificationItems, 'not_available', 'baseline has no human verification items');
});

test('normalizeBaselineOutput() extracts sources', () => {
  const { rawOutput } = runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'mock' });
  const norm = normalizeBaselineOutput(rawOutput);
  assert.ok(norm.sources.length > 0, 'Should extract at least one source');
  assert.ok(norm.sources[0].url, 'Source should have a URL');
});

test('normalizeStagedOutput() returns all required top-level fields', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-norm-staged-'));
  try {
    const { rawOutput } = runStagedAdapter(MINIMAL_EVAL_CASE, {
      mode: 'mock',
      runBaseDir: base,
      now: '2026-06-14T00:00:00.000Z',
    });
    const norm = normalizeStagedOutput(rawOutput);

    for (const field of ['adapterName', 'outputType', 'sources', 'marketSignals', 'candidates', 'recommendations', 'uncertainties', 'claims', 'opportunityScores', 'humanVerificationItems', 'stageArtifacts']) {
      assert.ok(field in norm, `Missing field: ${field}`);
    }
    assert.equal(norm.outputType, 'structured-artifacts');
    assert.ok(Array.isArray(norm.opportunityScores), 'staged should have structured scores');
    assert.ok(Array.isArray(norm.humanVerificationItems), 'staged should have verification items');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('normalizeStagedOutput() includes source quality tiers', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-norm-staged2-'));
  try {
    const { rawOutput } = runStagedAdapter(MINIMAL_EVAL_CASE, {
      mode: 'mock',
      runBaseDir: base,
      now: '2026-06-14T00:00:00.000Z',
    });
    const norm = normalizeStagedOutput(rawOutput);
    const withTier = norm.sources.filter((s) => s.qualityTier && s.qualityTier !== 'not_available');
    assert.ok(withTier.length > 0, 'At least one source should have a quality tier');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('normalize() routes to the correct normalizer', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-norm-route-'));
  try {
    const { rawOutput: bRaw } = runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'mock' });
    const bNorm = normalize('baseline', bRaw);
    assert.equal(bNorm.outputType, 'prose-report');

    const { rawOutput: sRaw } = runStagedAdapter(MINIMAL_EVAL_CASE, {
      mode: 'mock',
      runBaseDir: base,
      now: '2026-06-14T00:00:00.000Z',
    });
    const sNorm = normalize('staged', sRaw);
    assert.equal(sNorm.outputType, 'structured-artifacts');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('normalize() throws for unknown adapter name', () => {
  assert.throws(() => normalize('future-agent', {}), /unknown adapter/i);
});

// ─── deterministic checks ─────────────────────────────────────────────────────

const CLEAN_NORM_BASE = {
  adapterName: 'test', outputType: 'prose-report',
  sources: [], marketSignals: [], candidates: [], recommendations: [], claims: [], uncertainties: [],
  opportunityScores: 'not_available', humanVerificationItems: 'not_available', stageArtifacts: 'not_available',
  rawNotes: { parsingApproach: '(mock) test' },
};

test('runDeterministicChecks() flags an invalid URL', () => {
  const norm = {
    ...CLEAN_NORM_BASE,
    sources: [{ sourceId: 'src-1', url: 'not-a-valid-url (mock)', qualityTier: 'A', publicationDate: '2026-01-01', publisher: 'Test' }],
  };
  const issues = runDeterministicChecks(norm);
  const urlIssue = issues.find((i) => i.code === 'INVALID_URL');
  assert.ok(urlIssue, 'Should flag INVALID_URL');
  assert.equal(urlIssue.severity, 'error');
});

test('runDeterministicChecks() flags duplicate source URLs', () => {
  const norm = {
    ...CLEAN_NORM_BASE,
    sources: [
      { sourceId: 'src-1', url: 'https://example.com/', qualityTier: 'not_available', publicationDate: 'not_available', publisher: 'not_available' },
      { sourceId: 'src-2', url: 'https://example.com/', qualityTier: 'not_available', publicationDate: 'not_available', publisher: 'not_available' },
    ],
  };
  const issues = runDeterministicChecks(norm);
  const dupeIssue = issues.find((i) => i.code === 'DUPLICATE_URL');
  assert.ok(dupeIssue, 'Should flag DUPLICATE_URL');
  assert.equal(dupeIssue.severity, 'warning');
});

test('runDeterministicChecks() flags outreach language in recommendations', () => {
  const norm = {
    ...CLEAN_NORM_BASE,
    recommendations: [{ recommendationId: 'rec-1', text: 'Send an email (mock) to the key contact.' }],
  };
  const issues = runDeterministicChecks(norm);
  const outreachIssue = issues.find((i) => i.code === 'OUTREACH_LANGUAGE');
  assert.ok(outreachIssue, 'Should flag OUTREACH_LANGUAGE');
  assert.equal(outreachIssue.severity, 'error');
});

test('runDeterministicChecks() flags score outside 1–5', () => {
  const norm = {
    ...CLEAN_NORM_BASE,
    outputType: 'structured-artifacts',
    humanVerificationItems: [],
    stageArtifacts: { stagesCompleted: [] },
    opportunityScores: [{
      candidateId: 'cand-1',
      totalScore: 42,
      rationale: 'test (mock)',
      dimensions: { problemUrgency: { score: 6, justification: 'test' } },
    }],
  };
  const issues = runDeterministicChecks(norm);
  const rangeIssue = issues.find((i) => i.code === 'SCORE_OUT_OF_RANGE');
  assert.ok(rangeIssue, 'Should flag SCORE_OUT_OF_RANGE');
  assert.equal(rangeIssue.severity, 'error');
});

test('runDeterministicChecks() flags missing mock label', () => {
  const norm = {
    ...CLEAN_NORM_BASE,
    rawNotes: {}, // no (mock) anywhere in the output
  };
  const issues = runDeterministicChecks(norm);
  const labelIssue = issues.find((i) => i.code === 'UNLABELED_MOCK_CONTENT');
  assert.ok(labelIssue, 'Should flag UNLABELED_MOCK_CONTENT');
});

test('runDeterministicChecks() passes a clean baseline mock output', () => {
  const { rawOutput } = runBaselineAdapter(MINIMAL_EVAL_CASE, { mode: 'mock' });
  const norm = normalizeBaselineOutput(rawOutput);
  const issues = runDeterministicChecks(norm);
  const errors = issues.filter((i) => i.severity === 'error');
  assert.equal(errors.length, 0, `Expected zero errors, got: ${errors.map((i) => i.code).join(', ')}`);
});

test('runDeterministicChecks() passes a clean staged mock output', () => {
  const base = mkdtempSync(join(tmpdir(), 'eval-check-staged-'));
  try {
    const { rawOutput } = runStagedAdapter(MINIMAL_EVAL_CASE, {
      mode: 'mock',
      runBaseDir: base,
      now: '2026-06-14T00:00:00.000Z',
    });
    const norm = normalizeStagedOutput(rawOutput);
    const issues = runDeterministicChecks(norm);
    const errors = issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, `Expected zero errors, got: ${errors.map((i) => i.code).join(', ')}`);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('summarizeIssues() counts correctly', () => {
  const issues = [
    { severity: 'error' }, { severity: 'error' },
    { severity: 'warning' },
    { severity: 'info' }, { severity: 'info' }, { severity: 'info' },
  ];
  const s = summarizeIssues(issues);
  assert.equal(s.total, 6);
  assert.equal(s.errors, 2);
  assert.equal(s.warnings, 1);
  assert.equal(s.infos, 3);
});

// ─── end-to-end mock evaluation ───────────────────────────────────────────────

test('runEvaluation() runs all real eval cases in mock mode and produces all files', () => {
  const resultsBase = mkdtempSync(join(tmpdir(), 'eval-e2e-'));
  const runsBase    = mkdtempSync(join(tmpdir(), 'eval-runs-'));
  try {
    const caseIds = listCases();
    assert.equal(caseIds.length, 7, 'Should find 7 eval cases');

    for (const caseId of caseIds) {
      const result = runEvaluation(caseId, {
        mode: 'mock',
        resultsDir: resultsBase,
        runBaseDir: runsBase,
        now: '2026-06-14T00:00:00.000Z',
      });
      assert.ok(result.evalRunId, `${caseId}: evalRunId should be set`);
      assert.equal(result.caseId, caseId, `${caseId}: caseId should match`);
      assert.equal(result.mode, 'mock', `${caseId}: mode should be mock`);

      const expectedFiles = [
        'metadata.json', 'test-case.json', 'comparison.json', 'summary.md',
        'baseline/raw-output.json', 'baseline/normalized-output.json',
        'baseline/metrics.json',    'baseline/issues.json',
        'staged/raw-output.json',   'staged/normalized-output.json',
        'staged/metrics.json',      'staged/issues.json',
      ];
      for (const f of expectedFiles) {
        assert.ok(
          existsSync(join(result.dir, f)),
          `${caseId}: expected file missing: ${f}`
        );
      }
    }
  } finally {
    rmSync(resultsBase, { recursive: true, force: true });
    rmSync(runsBase,    { recursive: true, force: true });
  }
});

test('runEvaluation() metadata.json records zero paid API calls', () => {
  const resultsBase = mkdtempSync(join(tmpdir(), 'eval-meta-'));
  const runsBase    = mkdtempSync(join(tmpdir(), 'eval-meta-runs-'));
  try {
    const result = runEvaluation('01-water-utilities-spain', {
      mode: 'mock',
      resultsDir: resultsBase,
      runBaseDir: runsBase,
      now: '2026-06-14T00:00:00.000Z',
    });
    const meta = JSON.parse(readFileSync(join(result.dir, 'metadata.json'), 'utf8'));
    assert.equal(meta.paidApiCallsMade, false, 'paidApiCallsMade must be false for mock run');
    assert.equal(meta.mode, 'mock');
  } finally {
    rmSync(resultsBase, { recursive: true, force: true });
    rmSync(runsBase,    { recursive: true, force: true });
  }
});

test('runEvaluation() throws for non-mock mode (no silent paid spend)', () => {
  assert.throws(
    () => runEvaluation('01-water-utilities-spain', { mode: 'cheap' }),
    /only runs mock evaluations/i
  );
  assert.throws(
    () => runEvaluation('01-water-utilities-spain', { mode: 'full' }),
    /only runs mock evaluations/i
  );
});

test('runEvaluation() comparison.json includes mock data warning and feature diff', () => {
  const resultsBase = mkdtempSync(join(tmpdir(), 'eval-comp-'));
  const runsBase    = mkdtempSync(join(tmpdir(), 'eval-comp-runs-'));
  try {
    const result = runEvaluation('01-water-utilities-spain', {
      mode: 'mock',
      resultsDir: resultsBase,
      runBaseDir: runsBase,
      now: '2026-06-14T00:00:00.000Z',
    });
    const comp = JSON.parse(readFileSync(join(result.dir, 'comparison.json'), 'utf8'));
    assert.ok(comp.warning,              'comparison.json should include a warning');
    assert.ok(/mock/i.test(comp.warning), 'Warning should mention mock');
    assert.ok(comp.features,             'Should have feature comparison');
    assert.equal(comp.features.hasStructuredScores.baseline, false, 'Baseline has no structured scores');
    assert.equal(comp.features.hasStructuredScores.staged,   true,  'Staged has structured scores');
    assert.ok(Array.isArray(comp.dimensionsRequiringHumanReview), 'Should list human review dimensions');
  } finally {
    rmSync(resultsBase, { recursive: true, force: true });
    rmSync(runsBase,    { recursive: true, force: true });
  }
});

// ─── case loading ─────────────────────────────────────────────────────────────

test('listCases() returns 7 cases', () => {
  const cases = listCases();
  assert.equal(cases.length, 7, 'Should find exactly 7 eval cases');
});

test('loadCase() loads a valid eval case', () => {
  const c = loadCase('01-water-utilities-spain');
  assert.ok(c.id,                      'Case should have an id');
  assert.ok(c.input,                   'Case should have input');
  assert.ok(c.expectedCharacteristics, 'Case should have expectedCharacteristics');
});

test('loadCase() throws for an unknown case ID', () => {
  assert.throws(() => loadCase('99-does-not-exist'), /ENOENT/);
});
