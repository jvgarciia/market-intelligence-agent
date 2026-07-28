/**
 * lib/contactDataAsOf.mjs — per-contact "dataAsOf": when a contact was
 * actually sourced, not when the run finished.
 *
 * A run's 05-briefs.json can be a composite of more than one Stage 05 pass —
 * a targeted re-run adds contacts for specific candidates without touching
 * the rest (see the Sicilia run, project_context.md 2026-07-29). The
 * run-level `completedAt` in metadata.json only reflects the LATEST pass,
 * which is the wrong date for contacts actually sourced by an earlier one.
 *
 * Recovers per-contact timing from the gate2-approved-backup* snapshots each
 * merge already leaves behind (same backup-before-overwrite habit used
 * throughout this project, e.g. buildContactsMaster.mjs's dedupe). A
 * contact's dataAsOf is the completedAt of the EARLIEST snapshot it appears
 * in; a contact only in the current briefs gets the run's own completedAt.
 * Backup folders with no metadata.json (e.g. a superseded curated-vs-
 * brief-all version — not a merge, a full replacement) are skipped: there is
 * no earlier date to recover there, and using the current run's date for
 * those contacts is already correct.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function contactDateKey(name, candidateId) {
  return `${name.trim().toLowerCase()}|${candidateId}`;
}

function readBriefContactKeys(briefsPath) {
  if (!existsSync(briefsPath)) return new Set();
  const briefs = JSON.parse(readFileSync(briefsPath, 'utf8'));
  const keys = new Set();
  for (const brief of briefs) {
    for (const contact of brief.contacts || []) {
      keys.add(contactDateKey(contact.name, brief.candidateId));
    }
  }
  return keys;
}

/**
 * @returns Map<"name|candidateId", isoTimestamp> for every contact present
 * in the run's current 05-briefs.json.
 */
export function computeContactDataAsOf(runsDir, runId) {
  const dir = join(runsDir, runId);
  const result = new Map();

  const currentMetaPath = join(dir, 'metadata.json');
  const currentBriefsPath = join(dir, '05-briefs.json');
  if (!existsSync(currentMetaPath) || !existsSync(currentBriefsPath)) return result;

  const currentMeta = JSON.parse(readFileSync(currentMetaPath, 'utf8'));
  const currentTimestamp = currentMeta.completedAt || currentMeta.createdAt;
  if (!currentTimestamp) return result;

  const snapshots = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('gate2-approved') || !entry.name.includes('backup')) continue;
    const backupDir = join(dir, entry.name);
    const backupMetaPath = join(backupDir, 'metadata.json');
    const backupBriefsPath = join(backupDir, '05-briefs.json');
    if (!existsSync(backupMetaPath) || !existsSync(backupBriefsPath)) continue;
    const backupMeta = JSON.parse(readFileSync(backupMetaPath, 'utf8'));
    const timestamp = backupMeta.completedAt || backupMeta.createdAt;
    if (!timestamp) continue;
    snapshots.push({ timestamp, keys: readBriefContactKeys(backupBriefsPath) });
  }
  snapshots.push({ timestamp: currentTimestamp, keys: readBriefContactKeys(currentBriefsPath) });
  snapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const finalKeys = snapshots[snapshots.length - 1].keys;
  for (const key of finalKeys) {
    const earliest = snapshots.find((snap) => snap.keys.has(key));
    result.set(key, earliest.timestamp);
  }

  return result;
}
