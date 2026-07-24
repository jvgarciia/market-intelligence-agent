/**
 * lib/buildContactsMaster.mjs — consolidate contacts from every Gate-2-approved
 * run into a single markdown table.
 *
 * Only runs where metadata.json → reviewGates.gate2 === "approved" are
 * included — an unreviewed or rejected brief's contacts never enter this
 * file. Duplicates (same name + company, case-insensitive) are skipped, and
 * re-running against an existing table preserves any "verified" status a
 * human has since set by hand — new contacts are merged in, existing rows
 * are never overwritten.
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
    const key = `${name.toLowerCase()}|${company.toLowerCase()}`;
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

  const existingRows = parseExistingTable(existingText);
  const seen = new Set(existingRows.keys());
  const merged = new Map(existingRows);

  for (const runId of approvedRuns) {
    for (const row of extractContactsFromRun(runsDir, runId)) {
      const key = `${row.name.toLowerCase()}|${row.company.toLowerCase()}`;
      if (seen.has(key)) continue; // duplicate across runs, or already recorded — keep the existing row/status
      seen.add(key);
      merged.set(key, row);
    }
  }

  const rows = [...merged.values()];

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
