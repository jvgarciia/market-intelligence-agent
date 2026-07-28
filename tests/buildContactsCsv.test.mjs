/**
 * tests/buildContactsCsv.test.mjs — tests for lib/buildContactsCsv.mjs.
 *
 * Coverage: header + row shape, CSV escaping of commas/quotes, confidence
 * distribution buckets, status carry-over from an existing contacts-master.md,
 * gate2-approved-only membership (same rule as buildContactsMaster.mjs).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildContactsCsvContent, confidenceBucket } from '../lib/buildContactsCsv.mjs';

function seedRun(runsDir, runId, { gate2 = 'approved', candidates = [], briefs = [], completedAt = '2026-01-01T00:00:00Z' } = {}) {
  const dir = join(runsDir, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    runId, completedAt, reviewGates: { gate1: 'approved', gate2 },
  }));
  writeFileSync(join(dir, '02-candidates.json'), JSON.stringify(candidates));
  writeFileSync(join(dir, '05-briefs.json'), JSON.stringify(briefs));
}

const CAND = { candidateId: 'cand-1', name: 'Example Utility', location: { country: 'Italy', region: 'Lombardia' } };
const BRIEF = {
  candidateId: 'cand-1',
  contacts: [{
    name: 'Jane Doe', role: 'Head of Ops, "Water" Division', targetRoleCategory: 'operations',
    sourceUrl: 'https://example.com/jane', sourceType: 'linkedin-search', confidence: 0.8,
  }],
};

test('confidenceBucket: buckets at the documented thresholds', () => {
  assert.equal(confidenceBucket(0.7), 'high');
  assert.equal(confidenceBucket(0.69), 'mid');
  assert.equal(confidenceBucket(0.4), 'mid');
  assert.equal(confidenceBucket(0.39), 'low');
  assert.equal(confidenceBucket(undefined), 'unknown');
});

test('buildContactsCsvContent: header + one row per contact, CSV-escapes embedded commas/quotes', () => {
  const base = mkdtempSync(join(tmpdir(), 'csv-'));
  try {
    seedRun(base, 'run-1', { candidates: [CAND], briefs: [BRIEF] });
    const result = buildContactsCsvContent({ runsDir: base });
    const lines = result.csv.trim().split('\n');
    assert.equal(lines[0], 'name,role,role_category,company,region,source_url,source_type,confidence,verification_status,dataAsOf,source_run_id');
    assert.equal(lines.length, 2);
    assert.ok(lines[1].includes('"Head of Ops, ""Water"" Division"'), 'comma+quote field must be CSV-escaped');
    assert.equal(result.count, 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsCsvContent: only counts gate2-approved runs', () => {
  const base = mkdtempSync(join(tmpdir(), 'csv-'));
  try {
    seedRun(base, 'run-approved', { gate2: 'approved', candidates: [CAND], briefs: [BRIEF] });
    seedRun(base, 'run-pending', { gate2: 'pending', candidates: [CAND], briefs: [BRIEF] });
    const result = buildContactsCsvContent({ runsDir: base });
    assert.equal(result.count, 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsCsvContent: confidence distribution counts land in the right bucket', () => {
  const base = mkdtempSync(join(tmpdir(), 'csv-'));
  try {
    const briefs = [{
      candidateId: 'cand-1',
      contacts: [
        { name: 'A', role: 'r', targetRoleCategory: 'operations', sourceUrl: 'https://x/a', sourceType: 'other', confidence: 0.9 },
        { name: 'B', role: 'r', targetRoleCategory: 'operations', sourceUrl: 'https://x/b', sourceType: 'other', confidence: 0.5 },
        { name: 'C', role: 'r', targetRoleCategory: 'operations', sourceUrl: 'https://x/c', sourceType: 'other', confidence: 0.2 },
        { name: 'D', role: 'r', targetRoleCategory: 'operations', sourceUrl: 'https://x/d', sourceType: 'other' },
      ],
    }];
    seedRun(base, 'run-1', { candidates: [CAND], briefs });
    const result = buildContactsCsvContent({ runsDir: base });
    assert.deepEqual(result.distribution, { high: 1, mid: 1, low: 1, unknown: 1 });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('buildContactsCsvContent: carries over a manually-set verification status from contacts-master.md', () => {
  const base = mkdtempSync(join(tmpdir(), 'csv-'));
  try {
    seedRun(base, 'run-1', { candidates: [CAND], briefs: [BRIEF] });
    const existingMasterText = [
      '| Name | Role | Company | Region | Source | Source Type | Status |',
      '|------|------|---------|--------|--------|--------------|--------|',
      '| Jane Doe | Head of Ops | Example Utility | Lombardia | https://x | linkedin-search | verified |',
    ].join('\n');
    const result = buildContactsCsvContent({ runsDir: base, existingMasterText });
    assert.ok(result.csv.includes(',verified,'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
