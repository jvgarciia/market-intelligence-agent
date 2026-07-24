/**
 * tests/buildContactsMaster.test.mjs — tests for lib/buildContactsMaster.mjs.
 *
 * Everything runs against a temp runs/ directory — no real run data or the
 * real contacts-master.md is ever touched.
 *
 * Coverage: findApprovedRuns, extractContactsFromRun, parseExistingTable,
 * buildContactsMasterContent (dedup, merge, status preservation, target line).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  findApprovedRuns,
  extractContactsFromRun,
  parseExistingTable,
  buildContactsMasterContent,
  DEFAULT_CONTACT_TARGET,
} from '../lib/buildContactsMaster.mjs';

// ─── helpers ──────────────────────────────────────────────────────────────────

function seedRun(runsDir, runId, { gate2 = 'approved', candidates = [], briefs = [] } = {}) {
  const dir = join(runsDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    runId, workflow: 'market-opportunity', mode: 'local-cli',
    reviewGates: { gate1: 'approved', gate2 },
  }));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify(candidates));
  writeFileSync(join(dir, '05-briefs.json'), JSON.stringify(briefs));
}

const CAND = { candidateId: 'cand-1', name: 'Example Utility', location: { country: 'Italy', region: 'Lombardia' } };
const BRIEF_WITH_CONTACT = {
  candidateId: 'cand-1',
  contacts: [{ name: 'Jane Doe', role: 'Head of Operations', targetRoleCategory: 'operations', sourceUrl: 'https://example.com/jane', sourceType: 'linkedin-search' }],
};
const BRIEF_NO_CONTACT = { candidateId: 'cand-1', contacts: [] };

// ─── findApprovedRuns ─────────────────────────────────────────────────────────

test('findApprovedRuns: returns only runs with gate2 approved', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-approved', { gate2: 'approved' });
    seedRun(base, 'run-pending', { gate2: 'pending' });
    seedRun(base, 'run-rejected', { gate2: 'changes-requested' });
    assert.deepEqual(findApprovedRuns(base), ['run-approved']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('findApprovedRuns: returns empty array when runs dir does not exist', () => {
  assert.deepEqual(findApprovedRuns(join(tmpdir(), 'no-such-dir-' + Date.now())), []);
});

// ─── extractContactsFromRun ───────────────────────────────────────────────────

test('extractContactsFromRun: pulls name/role/company/region/source from briefs + candidates', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-1', { candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const rows = extractContactsFromRun(base, 'run-1');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Jane Doe');
    assert.equal(rows[0].company, 'Example Utility');
    assert.equal(rows[0].region, 'Lombardia');
    assert.equal(rows[0].status, 'unverified');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('extractContactsFromRun: briefs with zero contacts produce zero rows', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-1', { candidates: [CAND], briefs: [BRIEF_NO_CONTACT] });
    assert.deepEqual(extractContactsFromRun(base, 'run-1'), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('extractContactsFromRun: returns empty array when required files are missing', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    mkdirSync(join(base, 'run-incomplete'), { recursive: true });
    assert.deepEqual(extractContactsFromRun(base, 'run-incomplete'), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ─── parseExistingTable ───────────────────────────────────────────────────────

test('parseExistingTable: parses rows keyed by name+company, skips header/separator', () => {
  const text = [
    '| Name | Role | Company | Region | Source | Source Type | Status |',
    '|------|------|---------|--------|--------|--------------|--------|',
    '| Jane Doe | Head of Ops | Example Utility | Lombardia | https://x | linkedin-search | verified |',
  ].join('\n');
  const parsed = parseExistingTable(text);
  assert.equal(parsed.size, 1);
  assert.equal(parsed.get('jane doe|example utility').status, 'verified');
});

test('parseExistingTable: returns empty map for empty input', () => {
  assert.equal(parseExistingTable('').size, 0);
});

// ─── buildContactsMasterContent ───────────────────────────────────────────────

test('buildContactsMasterContent: only includes contacts from gate2-approved runs', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-approved', { gate2: 'approved', candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    seedRun(base, 'run-pending', { gate2: 'pending', candidates: [CAND], briefs: [{ candidateId: 'cand-1', contacts: [{ name: 'Should Not Appear', role: 'x', sourceUrl: 'https://y', sourceType: 'other' }] }] });
    const result = buildContactsMasterContent({ runsDir: base, existingText: '' });
    assert.equal(result.count, 1);
    assert.ok(result.content.includes('Jane Doe'));
    assert.ok(!result.content.includes('Should Not Appear'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: table has zero rows for briefs with no contacts, not one row per company', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-1', { candidates: [CAND], briefs: [BRIEF_NO_CONTACT] });
    const result = buildContactsMasterContent({ runsDir: base, existingText: '' });
    assert.equal(result.count, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: dedupes same name+company across two runs', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    seedRun(base, 'run-b', { candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const result = buildContactsMasterContent({ runsDir: base, existingText: '' });
    assert.equal(result.count, 1, 'same name+company from two runs must collapse to one row');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: preserves a manually-set status on re-run, does not duplicate', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const first = buildContactsMasterContent({ runsDir: base, existingText: '' });

    const manuallyVerified = first.content.replace('| unverified |', '| verified |');
    const second = buildContactsMasterContent({ runsDir: base, existingText: manuallyVerified });

    assert.equal(second.count, 1, 're-running must not duplicate the same contact');
    assert.ok(second.content.includes('| verified |'), 'manually-set status must survive a re-run');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: drops a contact when its run\'s gate2 flips back to pending', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { gate2: 'approved', candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const first = buildContactsMasterContent({ runsDir: base, existingText: '' });
    assert.equal(first.count, 1);

    // Run gets regenerated (e.g. via --brief-all) and its gate2 is reset to
    // pending pending re-review — the contact must not linger from before.
    seedRun(base, 'run-a', { gate2: 'pending', candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const second = buildContactsMasterContent({ runsDir: base, existingText: first.content });
    assert.equal(second.count, 0, 'contact from a no-longer-approved run must be dropped, not linger');
    assert.ok(!second.content.includes('Jane Doe'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: a contact reappears (as unverified) if its run is re-approved after being pending', () => {
  // A dropped contact's prior status is not preserved across the drop — once
  // it's gone from the table there is nowhere to read the old status from.
  // This only re-derives membership + status from what's currently in the
  // file; it does not maintain a separate history.
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { gate2: 'approved', candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const first = buildContactsMasterContent({ runsDir: base, existingText: '' });

    seedRun(base, 'run-a', { gate2: 'pending', candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const dropped = buildContactsMasterContent({ runsDir: base, existingText: first.content });
    assert.equal(dropped.count, 0);

    seedRun(base, 'run-a', { gate2: 'approved', candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const restored = buildContactsMasterContent({ runsDir: base, existingText: dropped.content });
    assert.equal(restored.count, 1);
    assert.ok(restored.content.includes('| unverified |'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: respects a custom contactTarget', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { candidates: [CAND], briefs: [BRIEF_NO_CONTACT] });
    const result = buildContactsMasterContent({ runsDir: base, existingText: '', contactTarget: 99 });
    assert.equal(result.target, 99);
    assert.ok(result.content.includes('/ 99 (target)'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: defaults contactTarget to 30 when not given', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { candidates: [CAND], briefs: [BRIEF_NO_CONTACT] });
    const result = buildContactsMasterContent({ runsDir: base, existingText: '' });
    assert.equal(result.target, DEFAULT_CONTACT_TARGET);
    assert.equal(DEFAULT_CONTACT_TARGET, 30);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsMasterContent: lists source run ids in the output', () => {
  const base = mkdtempSync(join(tmpdir(), 'contacts-'));
  try {
    seedRun(base, 'run-a', { candidates: [CAND], briefs: [BRIEF_WITH_CONTACT] });
    const result = buildContactsMasterContent({ runsDir: base, existingText: '' });
    assert.ok(result.content.includes('run-a'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
