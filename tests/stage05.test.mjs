/**
 * tests/stage05.test.mjs — tests for Stage 05 (opportunity brief) logic and
 * its live orchestrator.
 *
 * All tests use a mock provider — NO real Claude CLI is invoked.
 *
 * Coverage:
 *   stage05:          buildSystemPrompt, buildUserMessage, parseAndValidateOutput,
 *                     renderBriefsMarkdown
 *   runStage05Local:  approval + Stage-04-completed preconditions, artifact
 *                     writing (json + markdown), metadata update, stage
 *                     failure handling, no-briefs result, WebSearch-only tool
 *                     restriction
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
  renderBriefsMarkdown,
} from '../lib/workflow/stage05.mjs';

import { runStage05Local } from '../lib/workflow/runStage05Local.mjs';

// ─── helpers ──────────────────────────────────────────────────────────────────

const VALID_CANDIDATE = {
  candidateId: 'cand-1',
  name: 'Acquedotto Esempio S.p.A.',
  organisationType: 'water-utility',
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

const VALID_SCORE = {
  candidateId: 'cand-1',
  dimensions: {
    utilitySize: { score: 3, justification: 'x' },
    nrwEvidence: { score: 4, justification: 'x' },
    regionFit: { score: 5, justification: 'x' },
    targetRolePresence: { score: 2, justification: 'x' },
    momentumSignal: { score: 0, justification: 'x' },
  },
  totalScore: 14,
  rationale: 'Strong fit.',
  metadata: { runId: 'run-test', stage: 'opportunity-scoring', createdAt: '2026-07-23T00:00:00Z' },
};

const VALID_BRIEF = (runId = 'run-test', overrides = {}) => ({
  candidateId: 'cand-1',
  title: 'Acquedotto Esempio — priority opportunity',
  whyItMatters: 'Strong regional fit with confirmed NRW activity.',
  supportingEvidenceIds: ['ev-1'],
  factVsInterpretation: {
    verifiedFacts: ['Italy requires water utilities to reduce losses below 15%.'],
    modelInterpretations: ['Likely to prioritise leak-detection technology this cycle.'],
  },
  uncertainties: ['Decision-maker unknown'],
  recommendedNextAction: 'Research the procurement calendar and prepare a positioning brief.',
  contacts: [
    {
      name: 'Example Contact',
      role: 'Head of Asset Management',
      targetRoleCategory: 'asset-management',
      sourceUrl: 'https://example.com/team/example-contact',
      sourceType: 'company-team-page',
      confidence: 0.6,
      uncertainty: 'Not confirmed as current.',
    },
  ],
  humanVerificationRequired: ['Confirm the contact still holds this role.'],
  metadata: { runId, stage: 'opportunity-brief', createdAt: '2026-07-23T00:00:00Z' },
  ...overrides,
});

const REQUEST = {
  targetMarket: 'Italy',
  targetCustomerType: 'drinking-water utilities and multi-utility companies',
  solutionDescription: 'AI leak-detection software',
  businessObjective: 'Find 5+ qualified leads for outbound marketing',
  constraints: ['Italy only'],
};

// ─── stage05: prompt builders ─────────────────────────────────────────────────

test('buildSystemPrompt: returns a non-empty string', () => {
  const sp = buildSystemPrompt();
  assert.equal(typeof sp, 'string');
  assert.ok(sp.length > 10);
});

test('buildSystemPrompt: forbids outreach and direct LinkedIn profile visits', () => {
  const sp = buildSystemPrompt();
  assert.ok(/never.*(email|call|contact)/i.test(sp) || /NEVER/.test(sp));
  assert.ok(sp.includes('LinkedIn'));
});

test('buildUserMessage: includes request fields and upstream data', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(
    REQUEST, ctx, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE], [VALID_SCORE], 'run-test', '2026-07-23T00:00:00Z'
  );
  assert.ok(msg.includes(REQUEST.targetMarket), 'should include targetMarket');
  assert.ok(msg.includes(REQUEST.businessObjective), 'should include businessObjective');
  assert.ok(msg.includes('cand-1'), 'should include upstream candidate data');
  assert.ok(msg.includes('ev-1'), 'should include upstream validated evidence');
  assert.ok(msg.includes('"totalScore"'), 'should include upstream scores');
});

test('buildUserMessage: includes stage contract from CONTEXT.md', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE], [VALID_SCORE], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('Opportunity Brief'), 'should include stage content from CONTEXT.md');
});

test('buildUserMessage: includes JSON output format instruction', () => {
  const ctx = loadStageContext();
  const msg = buildUserMessage(REQUEST, ctx, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE], [VALID_SCORE], 'r1', '2026-01-01T00:00:00Z');
  assert.ok(msg.includes('"briefs"'), 'should instruct about briefs field');
  assert.ok(msg.includes('recommendedNextAction'), 'should instruct about recommendedNextAction field');
});

// ─── stage05: parseAndValidateOutput ─────────────────────────────────────────

test('parseAndValidateOutput: returns briefs', () => {
  const providerResult = { structuredOutput: { briefs: [VALID_BRIEF()] }, warnings: [], content: '{}' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 1);
  assert.equal(result.warnings.length, 0);
});

test('parseAndValidateOutput: throws when structuredOutput is null', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: null, warnings: [], content: '' }, [], []),
    /no parseable JSON/
  );
});

test('parseAndValidateOutput: throws when "briefs" array is missing', () => {
  assert.throws(
    () => parseAndValidateOutput({ structuredOutput: {}, warnings: [], content: '' }, [], []),
    /missing "briefs"/
  );
});

test('parseAndValidateOutput: drops brief with invalid schema and warns', () => {
  const badItem = { candidateId: 'cand-1' }; // missing required fields
  const providerResult = { structuredOutput: { briefs: [badItem] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('cand-1')));
});

test('parseAndValidateOutput: drops brief referencing an unknown candidateId', () => {
  const badRef = VALID_BRIEF('run-test', { candidateId: 'cand-missing' });
  const providerResult = { structuredOutput: { briefs: [badRef] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('not found in Stage 02 candidates')));
});

test('parseAndValidateOutput: drops duplicate brief for the same candidate', () => {
  const dup = VALID_BRIEF();
  const providerResult = { structuredOutput: { briefs: [VALID_BRIEF(), dup] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 1);
  assert.ok(result.warnings.some((w) => w.includes('duplicate')));
});

test('parseAndValidateOutput: drops brief referencing an unknown evidenceId', () => {
  const badEvidence = VALID_BRIEF('run-test', { supportingEvidenceIds: ['ev-missing'] });
  const providerResult = { structuredOutput: { briefs: [badEvidence] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('unknown evidenceId')));
});

test('parseAndValidateOutput: drops brief whose recommendedNextAction contains outreach language', () => {
  const outreach = VALID_BRIEF('run-test', { recommendedNextAction: 'Email the head of operations to introduce our product.' });
  const providerResult = { structuredOutput: { briefs: [outreach] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('outreach language')));
});

test('parseAndValidateOutput: drops brief with a contact that has no valid sourceUrl', () => {
  const badContact = VALID_BRIEF('run-test', {
    contacts: [{ name: 'Nobody', role: 'x', targetRoleCategory: 'other', sourceUrl: 'not-a-url', sourceType: 'other' }],
  });
  const providerResult = { structuredOutput: { briefs: [badContact] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 0);
  assert.ok(result.warnings.some((w) => w.includes('no valid sourceUrl')));
});

test('parseAndValidateOutput: accepts a brief with zero contacts as honest', () => {
  const noContacts = VALID_BRIEF('run-test', { contacts: [] });
  const providerResult = { structuredOutput: { briefs: [noContacts] }, warnings: [], content: '' };
  const result = parseAndValidateOutput(providerResult, [VALID_CANDIDATE], [VALID_VALIDATED_EVIDENCE]);
  assert.equal(result.briefs.length, 1);
});

// ─── stage05: renderBriefsMarkdown ───────────────────────────────────────────

test('renderBriefsMarkdown: includes title, facts, and human verification items', () => {
  const md = renderBriefsMarkdown([VALID_BRIEF()], REQUEST);
  assert.ok(md.includes('Acquedotto Esempio'));
  assert.ok(md.includes('Italy requires water utilities'));
  assert.ok(md.includes('Confirm the contact still holds this role.'));
  assert.ok(md.includes('Example Contact'));
});

test('renderBriefsMarkdown: shows "none" for a brief with no contacts', () => {
  const md = renderBriefsMarkdown([VALID_BRIEF('run-test', { contacts: [] })], REQUEST);
  assert.ok(md.includes('Contacts found:** none'));
});

// ─── runStage05Local: orchestration ──────────────────────────────────────────

function makeMockProvider(overrides = {}) {
  let capturedTools = null;
  const provider = {
    generate: async (params) => {
      capturedTools = params.tools;
      return {
        content: JSON.stringify({ briefs: [VALID_BRIEF('run-x')] }),
        structuredOutput: { briefs: [VALID_BRIEF('run-x')] },
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
        ...overrides,
      };
    },
  };
  provider.getCapturedTools = () => capturedTools;
  return provider;
}

/** Seed a fake run directory as if Stage 01-04 already ran and Stage 01 approved. */
function seedRun(baseDir, runId, {
  stagesCompleted = ['market-signals', 'candidate-discovery', 'evidence-validation', 'opportunity-scoring'],
  gateOverrides = {},
  reviewGates = { gate1: 'approved', gate2: 'pending' },
} = {}) {
  const dir = join(baseDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'request.json'), JSON.stringify({ ...REQUEST, runId, mode: 'local-cli', createdAt: '2026-07-23T00:00:00.000Z' }));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify([VALID_CANDIDATE]));
  writeFileSync(join(dir, '03-validation.json'), JSON.stringify({ validated: [VALID_VALIDATED_EVIDENCE], rejected: [] }));
  writeFileSync(join(dir, '04-scores.json'), JSON.stringify([VALID_SCORE]));
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

test('runStage05Local: refuses to run when Stage 01 was never approved', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  try {
    seedRun(base, 'run-unapproved', { gateOverrides: { decision: null, status: 'stage_01_completed' } });
    await assert.rejects(
      () => runStage05Local('run-unapproved', { baseDir: base, _provider: makeMockProvider() }),
      /has not been approved/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: refuses to run when the run does not exist at all', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  try {
    await assert.rejects(
      () => runStage05Local('no-such-run', { baseDir: base, _provider: makeMockProvider() }),
      /no review-gate\.json found/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: refuses to run when Stage 04 has not completed yet', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  try {
    seedRun(base, 'run-no-stage04', { stagesCompleted: ['market-signals', 'candidate-discovery', 'evidence-validation'] });
    await assert.rejects(
      () => runStage05Local('run-no-stage04', { baseDir: base, _provider: makeMockProvider() }),
      /has not completed Stage 04/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: writes briefs (json + markdown) and raw output for an approved run', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  try {
    seedRun(base, 'run-approved');
    const result = await runStage05Local('run-approved', { baseDir: base, _provider: makeMockProvider() });

    assert.equal(result.status, 'stage_05_completed');
    assert.equal(result.briefedCount, 1);
    assert.ok(result.files.includes('05-briefs.json'));
    assert.ok(result.files.includes('05-brief.md'));
    assert.ok(result.files.includes('05-raw-output.json'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: calls the provider with tools: ["WebSearch"] only', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  const provider = makeMockProvider();
  try {
    seedRun(base, 'run-tools');
    await runStage05Local('run-tools', { baseDir: base, _provider: provider });
    assert.deepEqual(provider.getCapturedTools(), ['WebSearch'], 'must not request WebFetch');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: updates metadata.stagesCompleted to include opportunity-brief', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  try {
    const { readFileSync } = await import('node:fs');
    seedRun(base, 'run-approved-2');
    const result = await runStage05Local('run-approved-2', { baseDir: base, _provider: makeMockProvider() });
    const meta = JSON.parse(readFileSync(join(result.dir, 'metadata.json'), 'utf8'));
    assert.deepEqual(meta.stagesCompleted, ['market-signals', 'candidate-discovery', 'evidence-validation', 'opportunity-scoring', 'opportunity-brief']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: does not silently fall back to mock on provider error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  const brokenProvider = { generate: async () => { throw new Error('provider unavailable'); } };
  try {
    seedRun(base, 'run-approved-3');
    await assert.rejects(
      () => runStage05Local('run-approved-3', { baseDir: base, _provider: brokenProvider }),
      /Stage 05 failed/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: writes a stage-failure file on error, preserving artifacts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  const brokenProvider = { generate: async () => { throw new Error('timeout'); } };
  try {
    const { existsSync, readFileSync } = await import('node:fs');
    seedRun(base, 'run-approved-4');
    await assert.rejects(() => runStage05Local('run-approved-4', { baseDir: base, _provider: brokenProvider }));
    const failurePath = join(base, 'run-approved-4', '05-stage-failure.json');
    assert.ok(existsSync(failurePath));
    const failure = JSON.parse(readFileSync(failurePath, 'utf8'));
    assert.equal(failure.stage, 'opportunity-brief');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('runStage05Local: zero briefs is reported as its own status, not an error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'stage05-'));
  const noBriefsProvider = {
    generate: async () => ({
      content: JSON.stringify({ briefs: [] }),
      structuredOutput: { briefs: [] },
      provider: 'local-cli', model: 'sonnet', executionMode: 'local-cli',
      startedAt: '2026-07-23T00:00:00Z', completedAt: '2026-07-23T00:00:30Z', latencyMs: 30000,
      usage: { inputTokens: 'not_available', outputTokens: 'not_available' },
      toolActivity: 'not_available', warnings: [], rawProviderOutput: { exitCode: 0 },
      estimatedApiCost: 'not_applicable', subscriptionUsage: 'not_available',
    }),
  };
  try {
    seedRun(base, 'run-approved-5');
    const result = await runStage05Local('run-approved-5', { baseDir: base, _provider: noBriefsProvider });
    assert.equal(result.status, 'stage_05_no_briefs');
    assert.equal(result.briefedCount, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
