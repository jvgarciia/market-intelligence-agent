import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_NAMES, getSchema, validateArtifact } from '../lib/workflow/schemas.mjs';

test('every named schema loads and is an object schema', () => {
  for (const name of SCHEMA_NAMES) {
    const schema = getSchema(name);
    assert.equal(typeof schema, 'object');
    assert.ok(schema.type, `${name} has a type`);
  }
});

test('unknown schema name throws', () => {
  assert.throws(() => getSchema('does-not-exist'), /Unknown schema/);
});

const META = { runId: 'r1', stage: 'market-signals', createdAt: '2026-06-13T00:00:00.000Z' };

test('a good market-signal passes', () => {
  const signal = {
    signalId: 'sig-1',
    claim: 'A real claim.',
    signalType: 'regulation',
    relevance: 'high',
    confidence: 0.8,
    uncertainty: 'none',
    sourceIds: ['src-1'],
    metadata: META,
  };
  assert.deepEqual(validateArtifact('market-signal', signal), []);
});

test('a market-signal with no sources fails (minItems)', () => {
  const signal = {
    signalId: 'sig-1', claim: 'x', signalType: 'regulation', relevance: 'high',
    confidence: 0.8, sourceIds: [], metadata: META,
  };
  assert.ok(validateArtifact('market-signal', signal).length > 0);
});

test('confidence out of range fails', () => {
  const signal = {
    signalId: 'sig-1', claim: 'x', signalType: 'regulation', relevance: 'high',
    confidence: 1.5, sourceIds: ['src-1'], metadata: META,
  };
  assert.ok(validateArtifact('market-signal', signal).some((e) => /maximum/.test(e)));
});

test('an invalid rejectionReason fails', () => {
  const item = {
    evidenceId: 'ev-1', claim: 'x', rejectionReason: 'because-i-said-so',
    metadata: { ...META, stage: 'evidence-validation' },
  };
  assert.ok(validateArtifact('rejected-evidence-item', item).length > 0);
});

test('opportunity-brief without humanVerificationRequired fails', () => {
  const brief = {
    candidateId: 'cand-1', title: 't', whyItMatters: 'w',
    supportingEvidenceIds: ['ev-1'],
    factVsInterpretation: { verifiedFacts: [], modelInterpretations: [] },
    uncertainties: [], recommendedNextAction: 'research more',
    humanVerificationRequired: [],
    metadata: { ...META, stage: 'opportunity-brief' },
  };
  assert.ok(validateArtifact('opportunity-brief', brief).some((e) => /humanVerificationRequired/.test(e)));
});
