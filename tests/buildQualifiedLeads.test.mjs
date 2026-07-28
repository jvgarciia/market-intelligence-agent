/**
 * tests/buildQualifiedLeads.test.mjs — tests for lib/buildQualifiedLeads.mjs.
 *
 * Coverage: all three hard filters (target-role contact, entity-continuity
 * exclusion, nrwEvidence > 0), ranking (totalScore desc, momentumSignal
 * tiebreak), gate2-approved-only membership, V1 labelling in the rendered
 * content.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collectQualifiedLeads, buildQualifiedLeadsContent } from '../lib/buildQualifiedLeads.mjs';

function seedRun(runsDir, runId, { gate2 = 'approved', candidates = [], scores = [], briefs = [] } = {}) {
  const dir = join(runsDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ runId, reviewGates: { gate1: 'approved', gate2 } }));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify(candidates));
  writeFileSync(join(dir, '04-scores.json'), JSON.stringify(scores));
  writeFileSync(join(dir, '05-briefs.json'), JSON.stringify(briefs));
}

const DIMS = (overrides = {}) => ({
  utilitySize: { score: 5, justification: 'x' },
  nrwEvidence: { score: 4, justification: 'x' },
  regionFit: { score: 5, justification: 'x' },
  targetRolePresence: { score: 3, justification: 'x' },
  momentumSignal: { score: 2, justification: 'x' },
  ...overrides,
});

const CONTACT = (overrides = {}) => ({
  name: 'Jane Doe', role: 'Head of Ops', targetRoleCategory: 'operations',
  sourceUrl: 'https://example.com/jane', sourceType: 'linkedin-search', confidence: 0.6,
  ...overrides,
});

function candidate(id, name, region = 'Lombardia') {
  return { candidateId: id, name, location: { country: 'Italy', region } };
}

function score(id, totalScore, dims) {
  return { candidateId: id, totalScore, dimensions: dims };
}

function brief(id, overrides = {}) {
  return {
    candidateId: id,
    factVsInterpretation: { verifiedFacts: ['fact 1'] },
    humanVerificationRequired: ['verify x'],
    contacts: [CONTACT()],
    ...overrides,
  };
}

test('collectQualifiedLeads: qualifies a candidate with a target-role contact and nrwEvidence > 0', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'Utility A')],
      scores: [score('cand-1', 18, DIMS())],
      briefs: [brief('cand-1')],
    });
    const { leads } = collectQualifiedLeads(base);
    assert.equal(leads.length, 1);
    assert.equal(leads[0].company, 'Utility A');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('collectQualifiedLeads: excludes a candidate with no target-role contact (a contact in "other" does not count)', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'Utility A')],
      scores: [score('cand-1', 20, DIMS())],
      briefs: [brief('cand-1', { contacts: [CONTACT({ targetRoleCategory: 'other' })] })],
    });
    const { leads } = collectQualifiedLeads(base);
    assert.equal(leads.length, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('collectQualifiedLeads: excludes a candidate with no contacts at all', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'Utility A')],
      scores: [score('cand-1', 25, DIMS())],
      briefs: [brief('cand-1', { contacts: [] })],
    });
    const { leads } = collectQualifiedLeads(base);
    assert.equal(leads.length, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('collectQualifiedLeads: excludes a candidate flagged leadQualification.excluded regardless of score', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'GEAL-like utility')],
      scores: [score('cand-1', 22, DIMS())],
      briefs: [brief('cand-1', { leadQualification: { status: 'excluded', reason: 'being absorbed' } })],
    });
    const { leads } = collectQualifiedLeads(base);
    assert.equal(leads.length, 0, 'a 22/25 with a real contact must still be excluded on entity continuity');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('collectQualifiedLeads: excludes a candidate with nrwEvidence 0 even if utilitySize is 5 (size alone does not qualify)', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'Big but no NRW evidence')],
      scores: [score('cand-1', 15, DIMS({ nrwEvidence: { score: 0, justification: 'inference' } }))],
      briefs: [brief('cand-1')],
    });
    const { leads } = collectQualifiedLeads(base);
    assert.equal(leads.length, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('collectQualifiedLeads: a lower totalScore with a named contact outranks nothing — ranking is by totalScore desc, momentumSignal tiebreak', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'High score low momentum'), candidate('cand-2', 'Same score high momentum')],
      scores: [
        score('cand-1', 19, DIMS({ momentumSignal: { score: 1, justification: 'x' } })),
        score('cand-2', 19, DIMS({ momentumSignal: { score: 5, justification: 'x' } })),
      ],
      briefs: [brief('cand-1'), brief('cand-2')],
    });
    const { leads } = collectQualifiedLeads(base);
    assert.equal(leads.length, 2);
    assert.equal(leads[0].company, 'Same score high momentum', 'momentumSignal must break a totalScore tie');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('collectQualifiedLeads: only counts gate2-approved runs', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-pending', {
      gate2: 'pending',
      candidates: [candidate('cand-1', 'Utility A')],
      scores: [score('cand-1', 20, DIMS())],
      briefs: [brief('cand-1')],
    });
    const { leads, runs } = collectQualifiedLeads(base);
    assert.equal(leads.length, 0);
    assert.deepEqual(runs, []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildQualifiedLeadsContent: labels the output V1 and puts the filter reasoning in the file', () => {
  const base = mkdtempSync(join(tmpdir(), 'leads-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [candidate('cand-1', 'Utility A')],
      scores: [score('cand-1', 20, DIMS())],
      briefs: [brief('cand-1')],
    });
    const result = buildQualifiedLeadsContent({ runsDir: base });
    assert.ok(result.content.includes('V1 (pending ICP calibration with HULO)'));
    assert.ok(result.content.includes('hard filter'));
    assert.ok(result.content.includes('Utility A'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
