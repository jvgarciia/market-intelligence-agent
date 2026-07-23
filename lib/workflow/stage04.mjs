/**
 * lib/workflow/stage04.mjs — Stage 04 Opportunity Scoring execution.
 *
 * Owns the Stage 04 contract: scores each Stage 02 candidate on the five ICP
 * dimensions in scoring-rubric.md, using only Stage 03's VALIDATED evidence —
 * rejected evidence must never influence a score. This is a reasoning stage,
 * not a research stage: no new sources, no tools.
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
const STAGE_DIR = join(WORKFLOW_ROOT, '04_opportunity-scoring');
const REFS_DIR = join(WORKFLOW_ROOT, 'references');

const DIMENSIONS = ['utilitySize', 'nrwEvidence', 'regionFit', 'targetRolePresence', 'momentumSignal'];

// ─── context loading ──────────────────────────────────────────────────────────

/**
 * Load the stable reference files for Stage 04.
 * Only these two files are loaded; nothing from other stages or the full repo.
 */
export function loadStageContext() {
  return {
    contract: readFileSync(join(STAGE_DIR, 'CONTEXT.md'), 'utf8'),
    scoringRubric: readFileSync(join(REFS_DIR, 'scoring-rubric.md'), 'utf8'),
  };
}

// ─── prompt construction ──────────────────────────────────────────────────────

/**
 * The system prompt: sets the scoring role.
 * Short by design — the user message carries all stage-specific context.
 */
export function buildSystemPrompt() {
  return [
    'You are a B2B market opportunity scorer.',
    '',
    'Your job:',
    '- Score every candidate on all five rubric dimensions — never skip one',
    '- Score only against VALIDATED evidence — rejected evidence must not',
    '  influence any score',
    '- Every dimension needs a one-line justification referencing an evidenceId,',
    '  or it must say "inference — no validated evidence" and be capped at 2',
    '- Do not invent precision — if you cannot tell, score low and say why',
    '- Return ONLY valid JSON — no explanation, no text, no markdown fences',
  ].join('\n');
}

/**
 * Build the user message for Stage 04.
 * Separated into five clearly labelled layers:
 *   1. Stage contract (the CONTEXT.md instructions)
 *   2. Scoring rubric (the five dimensions + 0-5 scale this stage applies)
 *   3. Upstream input (Stage 02's candidates + Stage 03's validated evidence only)
 *   4. Output schema (field-by-field + example)
 *   5. This run's request
 *
 * @param {object} request    — validated run-request object
 * @param {object} stageCtx   — from loadStageContext()
 * @param {Array}  candidates — Stage 02's 02-candidates.json
 * @param {Array}  validated  — Stage 03's validated evidence items only
 * @param {string} runId      — for stamping score metadata
 * @param {string} createdAt  — ISO timestamp to use for score metadata
 */
export function buildUserMessage(request, stageCtx, candidates, validated, runId, createdAt) {
  const constraintLine = request.constraints?.length
    ? `- constraints: ${request.constraints.join('; ')}`
    : '';

  const exampleScore = {
    candidateId: 'cand-1',
    dimensions: {
      utilitySize: { score: 3, justification: 'Population served ~200k per ev-1.' },
      nrwEvidence: { score: 4, justification: 'Named NRW reduction programme per ev-2.' },
      regionFit: { score: 5, justification: 'Confirmed Italian operator per ev-1.' },
      targetRolePresence: { score: 2, justification: 'inference — no validated evidence' },
      momentumSignal: { score: 0, justification: 'inference — no validated evidence' },
    },
    totalScore: 14,
    rationale: 'Strong regional and size fit with confirmed NRW activity; role and momentum unconfirmed.',
    metadata: { runId, stage: 'opportunity-scoring', createdAt },
  };

  return [
    '# Stage 04 — Opportunity Scoring',
    '',
    '## 1. Stage Contract (your instructions)',
    stageCtx.contract,
    '',
    '## 2. Scoring Rubric (the rules you apply)',
    stageCtx.scoringRubric,
    '',
    '## 3. Upstream Input — score every candidate below',
    'Score every candidate using only the validated evidence below. Rejected',
    'evidence is intentionally excluded — do not use knowledge outside this input.',
    '',
    '### Candidates (02-candidates.json):',
    JSON.stringify(candidates, null, 2),
    '',
    '### Validated evidence (03-validation.json → validated only):',
    JSON.stringify(validated, null, 2),
    '',
    '## 4. Required Output Format',
    'Return ONLY this JSON object. Nothing before it. Nothing after it.',
    'Do not wrap it in markdown code blocks.',
    '',
    '```',
    '{ "scores": [ ... ] }',
    '```',
    '',
    '### opportunity-score fields (one object per candidate in "scores"):',
    '- candidateId  — string, must match a candidateId from Candidates above',
    '- dimensions   — object with all five keys: utilitySize, nrwEvidence, regionFit,',
    '                 targetRolePresence, momentumSignal',
    '                 each is { "score": integer 0-5, "justification": string }',
    '- totalScore   — integer, the sum of the five dimension scores (0-25)',
    '- rationale    — string, a short overall read',
    `- metadata     — { "runId": "${runId}", "stage": "opportunity-scoring", "createdAt": "${createdAt}" }`,
    '',
    'Every candidate in Candidates above must get exactly one score object.',
    '',
    '### Example (one candidate scored):',
    JSON.stringify({ scores: [exampleScore] }, null, 2),
    '',
    '## 5. Research Request',
    `- targetMarket: ${request.targetMarket}`,
    `- targetCustomerType: ${request.targetCustomerType}`,
    `- solutionDescription: ${request.solutionDescription}`,
    `- businessObjective: ${request.businessObjective}`,
    constraintLine,
    '',
    'Score the candidates now. Return the JSON now:',
  ].filter((line) => line !== null).join('\n');
}

// ─── output parsing and validation ───────────────────────────────────────────

/**
 * Parse the provider result into a list of opportunity scores.
 *
 * Validation is item-by-item: a malformed item is recorded as a warning and
 * dropped, but the stage only fails if the response is unparseable.
 * `totalScore` is recomputed from the five dimensions and corrected if the
 * model's number does not match — the orchestrator is the source of truth for
 * the sum, not the model's arithmetic.
 *
 * @param {object} providerResult — from provider.generate()
 * @param {Array}  candidates     — Stage 02's candidates, for candidateId cross-check
 * @returns {{ scores, droppedCount, warnings, rawContent }}
 * @throws if structuredOutput is missing or malformed
 */
export function parseAndValidateOutput(providerResult, candidates) {
  const warnings = [...(providerResult.warnings || [])];

  if (!providerResult.structuredOutput || typeof providerResult.structuredOutput !== 'object') {
    throw new Error(
      'Stage 04: provider returned no parseable JSON.\n' +
      `Provider warnings: ${warnings.join('; ') || 'none'}\n` +
      'Raw content is preserved in rawProviderOutput for debugging.'
    );
  }

  const parsed = providerResult.structuredOutput;

  if (!Array.isArray(parsed.scores)) {
    throw new Error('Stage 04: JSON response missing "scores" array.');
  }

  const candidateIds = new Set((candidates || []).map((c) => c.candidateId));
  const seenCandidateIds = new Set();

  const scores = [];
  let droppedCount = 0;

  for (const [i, item] of parsed.scores.entries()) {
    if (item && item.dimensions) {
      const recomputed = DIMENSIONS.reduce((sum, dim) => {
        const s = item.dimensions[dim]?.score;
        return sum + (typeof s === 'number' ? s : 0);
      }, 0);
      if (item.totalScore !== recomputed) {
        warnings.push(
          `Corrected totalScore for scores[${i}] (${item.candidateId || 'no-id'}): ` +
          `model said ${item.totalScore}, recomputed ${recomputed}.`
        );
        item.totalScore = recomputed;
      }
    }

    const errors = validateArtifact('opportunity-score', item);
    if (errors.length) {
      warnings.push(`Dropped scores[${i}] (${item?.candidateId || 'no-id'}): ${errors.join('; ')}`);
      droppedCount++;
      continue;
    }

    if (!candidateIds.has(item.candidateId)) {
      warnings.push(`Dropped scores[${i}] (${item.candidateId}): candidateId not found in Stage 02 candidates.`);
      droppedCount++;
      continue;
    }

    if (seenCandidateIds.has(item.candidateId)) {
      warnings.push(`Dropped scores[${i}] (${item.candidateId}): duplicate score for a candidate already scored.`);
      droppedCount++;
      continue;
    }
    seenCandidateIds.add(item.candidateId);

    scores.push(item);
  }

  return {
    scores,
    droppedCount,
    warnings,
    rawContent: providerResult.content,
  };
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Run Stage 04 end-to-end using the given provider.
 *
 * @param {object} request    — validated run-request object (must include runId)
 * @param {Array}  candidates — Stage 02's 02-candidates.json
 * @param {Array}  validated  — Stage 03's validated evidence items only
 * @param {object} provider   — any object with generate({ systemPrompt, userMessage })
 * @returns {{ scores, meta }}
 */
export async function runStage04(request, candidates, validated, provider) {
  const createdAt = new Date().toISOString();
  const stageCtx = loadStageContext();

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request, stageCtx, candidates, validated, request.runId, createdAt);

  const providerResult = await provider.generate({ systemPrompt, userMessage });

  const result = parseAndValidateOutput(providerResult, candidates);

  return {
    scores: result.scores,
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
