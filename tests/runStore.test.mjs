import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRunStore, newRunId } from '../lib/workflow/runStore.mjs';

test('newRunId is unique and filesystem-safe', () => {
  const a = newRunId();
  const b = newRunId();
  assert.notEqual(a, b);
  assert.doesNotMatch(a, /[:.]/);
});

test('writeJson then readJson round-trips, in an isolated temp dir', () => {
  const base = mkdtempSync(join(tmpdir(), 'runstore-'));
  try {
    const store = createRunStore('run-x', base);
    store.writeJson('request.json', { hello: 'world' });
    assert.deepEqual(store.readJson('request.json'), { hello: 'world' });
    store.writeText('05-brief.md', '# Brief');
    assert.ok(store.list().includes('05-brief.md'));
    assert.ok(store.dir.startsWith(base));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
