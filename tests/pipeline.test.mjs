import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWorkflow } from '../lib/workflow/runWorkflow.mjs';

const REQUEST = {
  targetMarket: 'Spain',
  targetCustomerType: 'water utilities',
  solutionDescription: 'AI leak-detection software',
  businessObjective: 'Shortlist utilities to research',
  constraints: ['EU only'],
};

test('a full mock run writes every expected artifact and validates', () => {
  const base = mkdtempSync(join(tmpdir(), 'pipeline-'));
  try {
    const result = runWorkflow(REQUEST, { mode: 'mock', baseDir: base, now: '2026-06-13T00:00:00.000Z' });
    const expected = [
      'request.json', '00-sources.json', '01-market-signals.json', '02-candidates.json',
      '03-validation.json', '04-scores.json', '05-briefs.json', '05-brief.md', 'metadata.json',
    ];
    for (const file of expected) {
      assert.ok(result.files.includes(file), `produced ${file}`);
      assert.ok(existsSync(join(result.dir, file)), `wrote ${file} to disk`);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('mock run is deterministic (same inputs → same scores)', () => {
  const base = mkdtempSync(join(tmpdir(), 'pipeline-'));
  try {
    const opts = { mode: 'mock', baseDir: base, now: '2026-06-13T00:00:00.000Z' };
    const a = runWorkflow({ ...REQUEST, runId: 'run-a' }, opts);
    const b = runWorkflow({ ...REQUEST, runId: 'run-b' }, opts);
    // Compare the scoring content, ignoring per-run metadata (runId differs by design).
    const scoringContent = (dir) =>
      JSON.parse(readFileSync(join(dir, '04-scores.json'), 'utf8'))
        .map(({ candidateId, dimensions, totalScore }) => ({ candidateId, dimensions, totalScore }));
    assert.deepEqual(scoringContent(a.dir), scoringContent(b.dir));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('cheap/full modes refuse to run instead of silently spending', () => {
  assert.throws(() => runWorkflow(REQUEST, { mode: 'cheap' }), /only implemented for mock/);
  assert.throws(() => runWorkflow(REQUEST, { mode: 'full' }), /only implemented for mock/);
});

test('the run-request itself is schema-valid (no missing inputs slip through)', () => {
  const base = mkdtempSync(join(tmpdir(), 'pipeline-'));
  try {
    assert.throws(
      () => runWorkflow({ targetMarket: 'Spain' }, { mode: 'mock', baseDir: base }),
      /Invalid "run-request"/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
