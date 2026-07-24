/**
 * lib/workflow/stage05.mjs — Stage 05 Opportunity Brief execution.
 *
 * Owns the Stage 05 contract: turns the top-scored candidates into
 * decision-ready briefs, separating verified facts from interpretation, and
 * searches for named contacts using only the approved contact-search methods
 * (search-result snippets, team pages, trade-association listings — never a
 * direct LinkedIn profile visit, never scraping). This is Review Gate 2's
 * source material, not the gate decision itself.
 *
 * Contains no provider-specific code — works with any provider that implements
 * generate({ systemPrompt, userMessage, tools? }).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateArtifact } from './schemas.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_ROOT = join(here, '..', '..', 'workflows', 'market-opportunity');
const STAGE_DIR = join(WORKFLOW_ROOT, '05_opportunity-brief');

const OUTREACH_PATTERN = /\b(email|e-mail|reach out|outreach|send a message|cold call|call them|contact (him|her|them)|schedule a call)\b/i;

// ─── context loading ──────────────────────────────────────────────────────────

/**
 * Load the stable reference file for Stage 05.
 * Only CONTEXT.md — this stage synthesises upstream artifacts, it does not
 * re-apply evidence-standards judgment (that already happened in Stage 03).
 */
export function loadStageContext() {
  return {
    contract: readFileSync(join(STAGE_DIR, 'CONTEXT.md'), 'utf8'),
  };
}

// ─── prompt construction ──────────────────────────────────────────────────────

/**
 * Filter candidates down to those "surviving" Stage 03 validation — at least
 * one of the candidate's relevanceEvidence sourceIds is also cited as a
 * supportingSourceId by a validated evidence item. Used by --brief-all mode
 * to brief every surviving candidate rather than the model's own top-pick
 * selection; the default (curated) mode ignores this filter entirely.
 *
 * @param {Array} candidates — Stage 02's 02-candidates.json
 * @param {Array} validated  — Stage 03's validated evidence items only
 * @returns {Array} the subset of candidates with at least one validated source
 */
export function filterCandidatesSurvivingValidation(candidates, validated) {
  const validatedSourceIds = new Set();
  for (const item of validated || []) {
    for (const id of item.supportingSourceIds || []) validatedSourceIds.add(id);
  }
  return (candidates || []).filter((c) =>
    (c.relevanceEvidence || []).some((ev) =>
      (ev.sourceIds || []).some((id) => validatedSourceIds.has(id))
    )
  );
}

/**
 * The system prompt: sets the briefing role and the contact-search boundary.
 * Short by design — the user message carries all stage-specific context.
 *
 * @param {object} [options]
 *   briefAll boolean — when true, instructs the model to brief every
 *                      candidate provided rather than self-selecting a
 *                      curated top-pick subset (the default)
 */
export function buildSystemPrompt({ briefAll = false } = {}) {
  return [
    'You are a B2B market intelligence analyst writing decision-ready briefs.',
    '',
    'Your job:',
    briefAll
      ? '- Write one brief for EVERY candidate provided below — do not skip any,'
        + ' even lower-scored ones'
      : '- Select the strongest-scored candidates and write one brief per candidate',
    '- Keep verifiedFacts (backed by validated evidence) strictly separate from',
    '  modelInterpretations (your reasoning) — never blend them',
    '- recommendedNextAction is a research or marketing action only — NEVER an',
    '  instruction to email, call, or otherwise contact anyone',
    '- For contacts: use only WebSearch result snippets, an organisation\'s own',
    '  team/leadership page, trade-association listings, or press mentions.',
    '  Do not attempt to open a LinkedIn profile page directly — you do not',
    '  have a tool that can do that, and it is out of scope regardless',
    '- A contact with no real sourceUrl is not a contact — never invent one',
    '- Finding zero contacts for a candidate is an honest, acceptable result',
    '- Return ONLY valid JSON — no explanation, no text, no markdown fences',
  ].join('\n');
}

/**
 * Build the user message for Stage 05.
 * Separated into five clearly labelled layers:
 *   1. Stage contract (the CONTEXT.md instructions)
 *   2. Upstream input (Stage 02 candidates + Stage 03 validated evidence + Stage 04 scores)
 *   3. Output schema (field-by-field + example)
 *   4. This run's request
 *
 * @param {object} request    — validated run-request object
 * @param {object} stageCtx   — from loadStageContext()
 * @param {Array}  candidates — Stage 02's 02-candidates.json
 * @param {Array}  validated  — Stage 03's validated evidence items only
 * @param {Array}  scores     — Stage 04's 04-scores.json
 * @param {string} runId      — for stamping brief metadata
 * @param {string} createdAt  — ISO timestamp to use for brief metadata
 * @param {object} [options]
 *   briefAll boolean — when true, states explicitly that every candidate
 *                      below must be briefed, not just the top-scored ones
 */
export function buildUserMessage(request, stageCtx, candidates, validated, scores, runId, createdAt, { briefAll = false } = {}) {
  const constraintLine = request.constraints?.length
    ? `- constraints: ${request.constraints.join('; ')}`
    : '';

  const exampleBrief = {
    candidateId: 'cand-1',
    title: 'Example Utility — priority opportunity',
    whyItMatters: 'One or two sentences on why this candidate is worth pursuing now.',
    supportingEvidenceIds: ['ev-1'],
    factVsInterpretation: {
      verifiedFacts: ['A fact backed by a validated evidence item (ev-1).'],
      modelInterpretations: ['A reasoning statement, clearly not presented as fact.'],
    },
    uncertainties: ['What remains unconfirmed.'],
    recommendedNextAction: 'A research or marketing action — never outreach.',
    contacts: [
      {
        name: 'Person Name',
        role: 'Exact job title as found',
        targetRoleCategory: 'operations',
        sourceUrl: 'https://real-url-from-your-search.example',
        sourceType: 'company-team-page',
        confidence: 0.6,
        uncertainty: 'What is unconfirmed, e.g. role may be outdated.',
      },
    ],
    humanVerificationRequired: ['At least one thing a human must confirm before acting.'],
    metadata: { runId, stage: 'opportunity-brief', createdAt },
  };

  return [
    '# Stage 05 — Opportunity Brief',
    '',
    '## 1. Stage Contract (your instructions)',
    stageCtx.contract,
    '',
    '## 2. Upstream Input — write a brief for each candidate',
    briefAll
      ? 'Write one brief for EVERY candidate listed below — this run is in'
        + ' --brief-all mode, so a low score is not a reason to skip a candidate.'
      : 'Select the strongest-scored candidates below and write one brief each.',
    'Base every verifiedFact on the validated evidence provided — do not invent',
    'facts, and do not use rejected evidence (it is not included here).',
    '',
    '### Candidates (02-candidates.json):',
    JSON.stringify(candidates, null, 2),
    '',
    '### Validated evidence (03-validation.json → validated only):',
    JSON.stringify(validated, null, 2),
    '',
    '### Opportunity scores (04-scores.json):',
    JSON.stringify(scores, null, 2),
    '',
    '## 3. Required Output Format',
    'Return ONLY this JSON object. Nothing before it. Nothing after it.',
    'Do not wrap it in markdown code blocks.',
    '',
    '```',
    '{ "briefs": [ ... ] }',
    '```',
    '',
    '### opportunity-brief fields (one object per candidate in "briefs"):',
    '- candidateId              — string, must match a candidateId from Candidates above',
    '- title                    — string',
    '- whyItMatters             — string',
    '- supportingEvidenceIds    — array, minimum 1, evidenceId strings from the validated evidence above',
    '- factVsInterpretation     — { "verifiedFacts": [string, ...], "modelInterpretations": [string, ...] }',
    '- uncertainties            — array of strings',
    '- recommendedNextAction    — string, a research/marketing action, NEVER outreach/contact wording',
    '- contacts                 — array (may be empty), each: { "name", "role", "targetRoleCategory"',
    '                             (one of: "innovation" | "operations" | "asset-management" |',
    '                             "digital-transformation" | "other"), "sourceUrl" (real URL, never',
    '                             invented), "sourceType" (one of: "linkedin-search" |',
    '                             "company-team-page" | "trade-association-listing" | "press-mention" |',
    '                             "other"), "confidence" (0.0-1.0, optional), "uncertainty" (optional) }',
    '- humanVerificationRequired — array, minimum 1',
    `- metadata                 — { "runId": "${runId}", "stage": "opportunity-brief", "createdAt": "${createdAt}" }`,
    '',
    'Every supportingEvidenceIds entry MUST exist in the validated evidence above.',
    '',
    '### Example (one brief):',
    JSON.stringify({ briefs: [exampleBrief] }, null, 2),
    '',
    '## 4. Research Request',
    `- targetMarket: ${request.targetMarket}`,
    `- targetCustomerType: ${request.targetCustomerType}`,
    `- solutionDescription: ${request.solutionDescription}`,
    `- businessObjective: ${request.businessObjective}`,
    constraintLine,
    '',
    'Write the briefs now. Return the JSON now:',
  ].filter((line) => line !== null).join('\n');
}

// ─── output parsing and validation ───────────────────────────────────────────

/**
 * Parse the provider result into a list of opportunity briefs.
 *
 * Validation is item-by-item: a malformed brief is recorded as a warning and
 * dropped, but the stage only fails if the response is unparseable. A brief
 * whose recommendedNextAction contains outreach language is dropped rather
 * than silently kept — CONTEXT.md's verification checks treat this as a hard
 * rule, and unlike Stage 04's totalScore, prose cannot be mechanically fixed.
 *
 * @param {object} providerResult — from provider.generate()
 * @param {Array}  candidates     — Stage 02's candidates, for candidateId cross-check
 * @param {Array}  validated      — Stage 03's validated evidence, for supportingEvidenceIds cross-check
 * @returns {{ briefs, droppedCount, warnings, rawContent }}
 * @throws if structuredOutput is missing or malformed
 */
export function parseAndValidateOutput(providerResult, candidates, validated) {
  const warnings = [...(providerResult.warnings || [])];

  if (!providerResult.structuredOutput || typeof providerResult.structuredOutput !== 'object') {
    throw new Error(
      'Stage 05: provider returned no parseable JSON.\n' +
      `Provider warnings: ${warnings.join('; ') || 'none'}\n` +
      'Raw content is preserved in rawProviderOutput for debugging.'
    );
  }

  const parsed = providerResult.structuredOutput;

  if (!Array.isArray(parsed.briefs)) {
    throw new Error('Stage 05: JSON response missing "briefs" array.');
  }

  const candidateIds = new Set((candidates || []).map((c) => c.candidateId));
  const evidenceIds = new Set((validated || []).map((e) => e.evidenceId));
  const seenCandidateIds = new Set();

  const briefs = [];
  let droppedCount = 0;

  for (const [i, item] of parsed.briefs.entries()) {
    const errors = validateArtifact('opportunity-brief', item);
    if (errors.length) {
      warnings.push(`Dropped briefs[${i}] (${item?.candidateId || 'no-id'}): ${errors.join('; ')}`);
      droppedCount++;
      continue;
    }

    if (!candidateIds.has(item.candidateId)) {
      warnings.push(`Dropped briefs[${i}] (${item.candidateId}): candidateId not found in Stage 02 candidates.`);
      droppedCount++;
      continue;
    }

    if (seenCandidateIds.has(item.candidateId)) {
      warnings.push(`Dropped briefs[${i}] (${item.candidateId}): duplicate brief for a candidate already briefed.`);
      droppedCount++;
      continue;
    }

    const missingEvidence = item.supportingEvidenceIds.filter((id) => !evidenceIds.has(id));
    if (missingEvidence.length) {
      warnings.push(
        `Dropped briefs[${i}] (${item.candidateId}): references unknown evidenceId(s) ${missingEvidence.join(', ')}`
      );
      droppedCount++;
      continue;
    }

    if (OUTREACH_PATTERN.test(item.recommendedNextAction)) {
      warnings.push(
        `Dropped briefs[${i}] (${item.candidateId}): recommendedNextAction contains outreach language: ` +
        `"${item.recommendedNextAction.slice(0, 100)}"`
      );
      droppedCount++;
      continue;
    }

    const badContactUrl = (item.contacts || []).find((c) => !/^https?:\/\//i.test(c.sourceUrl || ''));
    if (badContactUrl) {
      warnings.push(
        `Dropped briefs[${i}] (${item.candidateId}): contact "${badContactUrl.name}" has no valid sourceUrl.`
      );
      droppedCount++;
      continue;
    }

    seenCandidateIds.add(item.candidateId);
    briefs.push(item);
  }

  return {
    briefs,
    droppedCount,
    warnings,
    rawContent: providerResult.content,
  };
}

// ─── markdown rendering ───────────────────────────────────────────────────────

/**
 * Render briefs as human-readable markdown for Review Gate 2.
 * A reviewer should be able to read this file top to bottom without opening
 * the JSON — every field the schema requires is represented.
 */
export function renderBriefsMarkdown(briefs, request) {
  const lines = [
    `# Opportunity Briefs — ${request.targetMarket}`,
    '',
    `**Target customer type:** ${request.targetCustomerType}`,
    `**Business objective:** ${request.businessObjective}`,
    '',
    '_Review Gate 2: confirm the fact/interpretation split and the items flagged',
    'for verification before treating any brief as final. Contacts are',
    'unverified until a human confirms name, role, and source are current._',
    '',
    '---',
    '',
  ];

  for (const brief of briefs) {
    lines.push(`## ${brief.title}`, '');
    lines.push(`**Candidate:** ${brief.candidateId}`, '');
    lines.push(`**Why it matters:** ${brief.whyItMatters}`, '');

    lines.push('**Verified facts:**');
    for (const f of brief.factVsInterpretation.verifiedFacts) lines.push(`- ${f}`);
    lines.push('');

    lines.push('**Model interpretations (not fact):**');
    for (const m of brief.factVsInterpretation.modelInterpretations) lines.push(`- ${m}`);
    lines.push('');

    lines.push('**Uncertainties:**');
    for (const u of brief.uncertainties) lines.push(`- ${u}`);
    lines.push('');

    lines.push(`**Recommended next action:** ${brief.recommendedNextAction}`, '');

    if (brief.contacts && brief.contacts.length) {
      lines.push('**Contacts found (unverified):**');
      for (const c of brief.contacts) {
        lines.push(`- ${c.name} — ${c.role} (${c.targetRoleCategory}) — [source](${c.sourceUrl}) — ${c.sourceType}`);
      }
    } else {
      lines.push('**Contacts found:** none');
    }
    lines.push('');

    lines.push('**Human verification required:**');
    for (const h of brief.humanVerificationRequired) lines.push(`- ${h}`);
    lines.push('');

    lines.push(`**Supporting evidence:** ${brief.supportingEvidenceIds.join(', ')}`, '');
    lines.push('---', '');
  }

  return lines.join('\n');
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Run Stage 05 end-to-end using the given provider.
 *
 * @param {object} request    — validated run-request object (must include runId)
 * @param {Array}  candidates — Stage 02's 02-candidates.json
 * @param {Array}  validated  — Stage 03's validated evidence items only
 * @param {Array}  scores     — Stage 04's 04-scores.json
 * @param {object} provider   — any object with generate({ systemPrompt, userMessage, tools? })
 * @param {object} [options]
 *   briefAll boolean — when true, briefs every candidate that survives Stage
 *                      03 validation instead of the model's curated top-pick
 *                      subset (the default)
 * @returns {{ briefs, meta }}
 */
export async function runStage05(request, candidates, validated, scores, provider, options = {}) {
  const { briefAll = false } = options;
  const createdAt = new Date().toISOString();
  const stageCtx = loadStageContext();

  const candidatesForPrompt = briefAll
    ? filterCandidatesSurvivingValidation(candidates, validated)
    : candidates;

  const systemPrompt = buildSystemPrompt({ briefAll });
  const userMessage = buildUserMessage(request, stageCtx, candidatesForPrompt, validated, scores, request.runId, createdAt, { briefAll });

  // WebSearch only — no WebFetch — so the CLI cannot fetch any URL, including
  // a LinkedIn profile page. Structural enforcement of the CONTEXT.md rule.
  const providerResult = await provider.generate({ systemPrompt, userMessage, tools: ['WebSearch'] });

  const result = parseAndValidateOutput(providerResult, candidates, validated);

  return {
    briefs: result.briefs,
    meta: {
      provider: providerResult.provider,
      model: providerResult.model,
      latencyMs: providerResult.latencyMs,
      startedAt: providerResult.startedAt,
      completedAt: providerResult.completedAt,
      usage: providerResult.usage,
      toolActivity: providerResult.toolActivity,
      warnings: result.warnings,
      droppedCount: result.droppedCount,
      rawContent: result.rawContent,
      rawProviderOutput: providerResult.rawProviderOutput,
    },
  };
}
