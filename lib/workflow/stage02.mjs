/**
 * lib/workflow/stage02.mjs — Stage 02 Candidate Discovery execution.
 *
 * Owns the Stage 02 contract: builds the discovery prompt from Stage 01's
 * signals and sources, calls the provider, parses the JSON response, and
 * validates each candidate against the schema. Contains no provider-specific
 * code — works with any provider that implements
 * generate({ systemPrompt, userMessage }).
 *
 * Unlike Stage 01, this stage's input already includes upstream artifacts
 * (signals + sources), so the user message carries them as working input,
 * not just the raw request fields.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateArtifact } from './schemas.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_ROOT = join(here, '..', '..', 'workflows', 'market-opportunity');
const STAGE_DIR = join(WORKFLOW_ROOT, '02_candidate-discovery');
const REFS_DIR = join(WORKFLOW_ROOT, 'references');

// ─── context loading ──────────────────────────────────────────────────────────

/**
 * Load the stable reference files for Stage 02.
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
 * The system prompt: sets the research role.
 * Short by design — the user message carries all stage-specific context.
 */
export function buildSystemPrompt() {
  return [
    'You are a B2B market intelligence research assistant.',
    '',
    'Your job:',
    '- Identify real organisations relevant to the given market signals',
    '- Confirm each organisation actually exists and operates in the target market',
    '- Tie every candidate to specific signals and/or sources — never invent one',
    '- Only emit organisationType values that fit targetCustomerType — do not',
    '  include regulators or competitors unless targetCustomerType itself asks',
    '  for that kind of landscape mapping',
    '- When a parent group has both a customer-facing operating company and a',
    '  separate infrastructure/network-holding company, emit only the operating',
    '  company as a candidate — the holding company is not a separate lead',
    '- For every candidate, record entityContinuity: whether its concession/',
    '  affidamento is current and its expiry date if known, any pending merger,',
    '  acquisition, subentro, or transfer, and any litigation over its right to',
    '  operate — say "unknown" rather than guessing when this is not evident',
    '- Return ONLY valid JSON — no explanation, no text, no markdown fences',
    '- If nothing is discoverable, return an empty array — never pad the list',
  ].join('\n');
}

/**
 * Build the user message for Stage 02.
 * Separated into five clearly labelled layers:
 *   1. Stage contract (the CONTEXT.md instructions)
 *   2. Evidence standards (the quality rules)
 *   3. Upstream input (Stage 01's signals + sources)
 *   4. Output schema (field-by-field + example)
 *   5. This run's request
 *
 * @param {object} request   — validated run-request object
 * @param {object} stageCtx  — from loadStageContext()
 * @param {Array}  sources   — Stage 01's 00-sources.json
 * @param {Array}  signals   — Stage 01's 01-market-signals.json
 * @param {string} runId     — for stamping candidate metadata
 * @param {string} createdAt — ISO timestamp to use for candidate metadata
 */
export function buildUserMessage(request, stageCtx, sources, signals, runId, createdAt) {
  const constraintLine = request.constraints?.length
    ? `- constraints: ${request.constraints.join('; ')}`
    : '';

  const exampleCandidate = {
    candidateId: 'cand-1',
    name: 'Exact organisation name',
    organisationType: 'water-utility',
    location: { country: 'Country name', region: 'Region, if known' },
    relevanceEvidence: [
      { claim: 'Why this organisation is relevant, tied to evidence.', signalIds: ['sig-1'], sourceIds: ['src-1'] },
    ],
    confidence: 0.7,
    uncertainty: 'What is unclear, e.g. ownership or scope.',
    entityContinuity: {
      status: 'stable | contested subentro in progress | concession expiring <date> | recently merged into <entity>',
      concessionExpiry: 'ISO date if known, else null',
      pendingTransfer: 'short description of any known merger/acquisition/subentro/transfer, else null',
      litigation: 'short description of any known dispute over the right to operate, else null',
    },
    metadata: { runId, stage: 'candidate-discovery', createdAt },
  };

  return [
    '# Stage 02 — Candidate Discovery',
    '',
    '## 1. Stage Contract (your instructions)',
    stageCtx.contract,
    '',
    '## 2. Evidence Standards (quality rules)',
    stageCtx.evidenceStandards,
    '',
    '## 3. Upstream Input — Market Signals and Sources from Stage 01',
    'Use these as your starting evidence. You may also search the web to confirm',
    'an organisation exists and operates in the target market, but every',
    'candidate must still tie back to a signalId and/or sourceId below.',
    '',
    '### Sources (00-sources.json):',
    JSON.stringify(sources, null, 2),
    '',
    '### Signals (01-market-signals.json):',
    JSON.stringify(signals, null, 2),
    '',
    '## 4. Required Output Format',
    'Return ONLY this JSON object. Nothing before it. Nothing after it.',
    'Do not wrap it in markdown code blocks.',
    '',
    '```',
    '{ "candidates": [ ... ] }',
    '```',
    '',
    '### candidate-organisation fields (one object per item in "candidates"):',
    '- candidateId       — string, e.g. "cand-1", "cand-2" (unique, sequential)',
    '- name              — string, the exact organisation name',
    '- organisationType  — one of: "water-utility" | "drinking-water-company" | "multi-utility-company" | "infrastructure-operator" | "municipality" | "public-water-organisation" | "regulator" | "competitor" | "other"',
    '- location          — { "country": string (required), "region": string (optional) }',
    '- relevanceEvidence — array, minimum 1 item, each: { "claim": string, "signalIds": [sourceId strings], "sourceIds": [sourceId strings] }',
    '- confidence        — number 0.0–1.0',
    '- uncertainty       — string, what is unclear (e.g. ownership, scope)',
    '- entityContinuity  — { "status": string, "concessionExpiry": ISO date or null,',
    '                        "pendingTransfer": string or null, "litigation": string or null }',
    `- metadata          — { "runId": "${runId}", "stage": "candidate-discovery", "createdAt": "${createdAt}" }`,
    '',
    'Every signalId and sourceId you cite MUST exist in the Sources/Signals above.',
    'Do not invent organisations. No duplicates (same name + country).',
    '',
    'organisationType scope rule: check every candidate against',
    `targetCustomerType ("${request.targetCustomerType}") before including it.`,
    'If targetCustomerType describes utilities/companies to sell to, do NOT emit',
    '"regulator" or "competitor" candidates — those belong in Stage 01 signals,',
    'not here. "public-water-organisation" requires direct water-infrastructure',
    'ownership/operation/procurement authority (e.g. an Italian ATO) — a general',
    'regional/municipal government with no such remit does not qualify under any',
    'organisationType; leave it out rather than force-fitting it.',
    '',
    'parent/subsidiary entity-scope rule: if signals describe both a',
    'customer-facing operating company (runs the network, owns the',
    'leak-reduction budget/decision) and a same-group infrastructure/network-',
    'holding company (owns physical assets on the parent group\'s behalf, no',
    'independent customer-facing operations), emit only the operating company',
    'as a candidate — note the group relationship in its uncertainty field,',
    'do not create a second candidate for the holding company.',
    '',
    'entity-continuity requirement: Italian water-utility structure changes',
    'constantly — municipal systems get consolidated, gestori merge, concessions',
    'expire and get contested in court. For every candidate, state its current',
    'concession/affidamento status and expiry date if known, any pending merger,',
    'acquisition, subentro, or transfer, and any litigation over its right to',
    'operate. Where this is genuinely unknown from the available signals, say',
    '"unknown" — do not assume "stable" just because no contrary signal turned',
    'up. This does not affect the five scoring dimensions in Stage 04 — it is a',
    'separate signal for whether an otherwise-good score is actionable right now.',
    '',
    'entity-continuity recency rule: for any litigation/concession/merger/',
    'transfer claim, explicitly search for what happened AFTER the most',
    'dramatic event you find — a court ruling gets heavy coverage, but the',
    'quiet moment that actually settles the matter (a party deciding not to',
    'appeal further, a deal signed without fanfare) often does not. Do not',
    'stop at the first or most findable ruling or news event. Record the date',
    'through which you checked the status, not just the publication date of',
    'whatever source you cite.',
    '',
    '### Example (one candidate):',
    JSON.stringify({ candidates: [exampleCandidate] }, null, 2),
    '',
    '## 5. Research Request',
    `- targetMarket: ${request.targetMarket}`,
    `- targetCustomerType: ${request.targetCustomerType}`,
    `- solutionDescription: ${request.solutionDescription}`,
    `- businessObjective: ${request.businessObjective}`,
    constraintLine,
    '',
    'Identify candidate organisations now. Return the JSON now:',
  ].filter((line) => line !== null).join('\n');
}

// ─── output parsing and validation ───────────────────────────────────────────

/**
 * Parse the provider result into validated candidates.
 *
 * Validation is item-by-item: a malformed candidate is recorded as a warning
 * and dropped, but the stage only fails if the response is unparseable. A
 * candidate list of zero is an accepted, honest result (CONTEXT.md failure
 * condition: "emit an empty list and record the gap" is fine; fabricating is
 * not).
 *
 * @param {object} providerResult — from provider.generate()
 * @param {Array}  sources        — Stage 01's sources, for sourceId cross-check
 * @param {Array}  signals        — Stage 01's signals, for signalId cross-check
 * @returns {{ candidates, rejectedCount, warnings, rawContent }}
 * @throws if structuredOutput is missing or malformed
 */
export function parseAndValidateOutput(providerResult, sources, signals) {
  const warnings = [...(providerResult.warnings || [])];

  if (!providerResult.structuredOutput || typeof providerResult.structuredOutput !== 'object') {
    throw new Error(
      'Stage 02: provider returned no parseable JSON.\n' +
      `Provider warnings: ${warnings.join('; ') || 'none'}\n` +
      'Raw content is preserved in rawProviderOutput for debugging.'
    );
  }

  const parsed = providerResult.structuredOutput;

  if (!Array.isArray(parsed.candidates)) {
    throw new Error('Stage 02: JSON response missing "candidates" array.');
  }

  const sourceIds = new Set((sources || []).map((s) => s.sourceId));
  const signalIds = new Set((signals || []).map((s) => s.signalId));
  const seenNameCountry = new Set();

  const validatedCandidates = [];
  let rejectedCount = 0;

  for (const [i, cand] of parsed.candidates.entries()) {
    const errors = validateArtifact('candidate-organisation', cand);
    if (errors.length) {
      warnings.push(`Dropped candidate[${i}] (${cand.candidateId || 'no-id'}): ${errors.join('; ')}`);
      rejectedCount++;
      continue;
    }

    // Cross-check: every cited signalId/sourceId must exist upstream
    const missingRefs = [];
    for (const ev of cand.relevanceEvidence || []) {
      for (const id of ev.signalIds || []) {
        if (!signalIds.has(id)) missingRefs.push(`signalId "${id}"`);
      }
      for (const id of ev.sourceIds || []) {
        if (!sourceIds.has(id)) missingRefs.push(`sourceId "${id}"`);
      }
    }
    if (missingRefs.length) {
      warnings.push(
        `Dropped candidate[${i}] (${cand.candidateId}): references unknown ${missingRefs.join(', ')}`
      );
      rejectedCount++;
      continue;
    }

    // Duplicate check: same name + country
    const key = `${cand.name.trim().toLowerCase()}|${cand.location.country.trim().toLowerCase()}`;
    if (seenNameCountry.has(key)) {
      warnings.push(`Dropped candidate[${i}] (${cand.candidateId}): duplicate of an earlier candidate (same name + country).`);
      rejectedCount++;
      continue;
    }
    seenNameCountry.add(key);

    validatedCandidates.push(cand);
  }

  return {
    candidates: validatedCandidates,
    rejectedCount,
    warnings,
    rawContent: providerResult.content,
  };
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Run Stage 02 end-to-end using the given provider.
 *
 * @param {object} request  — validated run-request object (must include runId)
 * @param {Array}  sources  — Stage 01's 00-sources.json
 * @param {Array}  signals  — Stage 01's 01-market-signals.json
 * @param {object} provider — any object with generate({ systemPrompt, userMessage })
 * @returns {{ candidates, meta }}
 */
export async function runStage02(request, sources, signals, provider) {
  const createdAt = new Date().toISOString();
  const stageCtx = loadStageContext();

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request, stageCtx, sources, signals, request.runId, createdAt);

  const providerResult = await provider.generate({ systemPrompt, userMessage });

  const result = parseAndValidateOutput(providerResult, sources, signals);

  return {
    candidates: result.candidates,
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
