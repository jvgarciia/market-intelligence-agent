/**
 * lib/workflow/runWorkflow.mjs — the Market Opportunity orchestrator.
 *
 * Responsibilities (normal application code, not ICM context): build the run
 * request, run each stage in order, validate every artifact against its schema,
 * run a few cross-artifact integrity checks the stage CONTEXT files require, and
 * persist everything through the run store. The stages' *content* comes from
 * mockPipeline in mock mode.
 *
 * Cost safety: only mock mode is wired. cheap/full throw a clear error rather
 * than silently spending — mirroring the app's no-silent-fallback rule.
 */

import { createRunStore, newRunId } from './runStore.mjs';
import { assertArtifact } from './schemas.mjs';
import { buildMockArtifacts } from './mockPipeline.mjs';

const SCHEMA_VERSION = '1.0.0';
const STAGES = ['market-signals', 'candidate-discovery', 'evidence-validation', 'opportunity-scoring', 'opportunity-brief'];

export function runWorkflow(input, options = {}) {
  const mode = options.mode || 'mock';
  if (mode !== 'mock') {
    throw new Error(
      `Stage execution is only implemented for mock mode. Mode "${mode}" is not wired yet, ` +
      `so nothing was run and no API credit was spent. Live cheap/full stages will be added ` +
      `after the baseline is evaluated (see evals/README.md).`
    );
  }

  const createdAt = options.now || new Date().toISOString();
  const runId = input.runId || newRunId();
  const request = assertArtifact('run-request', {
    runId,
    targetMarket: input.targetMarket,
    targetCustomerType: input.targetCustomerType,
    solutionDescription: input.solutionDescription,
    businessObjective: input.businessObjective,
    constraints: input.constraints || [],
    mode,
    createdAt,
  });

  const ctx = { request, runId, createdAt };
  const artifacts = buildMockArtifacts(ctx);

  validateAll(artifacts);
  checkIntegrity(artifacts);

  const store = createRunStore(runId, options.baseDir);
  const files = [];
  files.push(store.writeJson('request.json', request));
  files.push(store.writeJson('00-sources.json', artifacts.sources));
  files.push(store.writeJson('01-market-signals.json', artifacts.signals));
  files.push(store.writeJson('02-candidates.json', artifacts.candidates));
  files.push(store.writeJson('03-validation.json', artifacts.validation));
  files.push(store.writeJson('04-scores.json', artifacts.scores));
  files.push(store.writeJson('05-briefs.json', artifacts.briefs));
  files.push(store.writeText('05-brief.md', renderBriefs(artifacts.briefs, request)));

  const metadata = assertArtifact('run-metadata', {
    runId,
    workflow: 'market-opportunity',
    mode,
    createdAt,
    completedAt: options.now || new Date().toISOString(),
    stagesCompleted: STAGES,
    schemaVersion: SCHEMA_VERSION,
    reviewGates: { gate1: 'pending', gate2: 'pending' },
  });
  files.push(store.writeJson('metadata.json', metadata));

  return { runId, dir: store.dir, files: files.map((f) => f.replace(store.dir + '/', '')) };
}

function validateAll(a) {
  a.sources.forEach((s) => assertArtifact('source-record', s));
  a.signals.forEach((s) => assertArtifact('market-signal', s));
  a.candidates.forEach((c) => assertArtifact('candidate-organisation', c));
  a.validation.validated.forEach((v) => assertArtifact('validated-evidence-item', v));
  a.validation.rejected.forEach((r) => assertArtifact('rejected-evidence-item', r));
  a.scores.forEach((s) => assertArtifact('opportunity-score', s));
  a.briefs.forEach((b) => assertArtifact('opportunity-brief', b));
}

/** Cross-artifact checks the stage CONTEXT files require (beyond single-schema shape). */
function checkIntegrity(a) {
  const sourceIds = new Set(a.sources.map((s) => s.sourceId));
  const signalIds = new Set(a.signals.map((s) => s.signalId));
  const candidateIds = new Set(a.candidates.map((c) => c.candidateId));
  const validatedIds = new Set(a.validation.validated.map((v) => v.evidenceId));

  for (const sig of a.signals) {
    for (const id of sig.sourceIds) {
      if (!sourceIds.has(id)) throw new Error(`Stage 01: signal ${sig.signalId} cites missing source ${id}`);
    }
  }
  for (const c of a.candidates) {
    for (const ev of c.relevanceEvidence) {
      for (const id of ev.signalIds || []) {
        if (!signalIds.has(id)) throw new Error(`Stage 02: candidate ${c.candidateId} cites missing signal ${id}`);
      }
      for (const id of ev.sourceIds || []) {
        if (!sourceIds.has(id)) throw new Error(`Stage 02: candidate ${c.candidateId} cites missing source ${id}`);
      }
    }
  }
  const overlap = a.validation.validated.filter((v) => a.validation.rejected.some((r) => r.evidenceId === v.evidenceId));
  if (overlap.length) throw new Error(`Stage 03: evidence appears in both validated and rejected: ${overlap.map((v) => v.evidenceId).join(', ')}`);

  for (const s of a.scores) {
    if (!candidateIds.has(s.candidateId)) throw new Error(`Stage 04: score references missing candidate ${s.candidateId}`);
    const sum = Object.values(s.dimensions).reduce((acc, d) => acc + d.score, 0);
    if (sum !== s.totalScore) throw new Error(`Stage 04: ${s.candidateId} totalScore ${s.totalScore} != sum ${sum}`);
  }
  for (const b of a.briefs) {
    for (const id of b.supportingEvidenceIds) {
      if (!validatedIds.has(id)) throw new Error(`Stage 05: brief cites non-validated evidence ${id}`);
    }
    if (/\b(email|e-mail|linkedin|contact|reach out|outreach|send)\b/i.test(b.recommendedNextAction)) {
      throw new Error(`Stage 05: recommendedNextAction must not contain an outreach instruction (brief ${b.candidateId})`);
    }
  }
}

function renderBriefs(briefs, request) {
  const lines = [
    `# Opportunity Briefs — ${request.targetMarket} / ${request.targetCustomerType}`,
    '',
    `Run: ${request.runId} · Mode: ${request.mode} · Generated: ${request.createdAt}`,
    '',
    '> Review Gate 2: confirm the fact/interpretation split and the verification items below before treating any brief as final. No outreach is implied by these recommendations.',
    '',
  ];
  for (const b of briefs) {
    lines.push(
      `## ${b.title}`,
      '',
      `**Why it matters:** ${b.whyItMatters}`,
      '',
      '**Verified facts:**',
      ...b.factVsInterpretation.verifiedFacts.map((f) => `- ${f}`),
      '',
      '**Model interpretations (not fact):**',
      ...b.factVsInterpretation.modelInterpretations.map((f) => `- ${f}`),
      '',
      '**Uncertainties:**',
      ...b.uncertainties.map((u) => `- ${u}`),
      '',
      `**Recommended next action:** ${b.recommendedNextAction}`,
      '',
      '**Requires human verification:**',
      ...b.humanVerificationRequired.map((h) => `- ${h}`),
      '',
      `_Supporting evidence: ${b.supportingEvidenceIds.join(', ')}_`,
      '',
    );
  }
  return lines.join('\n');
}
