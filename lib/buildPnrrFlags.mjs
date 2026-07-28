/**
 * lib/buildPnrrFlags.mjs — tags each scored candidate's momentum by how much
 * it depends on PNRR funding. NOT a re-score — the RRF Regulation requires
 * all PNRR milestones/targets complete by 31 August 2026, so a momentum
 * story built on PNRR has a known expiry date. This is a pre-outreach
 * re-source list: which candidates' "currently investing" claim needs a
 * fresh check before outreach, not something to trust as still true.
 *
 * Heuristic: pools text from momentumSignal.justification +
 * nrwEvidence.justification + openOpportunities notes, plus the claim text
 * of every evidence item any of those cite (ev-N references, resolved
 * against 03-validation.json — momentumSignal alone often doesn't carry the
 * PNRR figure itself; nrwEvidence or the cited evidence item usually does,
 * see Etra/Sorical/BrianzAcque in project_context.md).
 *   - "pnrr" absent anywhere in the pool -> not anchored
 *   - present, one distinct euro figure in the pool -> fully anchored
 *   - present, two-plus distinct euro figures -> partly anchored (a PNRR
 *     share alongside a separate total or co-funding figure — e.g.
 *     BrianzAcque's "€50M of a €60M plan", Sorical's "€8M smart metering +
 *     €32.8M PNRR")
 * This is a keyword heuristic over already-validated evidence text, not a
 * fresh read of every source. "Not anchored" means "no PNRR mention found in
 * this candidate's own evidence," not "confirmed PNRR-independent."
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { findApprovedRuns } from './buildContactsMaster.mjs';

export const PNRR_MILESTONE_DEADLINE = '2026-08-31';

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function extractEvidenceIds(text) {
  return [...(text || '').matchAll(/ev-\d+/g)].map((m) => m[0]);
}

export function classifyPnrrDependency(text) {
  const lower = text.toLowerCase();
  if (!lower.includes('pnrr')) return 'not';
  const moneyMentions = new Set(text.match(/€\s?[\d.,]+\s?(million|m|k)?/gi) || []);
  return moneyMentions.size >= 2 ? 'partly' : 'fully';
}

export function computePnrrFlags(runsDir) {
  const approvedRuns = findApprovedRuns(runsDir);
  const flags = [];

  for (const runId of approvedRuns) {
    const dir = join(runsDir, runId);
    const candList = readJson(join(dir, '02-candidates.json')) || [];
    const scores = readJson(join(dir, '04-scores.json')) || [];
    const validation = readJson(join(dir, '03-validation.json')) || { validated: [], rejected: [] };
    const candidateById = new Map(candList.map((c) => [c.candidateId, c]));
    const evidenceById = new Map(
      [...validation.validated, ...validation.rejected].map((e) => [e.evidenceId, e])
    );

    for (const score of scores) {
      const candidate = candidateById.get(score.candidateId);
      if (!candidate) continue;

      const momentumJustification = score.dimensions?.momentumSignal?.justification || '';
      const nrwJustification = score.dimensions?.nrwEvidence?.justification || '';
      const openNotes = (score.openOpportunities || []).map((o) => o.note).join(' ');
      const openEvidenceIds = (score.openOpportunities || []).map((o) => o.evidenceId).filter(Boolean);

      const citedIds = new Set([
        ...extractEvidenceIds(momentumJustification),
        ...extractEvidenceIds(nrwJustification),
        ...extractEvidenceIds(openNotes),
        ...openEvidenceIds,
      ]);
      const citedClaims = [...citedIds].map((id) => evidenceById.get(id)?.claim || '').join(' ');

      const pool = [momentumJustification, nrwJustification, openNotes, citedClaims].join(' ');

      flags.push({
        runId,
        candidateId: score.candidateId,
        company: candidate.name,
        region: candidate.location?.region || candidate.location?.country || 'unknown',
        momentumScore: score.dimensions?.momentumSignal?.score ?? null,
        momentumJustification,
        tag: classifyPnrrDependency(pool),
      });
    }
  }

  return { flags, runs: approvedRuns };
}

function renderGroup(title, items) {
  const lines = [`## ${title} (${items.length})`, ''];
  if (!items.length) {
    lines.push('_None._', '');
    return lines.join('\n');
  }
  lines.push('| Company | Region | Momentum score | Momentum justification |', '|---|---|---|---|');
  for (const item of items) {
    const justification = item.momentumJustification.replace(/\|/g, '\\|');
    lines.push(`| ${item.company} | ${item.region} | ${item.momentumScore ?? 'n/a'}/5 | ${justification} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function buildPnrrFlagsContent({ runsDir }) {
  const { flags, runs } = computePnrrFlags(runsDir);
  const fully = flags.filter((f) => f.tag === 'fully');
  const partly = flags.filter((f) => f.tag === 'partly');
  const notAnchored = flags.filter((f) => f.tag === 'not');

  const lines = [
    '# PNRR Dependency Flags',
    '',
    `The RRF Regulation requires all PNRR milestones and targets to be complete by **${PNRR_MILESTONE_DEADLINE}**.`,
    'Most candidates’ momentum evidence in this project traces back to PNRR funding — after',
    'that date, "currently investing" stops being safe to assume across most of the lead list',
    'at once. **This is a pre-outreach re-source list, not a re-score** — nothing here changes',
    'any `totalScore` or `momentumSignal` value; re-check the flagged candidates’ funding status',
    'before outreach rather than trusting the score as still current.',
    '',
    `${flags.length} scored candidates across ${runs.length} Gate-2-approved runs: ` +
      `**${fully.length} fully PNRR-anchored, ${partly.length} partly, ${notAnchored.length} not anchored.**`,
    '',
    '_Tags are a keyword heuristic over already-validated evidence text (see lib/buildPnrrFlags.mjs',
    'for the exact method) — treat "not anchored" as "no PNRR mention found," not as a confirmed',
    'absence of PNRR involvement._',
    '',
    '---',
    '',
    renderGroup('Fully PNRR-anchored', fully),
    renderGroup('Partly PNRR-anchored', partly),
    renderGroup('Not PNRR-anchored', notAnchored),
  ];

  return { content: lines.join('\n'), flags, runs };
}
