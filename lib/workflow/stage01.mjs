/**
 * lib/workflow/stage01.mjs — Stage 01 Market Signals execution.
 *
 * Owns the Stage 01 contract: builds the research prompt, calls the provider,
 * parses the JSON response, and validates each artifact against the schemas.
 * Contains no provider-specific code. The provider is passed in by the
 * orchestrator, so this module works with any provider that implements
 * generate({ systemPrompt, userMessage }).
 *
 * The context hierarchy (kept separate per the ICM principle):
 *   structuralInstructions → systemPrompt (the research role)
 *   stableReferences       → userMessage: CONTEXT.md + evidence-standards.md + schemas
 *   workingInput           → userMessage: the run request fields
 *   outputSchema           → userMessage: field-by-field description + example
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertArtifact, validateArtifact } from './schemas.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_ROOT = join(here, '..', '..', 'workflows', 'market-opportunity');
const STAGE_DIR = join(WORKFLOW_ROOT, '01_market-signals');
const REFS_DIR = join(WORKFLOW_ROOT, 'references');

// ─── context loading ──────────────────────────────────────────────────────────

/**
 * Load the stable reference files for Stage 01.
 * These are the same across all runs — they are the contract and the rules.
 * Only these three files are loaded; nothing from other stages or the full repo.
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
    '- Search the web for real, current market information',
    '- Record every source you use with its exact URL',
    '- Express findings as discrete, sourced claims',
    '- Specifically search for organisation-scale figures (population served,',
    '  network length, connection/customer counts) for named organisations —',
    '  later scoring depends on these and they are easy to miss',
    '- Return ONLY valid JSON — no explanation, no text, no markdown fences',
    '- If search finds nothing useful, return empty arrays — never fabricate',
  ].join('\n');
}

/**
 * Build the user message for Stage 01.
 * Separated into four clearly labelled layers:
 *   1. Stage contract (the CONTEXT.md instructions)
 *   2. Evidence standards (the quality rules)
 *   3. Output schema (field-by-field + example)
 *   4. This run's request
 *
 * @param {object} request   — validated run-request object
 * @param {object} stageCtx  — from loadStageContext()
 * @param {string} runId     — for stamping signal metadata
 * @param {string} retrievedAt — ISO timestamp to use for all source.retrievedAt
 */
export function buildUserMessage(request, stageCtx, runId, retrievedAt) {
  const constraintLine = request.constraints?.length
    ? `- constraints: ${request.constraints.join('; ')}`
    : '';

  const exampleSource = {
    sourceId: 'src-1',
    url: 'https://real-url-from-your-search.example.gov/document',
    title: 'Exact page or document title',
    publisher: 'Organisation that published this',
    publicationDate: '2024-09-01',
    retrievedAt,
    sourceType: 'regulation',
    qualityTier: 'A',
  };

  const exampleSignal = {
    signalId: 'sig-1',
    claim: 'One factual statement backed by the source above.',
    signalType: 'regulation',
    relevance: 'high',
    confidence: 0.9,
    uncertainty: 'What is unclear or unverified about this claim.',
    sourceIds: ['src-1'],
    metadata: { runId, stage: 'market-signals', createdAt: retrievedAt },
  };

  return [
    '# Stage 01 — Market Signals Research',
    '',
    '## 1. Stage Contract (your instructions)',
    stageCtx.contract,
    '',
    '## 2. Evidence Standards (quality rules)',
    stageCtx.evidenceStandards,
    '',
    '## 3. Required Output Format',
    'Return ONLY this JSON object. Nothing before it. Nothing after it.',
    'Do not wrap it in markdown code blocks.',
    '',
    '```',
    '{ "sources": [ ... ], "signals": [ ... ] }',
    '```',
    '',
    '### source-record fields (one object per item in "sources"):',
    '- sourceId       — string, e.g. "src-1", "src-2" (unique, sequential)',
    '- url            — string, the EXACT URL returned by your search (never invent)',
    '- title          — string, the page or document title',
    '- publisher      — string, the organisation that published it',
    '- publicationDate — string ISO date "YYYY-MM-DD", or null if unknown',
    `- retrievedAt    — always use this value: "${retrievedAt}"`,
    '- sourceType     — one of: "regulation" | "funding" | "tender" | "news" | "company-website" | "report" | "dataset" | "other"',
    '- qualityTier    — "A" = official regulator/government/filing; "B" = established trade press/analyst; "C" = vendor/promotional/undated',
    '',
    '### market-signal fields (one object per item in "signals"):',
    '- signalId       — string, e.g. "sig-1" (unique, sequential)',
    '- claim          — string, ONE factual statement (not a bundle)',
    '- signalType     — one of: "regulation" | "funding" | "infrastructure-investment" | "market-problem" | "digitalisation" | "tender" | "technology-adoption" | "competitor-development" | "organisation-scale"',
    '- relevance      — "high" | "medium" | "low"',
    '- confidence     — number 0.0–1.0',
    '- uncertainty    — string, what is unverified or ambiguous',
    '- sourceIds      — array of sourceId strings (must reference ids in "sources"; minimum 1)',
    `- metadata       — { "runId": "${runId}", "stage": "market-signals", "createdAt": "${retrievedAt}" }`,
    '',
    '### Example (one source, one signal):',
    JSON.stringify({ sources: [exampleSource], signals: [exampleSignal] }, null, 2),
    '',
    '## 4. Research Request',
    `- targetMarket: ${request.targetMarket}`,
    `- targetCustomerType: ${request.targetCustomerType}`,
    `- solutionDescription: ${request.solutionDescription}`,
    `- businessObjective: ${request.businessObjective}`,
    constraintLine,
    '',
    'Search the web. Produce as many signals as you find credible evidence for.',
    'Return the JSON now:',
  ].filter((line) => line !== null).join('\n');
}

// ─── output parsing and validation ───────────────────────────────────────────

/**
 * Parse the provider result into validated sources and signals.
 *
 * Validation is item-by-item: a malformed signal is recorded as a warning and
 * dropped, but the stage only fails if ALL signals are invalid (or none were
 * returned). This matches the CONTEXT.md failure condition: "emit zero signals
 * and record the gap" is acceptable; "fabricate signals" is not.
 *
 * @param {object} providerResult — from provider.generate()
 * @param {string} runId
 * @returns {{ sources, signals, rejectedCount, warnings, rawContent }}
 * @throws if structuredOutput is missing or all signals are invalid
 */
export function parseAndValidateOutput(providerResult, runId) {
  const warnings = [...(providerResult.warnings || [])];

  if (!providerResult.structuredOutput || typeof providerResult.structuredOutput !== 'object') {
    throw new Error(
      'Stage 01: provider returned no parseable JSON.\n' +
      `Provider warnings: ${warnings.join('; ') || 'none'}\n` +
      'Raw content is preserved in rawProviderOutput for debugging.'
    );
  }

  const parsed = providerResult.structuredOutput;

  if (!Array.isArray(parsed.sources)) {
    throw new Error('Stage 01: JSON response missing "sources" array.');
  }
  if (!Array.isArray(parsed.signals)) {
    throw new Error('Stage 01: JSON response missing "signals" array.');
  }

  // Validate sources
  const validatedSources = [];
  for (const [i, src] of parsed.sources.entries()) {
    const errors = validateArtifact('source-record', src);
    if (errors.length) {
      warnings.push(`Dropped source[${i}] (${src.sourceId || 'no-id'}): ${errors.join('; ')}`);
    } else {
      validatedSources.push(src);
    }
  }

  const sourceIds = new Set(validatedSources.map((s) => s.sourceId));

  // Validate signals (and cross-check sourceIds)
  const validatedSignals = [];
  let rejectedCount = 0;
  for (const [i, sig] of parsed.signals.entries()) {
    const errors = validateArtifact('market-signal', sig);
    if (errors.length) {
      warnings.push(`Dropped signal[${i}] (${sig.signalId || 'no-id'}): ${errors.join('; ')}`);
      rejectedCount++;
      continue;
    }
    // Cross-check: all sourceIds in the signal must be in validated sources
    const missingRefs = (sig.sourceIds || []).filter((id) => !sourceIds.has(id));
    if (missingRefs.length) {
      warnings.push(
        `Dropped signal[${i}] (${sig.signalId}): references unknown sourceIds: ${missingRefs.join(', ')}`
      );
      rejectedCount++;
      continue;
    }
    validatedSignals.push(sig);
  }

  if (validatedSignals.length === 0 && parsed.signals.length > 0) {
    // All signals were invalid — fail clearly rather than quietly
    throw new Error(
      `Stage 01: all ${parsed.signals.length} signal(s) failed validation.\n` +
      'Warnings:\n' +
      warnings.map((w) => `  - ${w}`).join('\n') +
      '\nRaw content is preserved in 01-raw-output.json.'
    );
  }

  return {
    sources: validatedSources,
    signals: validatedSignals,
    rejectedCount,
    warnings,
    rawContent: providerResult.content,
  };
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Run Stage 01 end-to-end using the given provider.
 *
 * @param {object} request  — validated run-request object (must include runId)
 * @param {object} provider — any object with generate({ systemPrompt, userMessage })
 * @returns {{ sources, signals, meta }}
 */
export async function runStage01(request, provider) {
  const retrievedAt = new Date().toISOString();
  const stageCtx = loadStageContext();

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request, stageCtx, request.runId, retrievedAt);

  const providerResult = await provider.generate({ systemPrompt, userMessage });

  const result = parseAndValidateOutput(providerResult, request.runId);

  return {
    sources: result.sources,
    signals: result.signals,
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
