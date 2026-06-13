/**
 * lib/workflow/mockPipeline.mjs — deterministic, free sample artifacts for every
 * stage. This is the mock-mode equivalent of lib/mockReport.js: it lets the whole
 * staged workflow be exercised, inspected, and tested end-to-end without any API
 * call. The content is FICTION — clearly water-sector themed and marked as mock —
 * and exists to validate the structure, schemas, storage, and review gates.
 *
 * Each builder stamps the standard metadata block (runId, stage, createdAt) so the
 * orchestrator only has to validate and persist. Nothing here is random, so tests
 * are stable.
 */

const MOCK = '(mock)';

export function buildSources(ctx) {
  const { createdAt } = ctx;
  return [
    {
      sourceId: 'src-1',
      url: 'https://example.gov/water-regulation',
      title: `Drinking-water network regulation overview ${MOCK}`,
      publisher: 'Example Regulator',
      publicationDate: '2025-11-01',
      retrievedAt: createdAt,
      sourceType: 'regulation',
      qualityTier: 'A',
    },
    {
      sourceId: 'src-2',
      url: 'https://example.org/infrastructure-funding',
      title: `Public funding programme for water-loss reduction ${MOCK}`,
      publisher: 'Example Infrastructure Fund',
      publicationDate: '2026-01-15',
      retrievedAt: createdAt,
      sourceType: 'funding',
      qualityTier: 'A',
    },
    {
      sourceId: 'src-3',
      url: 'https://example.com/utility-digitalisation',
      title: `Utility digitalisation trend report ${MOCK}`,
      publisher: 'Example Trade Press',
      publicationDate: '2025-09-20',
      retrievedAt: createdAt,
      sourceType: 'report',
      qualityTier: 'B',
    },
  ];
}

export function buildSignals(ctx) {
  const meta = metaFor(ctx, 'market-signals');
  const region = ctx.request.targetMarket;
  return [
    {
      signalId: 'sig-1',
      claim: `${region} tightened non-revenue-water reporting rules for utilities ${MOCK}.`,
      signalType: 'regulation',
      relevance: 'high',
      confidence: 0.8,
      uncertainty: 'Exact enforcement date not confirmed.',
      sourceIds: ['src-1'],
      metadata: meta,
    },
    {
      signalId: 'sig-2',
      claim: `A public fund opened grants for water-loss reduction technology in ${region} ${MOCK}.`,
      signalType: 'funding',
      relevance: 'high',
      confidence: 0.75,
      uncertainty: 'Grant ceiling and eligibility window unclear.',
      sourceIds: ['src-2'],
      metadata: meta,
    },
    {
      signalId: 'sig-3',
      claim: `Mid-size utilities in ${region} are piloting network-monitoring digitalisation ${MOCK}.`,
      signalType: 'digitalisation',
      relevance: 'medium',
      confidence: 0.6,
      uncertainty: 'Based on a single trade report; adoption scale unverified.',
      sourceIds: ['src-3'],
      metadata: meta,
    },
  ];
}

export function buildCandidates(ctx) {
  const meta = metaFor(ctx, 'candidate-discovery');
  const country = ctx.request.targetMarket;
  return [
    {
      candidateId: 'cand-1',
      name: `${country} Regional Water Utility A ${MOCK}`,
      organisationType: 'water-utility',
      location: { country, region: 'North' },
      relevanceEvidence: [
        { claim: 'Operates a large distribution network subject to the new reporting rules.', signalIds: ['sig-1'], sourceIds: ['src-1'] },
        { claim: 'Named as a digitalisation pilot participant.', signalIds: ['sig-3'], sourceIds: ['src-3'] },
      ],
      confidence: 0.7,
      uncertainty: 'Decision-maker and budget cycle unknown.',
      metadata: meta,
    },
    {
      candidateId: 'cand-2',
      name: `${country} Municipal Water Operator B ${MOCK}`,
      organisationType: 'municipality',
      location: { country, region: 'Central' },
      relevanceEvidence: [
        { claim: 'Eligible for the water-loss reduction grant programme.', signalIds: ['sig-2'], sourceIds: ['src-2'] },
      ],
      confidence: 0.55,
      uncertainty: 'Public-sector procurement timeline not established.',
      metadata: meta,
    },
  ];
}

export function buildValidation(ctx) {
  const meta = metaFor(ctx, 'evidence-validation');
  const validated = [
    {
      evidenceId: 'ev-1',
      claim: `${ctx.request.targetMarket} tightened non-revenue-water reporting rules for utilities ${MOCK}.`,
      validationStatus: 'validated',
      supportingSourceIds: ['src-1'],
      recencyOk: true,
      confidence: 0.8,
      metadata: meta,
    },
    {
      evidenceId: 'ev-2',
      claim: `A public fund opened grants for water-loss reduction technology ${MOCK}.`,
      validationStatus: 'validated',
      supportingSourceIds: ['src-2'],
      recencyOk: true,
      confidence: 0.75,
      metadata: meta,
    },
  ];
  const rejected = [
    {
      evidenceId: 'ev-3',
      claim: `Utilities are "rapidly" replacing all infrastructure ${MOCK}.`,
      rejectionReason: 'weak-evidence',
      notes: 'Only a promotional (Tier-C) source; overstated claim.',
      metadata: meta,
    },
  ];
  return { validated, rejected };
}

export function buildScores(ctx) {
  const meta = metaFor(ctx, 'opportunity-scoring');
  return [
    scoreFor('cand-1', meta, {
      problemUrgency: [4, 'New reporting rules create near-term pressure (ev-1).'],
      solutionFit: [4, 'Network monitoring directly addresses non-revenue water.'],
      commercialTiming: [4, 'Grant funding window is open (ev-2).'],
      evidenceStrength: [4, 'Two Tier-A validated sources (ev-1, ev-2).'],
      marketAccessibility: [3, 'Public utility; contacts likely findable but procurement formal.'],
      strategicRelevance: [4, 'Matches the stated objective of a utility shortlist.'],
    }),
    scoreFor('cand-2', meta, {
      problemUrgency: [3, 'Grant eligibility implies a problem but less direct evidence.'],
      solutionFit: [3, 'Plausible fit; municipal scope adds complexity.'],
      commercialTiming: [3, 'Same funding window (ev-2).'],
      evidenceStrength: [2, 'One validated source; rest inference.'],
      marketAccessibility: [2, 'Municipal procurement is slower and more formal.'],
      strategicRelevance: [3, 'Fits objective but lower confidence.'],
    }),
  ];
}

export function buildBriefs(ctx) {
  const meta = metaFor(ctx, 'opportunity-brief');
  return [
    {
      candidateId: 'cand-1',
      title: `${ctx.request.targetMarket} Regional Water Utility A — priority opportunity ${MOCK}`,
      whyItMatters:
        'A new reporting rule plus an open funding window create a time-bound reason for this utility to invest in network monitoring.',
      supportingEvidenceIds: ['ev-1', 'ev-2'],
      factVsInterpretation: {
        verifiedFacts: [
          'Reporting rules for non-revenue water were tightened (ev-1).',
          'A public grant for water-loss technology is open (ev-2).',
        ],
        modelInterpretations: [
          'The combination likely raises this utility\'s urgency to act this budget cycle.',
        ],
      },
      uncertainties: ['Decision-maker unknown', 'Budget cycle timing unconfirmed'],
      recommendedNextAction:
        'Research this utility\'s procurement calendar and identify named technical decision-makers, then prepare a positioning angle for human review.',
      humanVerificationRequired: [
        'Confirm the utility is actually in scope geographically.',
        'Confirm the grant applies to this organisation type.',
      ],
      metadata: meta,
    },
  ];
}

/** Build every artifact for a run in dependency order. */
export function buildMockArtifacts(ctx) {
  return {
    sources: buildSources(ctx),
    signals: buildSignals(ctx),
    candidates: buildCandidates(ctx),
    validation: buildValidation(ctx),
    scores: buildScores(ctx),
    briefs: buildBriefs(ctx),
  };
}

function metaFor(ctx, stage) {
  return { runId: ctx.runId, stage, createdAt: ctx.createdAt };
}

function scoreFor(candidateId, metadata, dims) {
  const dimensions = {};
  let total = 0;
  for (const [key, [score, justification]] of Object.entries(dims)) {
    dimensions[key] = { score, justification };
    total += score;
  }
  return {
    candidateId,
    dimensions,
    totalScore: total,
    rationale: `Preliminary ${MOCK} ranking from validated evidence; confirm at Review Gate 2.`,
    metadata,
  };
}
