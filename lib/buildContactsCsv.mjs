/**
 * lib/buildContactsCsv.mjs — the hand-off contacts export: every contact
 * from every Gate-2-approved run as one flat CSV, ready to drop into a
 * spreadsheet or CRM.
 *
 * Reuses contacts-master.md's exact run-selection and dedupe rules
 * (findApprovedRuns / extractContactsFromRun in buildContactsMaster.mjs) so
 * the two outputs never disagree on which contacts count. Adds columns
 * contacts-master.md doesn't carry: role category, confidence,
 * per-contact dataAsOf (see contactDataAsOf.mjs), and source run id — all
 * needed once this leaves the project and the reader has no other context.
 */

import { findApprovedRuns, extractContactsFromRun, parseExistingTable } from './buildContactsMaster.mjs';
import { computeContactDataAsOf } from './contactDataAsOf.mjs';

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function masterKey(name, company) {
  const normalizedCompany = company.split('(')[0].trim().toLowerCase();
  return `${name.trim().toLowerCase()}|${normalizedCompany}`;
}

export function confidenceBucket(confidence) {
  if (confidence === undefined || confidence === null) return 'unknown';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'mid';
  return 'low';
}

const HEADER = [
  'name', 'role', 'role_category', 'company', 'region',
  'source_url', 'source_type', 'confidence', 'verification_status',
  'dataAsOf', 'source_run_id',
];

/**
 * @param {object} options
 *   runsDir           string — directory containing run folders
 *   existingMasterText string — contacts-master.md content, to carry over
 *                       manually-set verification status by the same key
 * @returns {{ csv, count, distribution, runs }}
 */
export function buildContactsCsvContent({ runsDir, existingMasterText = '' }) {
  const approvedRuns = findApprovedRuns(runsDir);
  const statusByKey = new Map(
    [...parseExistingTable(existingMasterText).entries()].map(([key, row]) => [key, row.status])
  );

  const rowsByKey = new Map();
  for (const runId of approvedRuns) {
    const dataAsOfByKey = computeContactDataAsOf(runsDir, runId);
    for (const row of extractContactsFromRun(runsDir, runId)) {
      const key = masterKey(row.name, row.company);
      if (rowsByKey.has(key)) continue; // same cross-run dedupe rule as contacts-master.md
      const dateKey = `${row.name.trim().toLowerCase()}|${row.candidateId}`;
      rowsByKey.set(key, {
        ...row,
        status: statusByKey.get(key) || row.status,
        dataAsOf: dataAsOfByKey.get(dateKey) || 'unknown',
      });
    }
  }

  const rows = [...rowsByKey.values()];

  const distribution = { high: 0, mid: 0, low: 0, unknown: 0 };
  for (const row of rows) distribution[confidenceBucket(row.confidence)]++;

  const lines = [HEADER.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.role,
        row.targetRoleCategory || 'other',
        row.company,
        row.region,
        row.source,
        row.sourceType,
        row.confidence ?? '',
        row.status,
        row.dataAsOf,
        row.runId,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return { csv: lines.join('\n') + '\n', count: rows.length, distribution, runs: approvedRuns };
}
