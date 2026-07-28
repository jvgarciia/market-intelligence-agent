/**
 * lib/buildContactsMaster.mjs — consolidate contacts from every Gate-2-approved
 * run into a single markdown table.
 *
 * Only runs where metadata.json → reviewGates.gate2 === "approved" are
 * included, and membership is recomputed from scratch on every run — a
 * contact whose source run's gate2 flips back to "pending" (e.g. after a
 * brief gets regenerated post-approval) drops out of the table, it does not
 * linger from a previous build. Duplicates (same name + company,
 * case-insensitive, ignoring any parenthetical qualifier on the company
 * name) are skipped. Only each row's `status` is preserved from
 * an existing contacts-master.md — so a human's manual "verified" edit
 * survives a re-run for as long as that contact's run stays gate2-approved.
 *
 * Contacts here are informational only, same as CONTEXT.md requires for
 * Stage 05: nothing in this module triggers or implies outreach.
 *
 * runsDir/outputPath are always passed in explicitly (never resolved from
 * import.meta.url) so this module is trivially testable against a temp dir.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_CONTACT_TARGET = 30;

// ─── dedupe key ───────────────────────────────────────────────────────────────

/**
 * Same real company gets discovered under slightly different name strings
 * across independent Stage 02 runs (e.g. "AMAP S.p.A." vs "AMAP S.p.A.
 * (Azienda Municipalizzata Acquedotto Palermo)") — strip any parenthetical
 * qualifier before keying so the same contact doesn't get double-counted.
 */
function contactKey(name, company) {
  const normalizedCompany = company.split('(')[0].trim().toLowerCase();
  return `${name.trim().toLowerCase()}|${normalizedCompany}`;
}

// ─── find Gate-2-approved runs ────────────────────────────────────────────────

export function findApprovedRuns(runsDir) {
  if (!existsSync(runsDir)) return [];
  const runIds = readdirSync(runsDir).filter((name) => {
    const metaPath = join(runsDir, name, 'metadata.json');
    if (!existsSync(metaPath)) return false;
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      return meta.reviewGates?.gate2 === 'approved';
    } catch {
      return false;
    }
  });
  return runIds.sort();
}

// ─── extract contact rows from one run ────────────────────────────────────────

export function extractContactsFromRun(runsDir, runId) {
  const dir = join(runsDir, runId);
  const briefsPath = join(dir, '05-briefs.json');
  const candidatesPath = join(dir, '02-candidates.json');
  if (!existsSync(briefsPath) || !existsSync(candidatesPath)) return [];

  const briefs = JSON.parse(readFileSync(briefsPath, 'utf8'));
  const candidates = JSON.parse(readFileSync(candidatesPath, 'utf8'));
  const candidateById = new Map(candidates.map((c) => [c.candidateId, c]));

  const rows = [];
  for (const brief of briefs) {
    const candidate = candidateById.get(brief.candidateId);
    const company = candidate?.name || brief.candidateId;
    const region = candidate?.location?.region || candidate?.location?.country || 'unknown';

    for (const contact of brief.contacts || []) {
      rows.push({
        name: contact.name,
        role: contact.role,
        company,
        region,
        source: contact.sourceUrl,
        sourceType: contact.sourceType,
        status: 'unverified',
        runId,
        candidateId: brief.candidateId,
        confidence: contact.confidence,
        targetRoleCategory: contact.targetRoleCategory,
      });
    }
  }
  return rows;
}

// ─── parse an existing contacts-master.md to preserve manual status edits ────

export function parseExistingTable(text) {
  const existing = new Map();
  if (!text) return existing;

  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    // "| a | b | c |" → split on "|" gives a leading and trailing empty
    // element from the outer pipes — drop those, keep the real cells.
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 7) continue;
    if (cells[0].toLowerCase() === 'name') continue; // header row
    if (/^-+$/.test(cells[0])) continue; // "|---|---|" separator row

    const [name, role, company, region, source, sourceType, status] = cells;
    const key = contactKey(name, company);
    existing.set(key, { name, role, company, region, source, sourceType, status });
  }
  return existing;
}

// ─── build the full markdown content ──────────────────────────────────────────

/**
 * @param {object} options
 *   runsDir       string  — directory containing run folders
 *   existingText  string  — current contacts-master.md content, or '' if none
 *   contactTarget number  — target contact count for the running-count line
 * @returns {{ content, count, target, runs }}
 */
export function buildContactsMasterContent({ runsDir, existingText = '', contactTarget = DEFAULT_CONTACT_TARGET }) {
  const approvedRuns = findApprovedRuns(runsDir);

  // Only the status column carries over from a previous build — membership
  // (which contacts appear at all) is always recomputed from the CURRENT
  // set of gate2-approved runs, so a run that's no longer approved can't
  // leave stale contacts behind.
  const existingStatusByKey = new Map(
    [...parseExistingTable(existingText).entries()].map(([key, row]) => [key, row.status])
  );

  const rowsByKey = new Map();
  for (const runId of approvedRuns) {
    for (const row of extractContactsFromRun(runsDir, runId)) {
      const key = contactKey(row.name, row.company);
      if (rowsByKey.has(key)) continue; // duplicate across runs — keep the first
      const status = existingStatusByKey.get(key) || row.status;
      rowsByKey.set(key, { ...row, status });
    }
  }

  const rows = [...rowsByKey.values()];

  const lines = [
    '# Contacts Master',
    '',
    'Consolidated from every Review-Gate-2-approved run. Contacts here are informational only — nothing in this file triggers or implies outreach; each row still needs human verification before any use.',
    '',
    `**Contacts found: ${rows.length} / ${contactTarget} (target)**`,
    '',
    `Source runs (Gate 2 approved): ${approvedRuns.length ? approvedRuns.join(', ') : 'none yet'}`,
    '',
    '| Name | Role | Company | Region | Source | Source Type | Status |',
    '|------|------|---------|--------|--------|--------------|--------|',
  ];

  for (const row of rows) {
    lines.push(`| ${row.name} | ${row.role} | ${row.company} | ${row.region} | ${row.source} | ${row.sourceType} | ${row.status} |`);
  }

  lines.push('');

  return { content: lines.join('\n'), count: rows.length, target: contactTarget, runs: approvedRuns };
}
