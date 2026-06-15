/**
 * tests/providers.test.mjs — tests for the local-cli provider and Stage 01 logic.
 *
 * All tests use a mock spawnFn — NO real Claude CLI is invoked.
 * Every test completes synchronously or in < 1ms.
 *
 * Coverage:
 *   localCli: isAvailable, buildSafeEnv, generate (happy path, errors, timeout,
 *             bad exit, malformed output, production guard)
 *   stage01:  buildSystemPrompt, buildUserMessage, parseAndValidateOutput
 *   runWorkflowLocal: stops after Stage 01, writes expected artifacts,
 *                     records review-gate, provider injection, stage failure
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  isAvailable,
  buildSafeEnv,
  generate as localCliGenerate,
} from '../lib/workflow/providers/localCli.mjs';

import {
  buildSystemPrompt,
  buildUserMessage,
  loadStageContext,
  parseAndValidateOutput,
} from '../lib/workflow/stage01.mjs';

import { runWorkflowLocal } from '../lib/workflow/runWorkflowLocal.mjs';

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

const VALID_SIGNAL = (runId = 'run-test') => ({
  signalId: 'sig-1',
  claim: 'Spain requires water utilities to reduce losses below 15%.',
  signalType: 'regulation',
  relevance: 'high',
  confidence: 0.9,
  uncertainty: 'Exact enforcement date unclear.',
  sourceIds: ['src-1'],
  metadata: { runId, stage: 'market-signals', createdAt: '2026-06-15T00:00:00Z' },
});

function makeSpawnFn(overrides = {}) {
  return () => ({
    status: 0,
    stdout: JSON.stringify({ sources: [VALID_SOURCE], signals: [VALID_SIGNAL()] }),
    stderr: '',
    error: null,
    ...overrides,
  });
}

const REQUEST = {
  targetMarket: 'Spain',
  targetCustomerType: 'water utilities',
  solutionDescription: 'AI leak-detection software',
  businessObjective: 'Shortlist utilities to research',
  constraints: ['EU only'],
};

// ─── isAvailable ──────────────────────────────────────────────────────────────

test('isAvailable: returns a boolean', () => {
  assert.equal(typeof isAvailable(), 'boolean');
});

// ─── buildSafeEnv ─────────────────────────────────────────────────────────────

test('buildSafeEnv: strips ANTHROPIC_API_KEY', () => {
  const env = buildSafeEnv({ ANTHROPIC_API_KEY: 'sk-secret', PATH: '/usr/bin' });
  assert.ok(!('ANTHROPIC_API_KEY' in env), 'ANTHROPIC_API_KEY should be stripped');
  assert.equal(env.PATH, '/usr/bin', 'other vars should be preserved');
});

test('buildSafeEnv: strips all paid API keys', () => {
  const env = buildSafeEnv({
    ANTHROPIC_API_KEY: 'a',
    TAVILY_API_KEY: 'b',
    OPENAI_API_KEY: 'c',
    GEMINI_API_KEY: 'd',
    HOME: '/home/user',
  });
  assert.ok(!('ANTHROPIC_API_KEY' in env));
  assert.ok(!('TAVILY_API_KEY' in env));
  assert.ok(!('OPENAI_API_KEY' in env));
  assert.ok(!('GEMINI_API_KEY' in env));
  assert.equal(env.HOME, '/home/user');
});

test('buildSafeEnv: does not mutate the original env object', () => {
  const original = { ANTHROPIC_API_KEY: 'secret', FOO: 'bar' };
  buildSafeEnv(original);
  assert.equal(original.ANTHROPIC_API_KEY, 'secret', 'original should be untouched');
});

// ─── generate: production guard ───────────────────────────────────────────────

test('generate: refuses to run in production', async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await assert.rejects(
      () => localCliGenerate({ userMessage: 'test' }, { spawnFn: makeSpawnFn() }),
      /disabled in production/
    );
  } finally {
    process.env.NODE_ENV = original;
  }
});

// ─── generate: happy path (injected spawn) ───────────────────────────────────

test('generate: returns structuredOutput on valid JSON response', async () => {
  const result = await localCliGenerate(
    { userMessage: 'test', systemPrompt: 'be a researcher' },
    { spawnFn: makeSpawnFn() }
  );
  assert.equal(result.provider, 'local-cli');
  assert.equal(result.executionMode, 'local-cli');
  assert.ok(result.structuredOutput);
  assert.ok(Array.isArray(result.structuredOutput.sources));
  assert.ok(Array.isArray(result.structuredOutput.signals));
  assert.equal(result.usage.inputTokens, 'not_available');
  assert.equal(result.toolActivity, 'not_available');
  assert.equal(result.estimatedApiCost, 'not_applicable');
  assert.equal(result.subscriptionUsage, 'not_available');
});

test('generate: records latency', async () => {
  const result = await localCliGenerate(
    { userMessage: 'test' },
    { spawnFn: makeSpawnFn() }
  );
  assert.ok(typeof result.latencyMs === 'number');
  assert.ok(result.latencyMs >= 0);
});

// ─── generate: timeout ────────────────────────────────────────────────────────

test('generate: throws with clear message on timeout', async () => {
  const timeoutSpawn = () => ({
    status: null,
    stdout: '',
    stderr: '',
    error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }),
  });
  await assert.rejects(
    () => localCliGenerate({ userMessage: 'test', timeoutMs: 100 }, { spawnFn: timeoutSpawn }),
    /timed out after/
  );
});

// ─── generate: non-zero exit code ─────────────────────────────────────────────

test('generate: throws on non-zero exit code', async () => {
  const failSpawn = makeSpawnFn({ status: 1, stderr: 'auth error' });
  await assert.rejects(
    () => localCliGenerate({ userMessage: 'test' }, { spawnFn: failSpawn }),
    /CLI exited with code 1/
  );
});

// ─── generate: malformed output ───────────────────────────────────────────────

test('generate: returns warning and null structuredOutput for non-JSON response', async () => {
  const badSpawn = makeSpawnFn({ stdout: 'This is plain text, not JSON.' });
  const result = await localCliGenerate({ userMessage: 'test' }, { spawnFn: badSpawn });
  assert.equal(result.structuredOutput, null);
  assert.ok(result.warnings.length > 0, 'should have a warning about JSON extraction');
  assert.ok(result.content.includes('plain text'), 'content should preserve raw text');
});

test('generate: extracts JSON even when there is leading text', async () => {
  const stdout = 'Here is the result:\n' + JSON.stringify({ sources: [], signals: [] });
  const result = await localCliGenerate({ userMessage: 'test' }, { spawnFn: makeSpawnFn({ stdout }) });
  assert.ok(result.structuredOutput);
  assert.ok(Array.isArray(result.structuredOutput.sources));
});

// ─── generate: CLI not available ─────────────────────────────────────────────

test('generate: spawnFn can simulate CLI not found (process error)', async () => {
  const notFoundSpawn = () => ({
    status: null,
    stdout: '',
    stderr: '',
    error: new Error('ENOENT: no such file'),
  });
  await assert.rejects(
    () => localCliGenerate({ userMessage: 'test' }, { spawnFn: notFoundSpawn }),
    /process error/
  );
});

// ─── stage01: prompt builders ─────────────────────────────────────────────────

test('buildSystemPrompt: returns a non-empty string', () => {
  const sp = buildSystemPrompt();
  assert.equal(typeof sp, 'string');
  assert.ok(sp.length > 10);
});

test('buildUserMessage: includes all request fields', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(
    { ...REQUEST, runId: 'run-test', constraints: ['EU only'] },
    ctx,
    'run-test',
    '2026-06-15T00:00:00Z'
  );
  assert.ok(msg.includes(REQUEST.targetMarket), 'should include targetMarket');
  assert.ok(msg.includes(REQUEST.targetCustomerType), 'should include targetCustomerType');
  assert.ok(msg.includes(REQUEST.solutionDescription), 'should include solutionDescription');
  assert.ok(msg.includes(REQUEST.businessObjective), 'should include businessObjective');
  assert.ok(msg.includes('EU only'), 'should include constraints');
  assert.ok(msg.includes('run-test'), 'should include runId');
  assert.ok(msg.includes('2026-06-15T00:00:00Z'), 'should include retrievedAt');
});

test('buildUserMessage: includes stage contract from CONTEXT.md', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage({ ...REQUEST, runId: 'r1' }, ctx, 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('Market Signals'), 'should include stage content from CONTEXT.md');
});

test('buildUserMessage: includes JSON output format instruction', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage({ ...REQUEST, runId: 'r1' }, ctx, 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('"sources"'), 'should instruct about sources field');
  assert.ok(msg.includes('"signals"'), 'should instruct about signals field');
});

// ─── stage01: parseAndValidateOutput ─────────────────────────────────────────

test('parseAndValidateOutput: returns validated sources and signals', () => {
  const providerResult = {
    structuredOutput: { sources: [VALID_SOURCE], signals: [VALID_SIGNAL('run-1')] },
    warnings: [],
    content: '{}',
  };
  const result = parseAndValidateOutput(providerResult, 'run-1');
  assert.equal(result.sources.length, 1);
  assert.equal(result.signals.length, 1);
  assert.equal(result.warnings.length, 0);
});

test('parseAndValidateOutput: throws when structuredOutput is null', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: null, warnings: [], content: '' }, 'r'),
    /no parseable JSON/
  );
});

test('parseAndValidateOutput: throws when sources array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: { signals: [] }, warnings: [], content: '' }, 'r'),
    /missing "sources"/
  );
});

test('parseAndValidateOutput: throws when signals array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: { sources: [] }, warnings: [], content: '' }, 'r'),
    /missing "signals"/
  );
});

test('parseAndValidateOutput: drops invalid signal and warns', () => {
  const badSignal = { signalId: 'sig-bad', claim: 'A claim' }; // missing required fields
  const providerResult = {
    structuredOutput: {
      sources: [VALID_SOURCE],
      signals: [VALID_SIGNAL('r'), badSignal],
    },
    warnings: [],
    content: '',
  };
  const result = parseAndValidateOutput(providerResult, 'r');
  assert.equal(result.signals.length, 1, 'invalid signal should be dropped');
  assert.ok(result.warnings.some((w) => w.includes('sig-bad') || w.includes('Dropped signal')));
});

test('parseAndValidateOutput: throws if ALL signals fail validation', () => {
  const providerResult = {
    structuredOutput: {
      sources: [VALID_SOURCE],
      signals: [{ signalId: 'sig-bad', claim: 'No other fields' }],
    },
    warnings: [],
    content: 'raw',
  };
  assert.throws(
    () => parseAndValidateOutput(providerResult, 'r'),
    /all.*signal.*failed validation/i
  );
});

test('parseAndValidateOutput: drops signal whose sourceId is not in sources', () => {
  const signalWithBadRef = { ...VALID_SIGNAL('r'), sourceIds: ['src-missing'] };
  const providerResult = {
    structuredOutput: { sources: [VALID_SOURCE], signals: [signalWithBadRef] },
    warnings: [],
    content: '',
  };
  assert.throws(
    () => parseAndValidateOutput(providerResult, 'r'),
    /all.*signal.*failed validation/i
  );
});

test('parseAndValidateOutput: empty signals array is accepted (zero findings)', () => {
  const providerResult = {
    structuredOutput: { sources: [], signals: [] },
    warnings: [],
    content: '{}',
  };
  const result = parseAndValidateOutput(providerResult, 'r');
  assert.equal(result.signals.length, 0);
  assert.equal(result.sources.length, 0);
});

// ─── runWorkflowLocal: orchestration ─────────────────────────────────────────

const MOCK_PROVIDER = {
  generate: async () => ({
    content: JSON.stringify({ sources: [VALID_SOURCE], signals: [VALID_SIGNAL('run-x')] }),
    structuredOutput: { sources: [VALID_SOURCE], signals: [VALID_SIGNAL('run-x')] },
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

test('runWorkflowLocal: writes expected Stage 01 artifacts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  try {
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: MOCK_PROVIDER,
    });

    assert.equal(result.status, 'stage_01_completed');
    assert.equal(result.awaitingReview, true);
    assert.ok(result.files.includes('request.json'));
    assert.ok(result.files.includes('00-sources.json'));
    assert.ok(result.files.includes('01-market-signals.json'));
    assert.ok(result.files.includes('01-raw-output.json'));
    assert.ok(result.files.includes('review-gate.json'));
    assert.ok(result.files.includes('metadata.json'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: does NOT write Stage 02–05 artifacts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  try {
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: MOCK_PROVIDER,
    });

    const stage02to05 = ['02-candidates.json', '03-validation.json', '04-scores.json', '05-briefs.json'];
    for (const f of stage02to05) {
      assert.ok(!result.files.includes(f), `should not produce ${f}`);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: metadata records only market-signals stage', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  try {
    const { readFileSync: rf } = await import('node:fs');
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: MOCK_PROVIDER,
    });
    const meta = JSON.parse(rf(join(result.dir, 'metadata.json'), 'utf8'));
    assert.deepEqual(meta.stagesCompleted, ['market-signals']);
    assert.equal(meta.mode, 'local-cli');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: review-gate starts as awaiting_review', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  try {
    const { readFileSync: rf } = await import('node:fs');
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: MOCK_PROVIDER,
    });
    const gate = JSON.parse(rf(join(result.dir, 'review-gate.json'), 'utf8'));
    assert.equal(gate.awaitingReview, true);
    assert.equal(gate.decision, null);
    assert.equal(gate.status, 'stage_01_completed');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: throws and writes failure file on Stage 01 error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  const failingProvider = {
    generate: async () => { throw new Error('CLI timed out'); },
  };
  try {
    const { existsSync, readFileSync: rf } = await import('node:fs');
    await assert.rejects(
      () => runWorkflowLocal(REQUEST, { baseDir: base, _provider: failingProvider }),
      /Stage 01 failed/
    );
    // The failure file should exist
    const dirs = (await import('node:fs')).readdirSync(base);
    const runDir = join(base, dirs[0]);
    assert.ok(existsSync(join(runDir, '01-stage-failure.json')));
    const failure = JSON.parse(rf(join(runDir, '01-stage-failure.json'), 'utf8'));
    assert.equal(failure.stage, 'market-signals');
    assert.ok(failure.error);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: does not silently fall back to mock on provider error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  const brokenProvider = {
    generate: async () => { throw new Error('provider unavailable'); },
  };
  try {
    await assert.rejects(
      () => runWorkflowLocal(REQUEST, { baseDir: base, _provider: brokenProvider }),
      /Stage 01 failed/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: signal and source counts in return value', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-local-'));
  try {
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: MOCK_PROVIDER,
    });
    assert.equal(result.signalCount, 1);
    assert.equal(result.sourceCount, 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ─── provider selection ───────────────────────────────────────────────────────

test('local-cli mode is never activated by the existing runWorkflow (mock-only)', async () => {
  const { runWorkflow } = await import('../lib/workflow/runWorkflow.mjs');
  assert.throws(
    () => runWorkflow(REQUEST, { mode: 'local-cli' }),
    /only implemented for mock/i
  );
});

// ─── generate: CLI argument contract ─────────────────────────────────────────

// Helper: captures the args array passed to spawnFn
function captureSpawnFn(overrides = {}) {
  let capturedArgs = null;
  const fn = (_path, args) => {
    capturedArgs = args;
    return {
      status: 0,
      stdout: JSON.stringify({ sources: [VALID_SOURCE], signals: [VALID_SIGNAL()] }),
      stderr: '',
      error: null,
      ...overrides,
    };
  };
  fn.getArgs = () => capturedArgs;
  return fn;
}

// Returns the value of a flag (the element immediately after it), or null.
function flagValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

test('generate: uses --append-system-prompt, not --system-prompt', async () => {
  const spy = captureSpawnFn();
  await localCliGenerate(
    { userMessage: 'test', systemPrompt: 'be a researcher' },
    { spawnFn: spy }
  );
  const args = spy.getArgs();
  assert.ok(args.includes('--append-system-prompt'), '--append-system-prompt must be present');
  assert.ok(!args.includes('--system-prompt'), '--system-prompt must NOT appear');
});

test('generate: --tools contains exactly WebSearch,WebFetch', async () => {
  const spy = captureSpawnFn();
  await localCliGenerate({ userMessage: 'test' }, { spawnFn: spy });
  const val = flagValue(spy.getArgs(), '--tools');
  assert.equal(val, 'WebSearch,WebFetch', '--tools value must be exactly "WebSearch,WebFetch"');
});

test('generate: --allowedTools contains exactly WebSearch,WebFetch', async () => {
  const spy = captureSpawnFn();
  await localCliGenerate({ userMessage: 'test' }, { spawnFn: spy });
  const val = flagValue(spy.getArgs(), '--allowedTools');
  assert.equal(val, 'WebSearch,WebFetch', '--allowedTools value must be exactly "WebSearch,WebFetch"');
});

test('generate: forbidden tools absent from both --tools and --allowedTools', async () => {
  const spy = captureSpawnFn();
  await localCliGenerate({ userMessage: 'test' }, { spawnFn: spy });
  const args = spy.getArgs();
  const toolsVal = flagValue(args, '--tools') ?? '';
  const allowedVal = flagValue(args, '--allowedTools') ?? '';
  const forbidden = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'];
  for (const tool of forbidden) {
    assert.ok(!toolsVal.includes(tool), `${tool} must NOT appear in --tools`);
    assert.ok(!allowedVal.includes(tool), `${tool} must NOT appear in --allowedTools`);
  }
});

test('generate: both --tools and --allowedTools appear exactly once', async () => {
  const spy = captureSpawnFn();
  await localCliGenerate({ userMessage: 'test' }, { spawnFn: spy });
  const args = spy.getArgs();
  assert.equal(args.filter((a) => a === '--tools').length, 1, 'exactly one --tools flag');
  assert.equal(args.filter((a) => a === '--allowedTools').length, 1, 'exactly one --allowedTools flag');
});

test('generate: -- separator appears immediately before user message', async () => {
  const spy = captureSpawnFn();
  await localCliGenerate({ userMessage: 'hello world' }, { spawnFn: spy });
  const args = spy.getArgs();
  const sepIdx = args.lastIndexOf('--');
  assert.ok(sepIdx !== -1, '-- separator must be present');
  assert.equal(args[sepIdx + 1], 'hello world', 'user message must follow --');
});

// ─── runWorkflowLocal: insufficient-evidence guard ────────────────────────────

const EMPTY_OUTPUT_PROVIDER = {
  generate: async () => ({
    content: JSON.stringify({ sources: [], signals: [] }),
    structuredOutput: { sources: [], signals: [] },
    provider: 'local-cli',
    model: 'sonnet',
    executionMode: 'local-cli',
    startedAt: '2026-06-15T00:00:00Z',
    completedAt: '2026-06-15T00:00:30Z',
    latencyMs: 30000,
    usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
    toolActivity: 'not_available',
    warnings: [],
    rawProviderOutput: { exitCode: 0 },
    estimatedApiCost: 'not_applicable',
    subscriptionUsage: 'not_available',
  }),
};

test('runWorkflowLocal: zero signals → stage_01_insufficient_evidence, not stage_01_completed', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-empty-'));
  try {
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: EMPTY_OUTPUT_PROVIDER,
    });
    assert.equal(result.status, 'stage_01_insufficient_evidence');
    assert.notEqual(result.status, 'stage_01_completed', 'must not be marked completed');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: insufficient evidence → awaitingReview is false', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-empty-'));
  try {
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: EMPTY_OUTPUT_PROVIDER,
    });
    assert.equal(result.awaitingReview, false, 'empty output must not queue a human review');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: insufficient evidence → review-gate records correct status', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-empty-'));
  try {
    const { readFileSync: rf } = await import('node:fs');
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: EMPTY_OUTPUT_PROVIDER,
    });
    const gate = JSON.parse(rf(join(result.dir, 'review-gate.json'), 'utf8'));
    assert.equal(gate.status, 'stage_01_insufficient_evidence');
    assert.equal(gate.awaitingReview, false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runWorkflowLocal: insufficient evidence → raw artifacts still written', async () => {
  const base = mkdtempSync(join(tmpdir(), 'wf-empty-'));
  try {
    const result = await runWorkflowLocal(REQUEST, {
      baseDir: base,
      now: '2026-06-15T00:00:00.000Z',
      _provider: EMPTY_OUTPUT_PROVIDER,
    });
    assert.ok(result.files.includes('00-sources.json'), 'sources file must be written');
    assert.ok(result.files.includes('01-market-signals.json'), 'signals file must be written');
    assert.ok(result.files.includes('01-raw-output.json'), 'raw output must be written');
    assert.ok(result.files.includes('metadata.json'), 'metadata must be written');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
