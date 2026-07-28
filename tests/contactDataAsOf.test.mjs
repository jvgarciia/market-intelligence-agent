/**
 * tests/contactDataAsOf.test.mjs — tests for lib/contactDataAsOf.mjs.
 *
 * Coverage: single-pass runs get the run's own completedAt; a contact that
 * only exists in a backup snapshot dates to that snapshot; a contact added
 * after the backup dates to the current run; backups without metadata.json
 * are ignored; a run with no backups at all still resolves cleanly.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeContactDataAsOf } from '../lib/contactDataAsOf.mjs';

function writeRun(runsDir, runId, { completedAt, briefs }) {
  const dir = join(runsDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ runId, completedAt }));
  writeFileSync(join(dir, '05-briefs.json'), JSON.stringify(briefs));
  return dir;
}

function writeBackup(runDir, name, { completedAt, briefs }) {
  const dir = join(runDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ completedAt }));
  writeFileSync(join(dir, '05-briefs.json'), JSON.stringify(briefs));
}

const BRIEF = (candidateId, names) => ({
  candidateId,
  contacts: names.map((name) => ({ name, role: 'x', targetRoleCategory: 'operations', sourceUrl: 'https://x', sourceType: 'other' })),
});

test('computeContactDataAsOf: single-pass run gives every contact the run completedAt', () => {
  const base = mkdtempSync(join(tmpdir(), 'dataasof-'));
  try {
    writeRun(base, 'run-1', { completedAt: '2026-01-01T00:00:00Z', briefs: [BRIEF('cand-1', ['Jane Doe'])] });
    const result = computeContactDataAsOf(base, 'run-1');
    assert.equal(result.get('jane doe|cand-1'), '2026-01-01T00:00:00Z');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('computeContactDataAsOf: a contact only in a backup dates to the backup, not the current run', () => {
  const base = mkdtempSync(join(tmpdir(), 'dataasof-'));
  try {
    const dir = writeRun(base, 'run-1', {
      completedAt: '2026-02-01T00:00:00Z',
      briefs: [BRIEF('cand-1', ['Jane Doe', 'New Person'])],
    });
    writeBackup(dir, 'gate2-approved-backup', {
      completedAt: '2026-01-01T00:00:00Z',
      briefs: [BRIEF('cand-1', ['Jane Doe'])],
    });
    const result = computeContactDataAsOf(base, 'run-1');
    assert.equal(result.get('jane doe|cand-1'), '2026-01-01T00:00:00Z', 'original contact keeps the earlier date');
    assert.equal(result.get('new person|cand-1'), '2026-02-01T00:00:00Z', 'newly-added contact gets the current date');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('computeContactDataAsOf: a backup with no metadata.json is ignored, not treated as an earlier date', () => {
  const base = mkdtempSync(join(tmpdir(), 'dataasof-'));
  try {
    const dir = writeRun(base, 'run-1', { completedAt: '2026-03-01T00:00:00Z', briefs: [BRIEF('cand-1', ['Jane Doe'])] });
    const backupDir = join(dir, 'gate2-approved-curated-backup');
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, '05-briefs.json'), JSON.stringify([BRIEF('cand-1', ['Jane Doe'])]));
    // deliberately no metadata.json in the backup
    const result = computeContactDataAsOf(base, 'run-1');
    assert.equal(result.get('jane doe|cand-1'), '2026-03-01T00:00:00Z');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('computeContactDataAsOf: run with no backups at all resolves from metadata alone', () => {
  const base = mkdtempSync(join(tmpdir(), 'dataasof-'));
  try {
    writeRun(base, 'run-1', { completedAt: '2026-04-01T00:00:00Z', briefs: [BRIEF('cand-1', ['Jane Doe'])] });
    const result = computeContactDataAsOf(base, 'run-1');
    assert.equal(result.size, 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('computeContactDataAsOf: missing run returns an empty map, not a throw', () => {
  const base = mkdtempSync(join(tmpdir(), 'dataasof-'));
  try {
    assert.equal(computeContactDataAsOf(base, 'no-such-run').size, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
