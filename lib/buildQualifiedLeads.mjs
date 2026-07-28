/**
 * lib/buildQualifiedLeads.mjs — the V1 qualified-leads export: hard filters
 * first, then rank survivors by totalScore (momentumSignal breaking ties).
 *
 * The contact filter is a disqualifier, not a score input, because the goal
 * is MARKETING-qualified leads: a utility with no named, sourced contact in
 * a target role isn't qualified no matter how it scored — a lower totalScore
 * with a real contact beats a higher one with nobody to reach. Same
 * principle already applied ad hoc to GEAL in the Toscana run via
 * leadQualification.excluded (project_context.md 2026-07-28/29) — this
 * generalises it into an explicit, repeatable rule.
 *
 * V1 status: this file is the durable artifact; the specific companies it
 * names are provisional. The five scoring dimensions and four target role
 * categories came from the internship brief, not validated HULO input — see
 * ASSUMPTIONS-TO-REVISIT.md items 1 and 6.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { findApprovedRuns } from './buildContactsMaster.mjs';

export const TARGET_ROLE_CATEGORIES = ['innovation', 'operations', 'asset-management', 'digital-transformation'];

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

/**
 * Applies the three hard filters and returns ranked survivors.
 * @returns {{ leads, totalScored, runs }}
 */
export function collectQualifiedLeads(runsDir) {
  const approvedRuns = findApprovedRuns(runsDir);
  const leads = [];
  let totalScored = 0;

  for (const runId of approvedRuns) {
    const dir = join(runsDir, runId);
    const candList = readJson(join(dir, '02-candidates.json')) || [];
    const scores = readJson(join(dir, '04-scores.json')) || [];
    const briefs = readJson(join(dir, '05-briefs.json')) || [];
    const candidateById = new Map(candList.map((c) => [c.candidateId, c]));
    const briefById = new Map(briefs.map((b) => [b.candidateId, b]));

    for (const score of scores) {
      totalScored++;
      const candidate = candidateById.get(score.candidateId);
      const brief = briefById.get(score.candidateId);
      if (!candidate || !brief) continue; // not briefed — can't have a qualifying contact

      const excludedOnContinuity = brief.leadQualification?.status === 'excluded';
      const targetRoleContacts = (brief.contacts || []).filter(
        (c) => c.sourceUrl && TARGET_ROLE_CATEGORIES.includes(c.targetRoleCategory)
      );
      const hasNrwEvidence = (score.dimensions?.nrwEvidence?.score || 0) > 0;

      if (excludedOnContinuity || targetRoleContacts.length === 0 || !hasNrwEvidence) continue;

      leads.push({
        runId,
        candidateId: score.candidateId,
        company: candidate.name,
        region: candidate.location?.region || candidate.location?.country || 'unknown',
        totalScore: score.totalScore,
        dimensions: score.dimensions,
        openOpportunities: score.openOpportunities || [],
        verifiedFacts: brief.factVsInterpretation?.verifiedFacts || [],
        humanVerificationRequired: brief.humanVerificationRequired || [],
        contacts: targetRoleContacts,
      });
    }
  }

  leads.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return (b.dimensions.momentumSignal?.score || 0) - (a.dimensions.momentumSignal?.score || 0);
  });

  return { leads, totalScored, runs: approvedRuns };
}

const DIMENSION_LABELS = {
  utilitySize: 'Utility size',
  nrwEvidence: 'NRW evidence',
  regionFit: 'Region fit',
  targetRolePresence: 'Target role presence',
  momentumSignal: 'Momentum signal',
};

function renderLead(lead, rank) {
  const lines = [
    `### ${rank}. ${lead.company} — ${lead.totalScore}/25 (${lead.region})`,
    '',
    `Run: \`${lead.runId}\` — candidate \`${lead.candidateId}\``,
    '',
    '**Dimension scores:**',
    '',
  ];
  for (const [key, label] of Object.entries(DIMENSION_LABELS)) {
    const dim = lead.dimensions[key];
    if (!dim) continue;
    lines.push(`- ${label}: ${dim.score}/5${key === 'momentumSignal' ? ` — ${dim.justification}` : ''}`);
  }

  lines.push('', '**Key verified facts:**', '');
  for (const fact of lead.verifiedFacts) lines.push(`- ${fact}`);

  lines.push('', '**Required human verification:**', '');
  for (const item of lead.humanVerificationRequired) lines.push(`- ${item}`);

  if (lead.openOpportunities.length) {
    lines.push('', '**Open opportunities:**', '');
    for (const opp of lead.openOpportunities) lines.push(`- ${opp.note}`);
  }

  lines.push('', '**Qualifying contact(s):**', '');
  for (const contact of lead.contacts) {
    lines.push(`- ${contact.name} — ${contact.role} (${contact.targetRoleCategory}), confidence ${contact.confidence ?? 'n/a'}, source: ${contact.sourceUrl}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function buildQualifiedLeadsContent({ runsDir }) {
  const { leads, totalScored, runs } = collectQualifiedLeads(runsDir);
  const top5 = leads.slice(0, 5);
  const rest = leads.slice(5);

  const lines = [
    '# Qualified Leads — V1 (pending ICP calibration with HULO)',
    '',
    '**Not final.** The five scoring dimensions and the four target role',
    'categories are provisional assumptions from the internship application',
    'brief, not validated HULO input — see `ASSUMPTIONS-TO-REVISIT.md` items 1',
    'and 6. **The selection rule below is the durable part of this',
    'deliverable; the specific companies listed are provisional** until real',
    'HULO sales/product input calibrates the scoring dimensions and target',
    'roles in internship week 1.',
    '',
    '## Selection rule',
    '',
    'Hard filters first (disqualifiers, not score inputs), then rank survivors',
    'by `totalScore`, `momentumSignal` breaking ties.',
    '',
    '**Filters:**',
    '1. Has at least one named contact with a real source URL in a target',
    '   role category (innovation / operations / asset-management /',
    '   digital-transformation)',
    '2. Not excluded on entity continuity (`leadQualification.status !==',
    '   "excluded"`)',
    '3. Has validated NRW/leakage evidence (`nrwEvidence` dimension score > 0)',
    '   — size alone (`utilitySize`) does not qualify a lead',
    '',
    'The contact filter is a hard filter, not a score input, because the goal',
    'is *marketing-qualified* leads, not just high-scoring organisations: a',
    'utility with no named, sourced person to reach isn’t qualified regardless',
    'of its score. A lower-scoring candidate with a real named contact in a',
    'target role is worth more than a higher-scoring one with nobody to',
    'contact.',
    '',
    `**${leads.length} of ${totalScored}** scored candidates across ${runs.length} Gate-2-approved runs passed the filter.`,
    '',
    '---',
    '',
    `## Top 5 (V1)`,
    '',
  ];

  for (let i = 0; i < top5.length; i++) lines.push(renderLead(top5[i], i + 1));

  if (rest.length) {
    lines.push('---', '', `## Also qualified (ranked 6–${leads.length})`, '');
    for (let i = 0; i < rest.length; i++) lines.push(renderLead(rest[i], i + 6));
  }

  return { content: lines.join('\n'), leads, top5, rest, totalScored, runs };
}
