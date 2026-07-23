/**
 * lib/workflow/stage03.mjs — Stage 03 Evidence Validation execution.
 *
 * Owns the Stage 03 contract: takes Stage 01's signals/sources and Stage 02's
 * candidates, applies the keep/reject rules from evidence-standards.md to every
 * claim, and returns two lists — validated and rejected — so nothing is dropped
 * silently. This is a gatekeeping stage, not a re-research stage: no new sources
 * are expected, only judgment against already-gathered evidence.
 *
 * Contains no provider-specific code — works with any provider that implements
 * generate({ systemPrompt, userMessage }).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateArtifact } from './schemas.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_ROOT = join(here, '..', '..', 'workflows', 'market-opportunity');
const STAGE_DIR = join(WORKFLOW_ROOT, '03_evidence-validation');
const REFS_DIR = join(WORKFLOW_ROOT, 'references');

// ─── context loading ──────────────────────────────────────────────────────────

/**
 * Load the stable reference files for Stage 03.
 * Only these two files are loaded; nothing from other stages or the full repo.
 */
export function loadStageContext() {
  return {
    contract: readFileSync(join(STAGE_DIR, 'CONTEXT.md'), 'utf8'),
    evidenceStandards: readFileSync(join(REFS_DIR, 'evidence-standards.md'), 'utf8'),
  };
}

// ─── prompt construction ──────────────────────────────────────────────────────

/**
 * The system prompt: sets the gatekeeping role.
 * Short by design — the user message carries all stage-specific context.
 */
export function buildSystemPrompt() {
  return [
    'You are a B2B market intelligence evidence auditor.',
    '',
    'Your job:',
    '- Judge each claim already gathered against the evidence standards — do not',
    '  research new claims and do not invent sources',
    '- Every claim must end up either validated or rejected — never dropped silently',
    '- Reject with exactly one allowed reason; validate only with real source support',
    '- Return ONLY valid JSON — no explanation, no text, no markdown fences',
    '- If nothing survives, return an empty "validated" array — never pad it',
  ].join('\n');
}

/**
 * Build the user message for Stage 03.
 * Separated into five clearly labelled layers:
 *   1. Stage contract (the CONTEXT.md instructions)
 *   2. Evidence standards (the keep/reject rules this stage enforces)
 *   3. Upstream input (Stage 01's sources/signals + Stage 02's candidates)
 *   4. Output schema (field-by-field + example)
 *   5. This run's request
 *
 * @param {object} request    — validated run-request object
 * @param {object} stageCtx   — from loadStageContext()
 * @param {Array}  sources    — Stage 01's 00-sources.json
 * @param {Array}  signals    — Stage 01's 01-market-signals.json
 * @param {Array}  candidates — Stage 02's 02-candidates.json
 * @param {string} runId      — for stamping evidence-item metadata
 * @param {string} createdAt  — ISO timestamp to use for evidence-item metadata
 */
export function buildUserMessage(request, stageCtx, sources, signals, candidates, runId, createdAt) {
  const constraintLine = request.constraints?.length
    ? `- constraints: ${request.constraints.join('; ')}`
    : '';

  const exampleValidated = {
    evidenceId: 'ev-1',
    claim: 'One factual statement that passed the keep rules.',
    validationStatus: 'validated',
    supportingSourceIds: ['src-1'],
    recencyOk: true,
    confidence: 0.8,
    metadata: { runId, stage: 'evidence-validation', createdAt },
  };

  const exampleRejected = {
    evidenceId: 'ev-2',
    claim: 'A claim that failed one of the keep rules.',
    rejectionReason: 'weak-evidence',
    notes: 'Only a Tier-C source supports a claim that needs more.',
    metadata: { runId, stage: 'evidence-validation', createdAt },
  };

  return [
    '# Stage 03 — Evidence Validation',
    '',
    '## 1. Stage Contract (your instructions)',
    stageCtx.contract,
    '',
    '## 2. Evidence Standards (the rules you enforce)',
    stageCtx.evidenceStandards,
    '',
    '## 3. Upstream Input — every claim to judge',
    'Judge every signal claim and every candidate relevanceEvidence claim below.',
    'Do not search the web or add new claims — apply the rules above to what is',
    'already here.',
    '',
    '### Sources (00-sources.json):',
    JSON.stringify(sources, null, 2),
    '',
    '### Signals (01-market-signals.json):',
    JSON.stringify(signals, null, 2),
    '',
    '### Candidates (02-candidates.json):',
    JSON.stringify(candidates, null, 2),
    '',
    '## 4. Required Output Format',
    'Return ONLY this JSON object. Nothing before it. Nothing after it.',
    'Do not wrap it in markdown code blocks.',
    '',
    '```',
    '{ "validated": [ ... ], "rejected": [ ... ] }',
    '```',
    '',
    '### validated-evidence-item fields (one object per item in "validated"):',
    '- evidenceId          — string, e.g. "ev-1", "ev-2" (unique, sequential)',
    '- claim               — string, the exact claim being validated',
    '- validationStatus    — always "validated"',
    '- supportingSourceIds — array, minimum 1, sourceId strings that must exist in Sources above',
    '- recencyOk           — boolean; false = kept but flagged for age per the recency rules',
    '- confidence          — number 0.0–1.0',
    `- metadata            — { "runId": "${runId}", "stage": "evidence-validation", "createdAt": "${createdAt}" }`,
    '',
    '### rejected-evidence-item fields (one object per item in "rejected"):',
    '- evidenceId       — string, e.g. "ev-3" (unique, sequential, continues from validated)',
    '- claim            — string, the exact claim being rejected',
    '- rejectionReason  — exactly one of: "duplicate" | "weak-evidence" | "outdated" | "unsupported-assumption" | "off-topic" | "unverifiable-source"',
    '- notes            — string, a short explanation a reviewer can trust',
    `- metadata         — { "runId": "${runId}", "stage": "evidence-validation", "createdAt": "${createdAt}" }`,
    '',
    'Every supportingSourceIds entry you cite MUST exist in the Sources above.',
    'A claim appears in exactly one list, never both. Identical claims collapse to',
    'one validated item; the rest are rejected as "duplicate".',
    '',
    '### Example (one validated, one rejected):',
    JSON.stringify({ validated: [exampleValidated], rejected: [exampleRejected] }, null, 2),
    '',
    '## 5. Research Request',
    `- targetMarket: ${request.targetMarket}`,
    `- targetCustomerType: ${request.targetCustomerType}`,
    `- solutionDescription: ${request.solutionDescription}`,
    `- businessObjective: ${request.businessObjective}`,
    constraintLine,
    '',
    'Validate the evidence now. Return the JSON now:',
  ].filter((line) => line !== null).join('\n');
}

// ─── output parsing and validation ───────────────────────────────────────────

/**
 * Parse the provider result into validated/rejected evidence items.
 *
 * Validation is item-by-item: a malformed item is recorded as a warning and
 * dropped, but the stage only fails if the response is unparseable. An empty
 * "validated" list is an accepted, honest result (CONTEXT.md failure condition:
 * "if everything is rejected, that is a valid result").
 *
 * @param {object} providerResult — from provider.generate()
 * @param {Array}  sources        — Stage 01's sources, for supportingSourceIds cross-check
 * @returns {{ validated, rejected, rejectedCount, warnings, rawContent }}
 * @throws if structuredOutput is missing or malformed
 */
export function parseAndValidateOutput(providerResult, sources) {
  const warnings = [...(providerResult.warnings || [])];

  if (!providerResult.structuredOutput || typeof providerResult.structuredOutput !== 'object') {
    throw new Error(
      'Stage 03: provider returned no parseable JSON.\n' +
      `Provider warnings: ${warnings.join('; ') || 'none'}\n` +
      'Raw content is preserved in rawProviderOutput for debugging.'
    );
  }

  const parsed = providerResult.structuredOutput;

  if (!Array.isArray(parsed.validated)) {
    throw new Error('Stage 03: JSON response missing "validated" array.');
  }
  if (!Array.isArray(parsed.rejected)) {
    throw new Error('Stage 03: JSON response missing "rejected" array.');
  }

  const sourceIds = new Set((sources || []).map((s) => s.sourceId));
  const seenClaims = new Set();

  const validated = [];
  let rejectedCount = 0;

  for (const [i, item] of parsed.validated.entries()) {
    const errors = validateArtifact('validated-evidence-item', item);
    if (errors.length) {
      warnings.push(`Dropped validated[${i}] (${item.evidenceId || 'no-id'}): ${errors.join('; ')}`);
      rejectedCount++;
      continue;
    }

    const missingRefs = (item.supportingSourceIds || []).filter((id) => !sourceIds.has(id));
    if (missingRefs.length) {
      warnings.push(
        `Dropped validated[${i}] (${item.evidenceId}): references unknown sourceId(s) ${missingRefs.join(', ')}`
      );
      rejectedCount++;
      continue;
    }

    const key = item.claim.trim().toLowerCase();
    if (seenClaims.has(key)) {
      warnings.push(`Dropped validated[${i}] (${item.evidenceId}): duplicate of an earlier validated claim.`);
      rejectedCount++;
      continue;
    }
    seenClaims.add(key);

    validated.push(item);
  }

  const rejected = [];
  for (const [i, item] of parsed.rejected.entries()) {
    const errors = validateArtifact('rejected-evidence-item', item);
    if (errors.length) {
      warnings.push(`Dropped rejected[${i}] (${item.evidenceId || 'no-id'}): ${errors.join('; ')}`);
      continue;
    }

    const key = item.claim.trim().toLowerCase();
    if (seenClaims.has(key)) {
      warnings.push(
        `Dropped rejected[${i}] (${item.evidenceId}): claim already appears in "validated" — a claim may not appear in both lists.`
      );
      continue;
    }
    seenClaims.add(key);

    rejected.push(item);
  }

  return {
    validated,
    rejected,
    rejectedCount,
    warnings,
    rawContent: providerResult.content,
  };
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Run Stage 03 end-to-end using the given provider.
 *
 * @param {object} request    — validated run-request object (must include runId)
 * @param {Array}  sources    — Stage 01's 00-sources.json
 * @param {Array}  signals    — Stage 01's 01-market-signals.json
 * @param {Array}  candidates — Stage 02's 02-candidates.json
 * @param {object} provider   — any object with generate({ systemPrompt, userMessage })
 * @returns {{ validated, rejected, meta }}
 */
export async function runStage03(request, sources, signals, candidates, provider) {
  const createdAt = new Date().toISOString();
  const stageCtx = loadStageContext();

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request, stageCtx, sources, signals, candidates, request.runId, createdAt);

  const providerResult = await provider.generate({ systemPrompt, userMessage });

  const result = parseAndValidateOutput(providerResult, sources);

  return {
    validated: result.validated,
    rejected: result.rejected,
    meta: {
      provider: providerResult.provider,
      model: providerResult.model,
      latencyMs: providerResult.latencyMs,
      startedAt: providerResult.startedAt,
      completedAt: providerResult.completedAt,
      usage: providerResult.usage,
      toolActivity: providerResult.toolActivity,
      warnings: result.warnings,
      rejectedCount: result.rejectedCount,
      rawContent: result.rawContent,
      rawProviderOutput: providerResult.rawProviderOutput,
    },
  };
}
