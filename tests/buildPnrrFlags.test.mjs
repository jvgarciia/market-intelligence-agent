/**
 * tests/buildPnrrFlags.test.mjs — tests for lib/buildPnrrFlags.mjs.
 *
 * Coverage: classifyPnrrDependency's three buckets, resolving PNRR mentions
 * that live in cited evidence rather than the justification text itself
 * (the real-data case this module exists for — see BrianzAcque/Sorical in
 * project_context.md), gate2-approved-only membership.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { classifyPnrrDependency, computePnrrFlags, buildPnrrFlagsContent } from '../lib/buildPnrrFlags.mjs';

test('classifyPnrrDependency: no "pnrr" mention -> not', () => {
  assert.equal(classifyPnrrDependency('A €5M network upgrade with no funding source named.'), 'not');
});

test('classifyPnrrDependency: "pnrr" with one euro figure -> fully', () => {
  assert.equal(classifyPnrrDependency('A €5M PNRR-funded leak-reduction project.'), 'fully');
});

test('classifyPnrrDependency: "pnrr" with two distinct euro figures -> partly', () => {
  assert.equal(
    classifyPnrrDependency('Financed with almost €50 million from the PNRR, part of a broader €60 million investment plan.'),
    'partly'
  );
});

function seedRun(runsDir, runId, { gate2 = 'approved', candidates = [], scores = [], validated = [], rejected = [] } = {}) {
  const dir = join(runsDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ runId, reviewGates: { gate1: 'approved', gate2 } }));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify(candidates));
  writeFileSync(join(dir, '04-scores.json'), JSON.stringify(scores));
  writeFileSync(join(dir, '03-validation.json'), JSON.stringify({ validated, rejected }));
}

const CAND = { candidateId: 'cand-1', name: 'Example Utility', location: { country: 'Italy', region: 'Lombardia' } };

test('computePnrrFlags: resolves a PNRR mention that only exists in a cited evidence claim, not the justification text', () => {
  const base = mkdtempSync(join(tmpdir(), 'pnrr-'));
  try {
    const scores = [{
      candidateId: 'cand-1',
      totalScore: 20,
      dimensions: {
        momentumSignal: { score: 3, justification: 'Recent, specific, funded programme with a numeric target (ev-1, ev-2).' },
        nrwEvidence: { score: 4, justification: 'x' },
      },
    }];
    const validated = [
      { evidenceId: 'ev-1', claim: 'A project covers 1,663 km of network.' },
      { evidenceId: 'ev-2', claim: 'The project is financed with almost €50 million from the PNRR, part of a broader €60 million investment plan.' },
    ];
    seedRun(base, 'run-1', { candidates: [CAND], scores, validated });
    const { flags } = computePnrrFlags(base);
    assert.equal(flags.length, 1);
    assert.equal(flags[0].tag, 'partly', 'must resolve ev-2 to find the PNRR figures the justification text alone does not contain');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('computePnrrFlags: only counts gate2-approved runs', () => {
  const base = mkdtempSync(join(tmpdir(), 'pnrr-'));
  try {
    seedRun(base, 'run-1', {
      gate2: 'pending',
      candidates: [CAND],
      scores: [{ candidateId: 'cand-1', totalScore: 20, dimensions: { momentumSignal: { score: 1, justification: 'x' }, nrwEvidence: { score: 1, justification: 'x' } } }],
    });
    const { flags, runs } = computePnrrFlags(base);
    assert.equal(flags.length, 0);
    assert.deepEqual(runs, []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildPnrrFlagsContent: states the 31 August 2026 RRF deadline and that this is not a re-score', () => {
  const base = mkdtempSync(join(tmpdir(), 'pnrr-'));
  try {
    seedRun(base, 'run-1', {
      candidates: [CAND],
      scores: [{ candidateId: 'cand-1', totalScore: 20, dimensions: { momentumSignal: { score: 3, justification: 'A PNRR-funded project.' }, nrwEvidence: { score: 4, justification: 'x' } } }],
    });
    const result = buildPnrrFlagsContent({ runsDir: base });
    assert.ok(result.content.includes('2026-08-31'));
    assert.ok(result.content.includes('not a re-score'));
    assert.ok(result.content.includes('Example Utility'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
