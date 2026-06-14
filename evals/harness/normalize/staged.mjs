/**
 * evals/harness/normalize/staged.mjs — map staged workflow output to the common
 * normalized evaluation structure.
 *
 * The staged workflow produces schema-validated JSON artifacts for each stage.
 * Normalization here is lossless: every field maps directly to the normalized
 * structure. Fields that the baseline cannot provide (quality tiers, dates,
 * structured scores, human verification items) are fully present here —
 * that structural advantage is a key reason to run a live comparison.
 */

export const NOT_AVAILABLE = 'not_available';

/**
 * Normalize staged workflow raw output into the shared evaluation structure.
 *
 * @param {object} rawOutput — what StagedWorkflowAdapter.runStagedAdapter() returns
 * @returns {object} normalized output following the evaluation schema
 */
export function normalizeStagedOutput(rawOutput) {
  const a = rawOutput.artifacts || {};

  const sources   = a['00-sources.json']         || [];
  const signals   = a['01-market-signals.json']  || [];
  const candidates = a['02-candidates.json']     || [];
  const validation = a['03-validation.json']     || { validated: [], rejected: [] };
  const scores    = a['04-scores.json']           || [];
  const briefs    = a['05-briefs.json']           || [];
  const meta      = a['metadata.json']            || {};

  return {
    adapterName: 'staged-workflow-v1',
    outputType: 'structured-artifacts',

    marketSignals: signals.map((s) => ({
      signalId: s.signalId,
      claim: s.claim,
      confidence: s.confidence,
      sourceIds: s.sourceIds || [],
      uncertainty: s.uncertainty || NOT_AVAILABLE,
    })),

    candidates: candidates.map((c) => ({
      candidateId: c.candidateId,
      name: c.name,
      organisationType: c.organisationType,
      confidence: c.confidence,
      uncertainty: c.uncertainty || NOT_AVAILABLE,
    })),

    claims: [
      ...(validation.validated || []).map((v) => ({
        claimId: v.evidenceId,
        text: v.claim,
        sourceIds: v.supportingSourceIds || [],
        validationStatus: v.validationStatus,
        confidence: v.confidence,
      })),
      ...(validation.rejected || []).map((r) => ({
        claimId: r.evidenceId,
        text: r.claim,
        sourceIds: [],
        validationStatus: 'rejected',
        rejectionReason: r.rejectionReason,
        confidence: null,
      })),
    ],

    sources: sources.map((s) => ({
      sourceId: s.sourceId,
      url: s.url || null,
      title: s.title || NOT_AVAILABLE,
      qualityTier: s.qualityTier || NOT_AVAILABLE,
      publicationDate: s.publicationDate || NOT_AVAILABLE,
      publisher: s.publisher || NOT_AVAILABLE,
    })),

    opportunityScores: scores.map((s) => ({
      candidateId: s.candidateId,
      totalScore: s.totalScore,
      dimensions: s.dimensions || {},
      rationale: s.rationale || NOT_AVAILABLE,
    })),

    recommendations: briefs.flatMap((b) =>
      b.recommendedNextAction
        ? [{ recommendationId: `brief-${b.candidateId}`, text: b.recommendedNextAction, candidateId: b.candidateId }]
        : []
    ),

    uncertainties: briefs.flatMap((b) => b.uncertainties || []),

    humanVerificationItems: briefs.flatMap((b) => b.humanVerificationRequired || []),

    stageArtifacts: {
      stagesCompleted: meta.stagesCompleted || NOT_AVAILABLE,
      reviewGates: meta.reviewGates || NOT_AVAILABLE,
      schemaVersion: meta.schemaVersion || NOT_AVAILABLE,
    },

    rawNotes: {
      runId: rawOutput.runId,
      parsingApproach: 'Direct mapping from schema-validated JSON artifacts. Lossless.',
    },
  };
}
