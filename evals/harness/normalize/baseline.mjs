/**
 * evals/harness/normalize/baseline.mjs — map baseline (prose report) output to
 * the common normalized evaluation structure.
 *
 * The baseline produces a markdown prose report. Extracting structured fields from
 * prose is inherently lossy: section headers are used as anchors, bullets are
 * parsed heuristically, and citation numbers are extracted via regex. Any field
 * that cannot be reliably extracted is set to NOT_AVAILABLE rather than guessed.
 *
 * This lossy extraction is a structural property of the baseline design — it is
 * one reason the staged workflow (which produces structured JSON) may be preferable
 * once quality is validated.
 */

export const NOT_AVAILABLE = 'not_available';

/**
 * Normalize a baseline raw output into the shared evaluation structure.
 *
 * @param {object} rawOutput — what BaselineAdapter.runBaselineAdapter() returns
 * @returns {object} normalized output following the evaluation schema
 */
export function normalizeBaselineOutput(rawOutput) {
  const reply = rawOutput.reply || '';
  const sources = rawOutput.sources || [];

  return {
    adapterName: 'baseline-v1',
    outputType: 'prose-report',
    marketSignals: extractSignals(reply),
    candidates: extractCandidates(reply),
    claims: extractClaims(reply),
    sources: normalizeSources(sources),
    opportunityScores: NOT_AVAILABLE,
    recommendations: extractRecommendations(reply),
    uncertainties: extractUncertainties(reply),
    humanVerificationItems: NOT_AVAILABLE,
    stageArtifacts: NOT_AVAILABLE,
    rawNotes: {
      inputMapping: rawOutput.inputMapping || null,
      sourceCount: sources.length,
      parsingApproach: [
        'Heuristic section-header extraction from markdown prose.',
        'Lossy: intermediate stage reasoning is not available.',
        'Structured fields (quality tiers, publication dates, confidence) are not_available.',
      ].join(' '),
    },
  };
}

function normalizeSources(sources) {
  return sources.map((s, i) => ({
    sourceId: `baseline-src-${i + 1}`,
    url: s.url || null,
    title: s.title || NOT_AVAILABLE,
    qualityTier: NOT_AVAILABLE,
    publicationDate: NOT_AVAILABLE,
    publisher: NOT_AVAILABLE,
  }));
}

function extractSignals(reply) {
  const section = extractSection(reply, ['Key Market Signals', 'Key Findings', 'Market Signals', 'Signals']);
  if (!section) return [];

  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s/.test(l))
    .map((line, i) => ({
      signalId: `baseline-sig-${i + 1}`,
      claim: line.replace(/^[-*]\s+/, '').replace(/\[\d+\]/g, '').trim(),
      confidence: NOT_AVAILABLE,
      sourceIds: extractCitationRefs(line),
      uncertainty: NOT_AVAILABLE,
    }));
}

function extractCandidates(reply) {
  const section = extractSection(reply, [
    'Competitor Landscape', 'Competitors', 'Target Organisations',
    'Organisations', 'Key Organisations',
  ]);
  if (!section) return [];

  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /\*\*/.test(l))
    .map((line, i) => {
      const nameMatch = line.match(/\*\*([^*]+)\*\*/);
      return {
        candidateId: `baseline-cand-${i + 1}`,
        name: nameMatch ? nameMatch[1].replace(/\s*\(mock\)/i, '').trim() : NOT_AVAILABLE,
        organisationType: NOT_AVAILABLE,
        confidence: NOT_AVAILABLE,
        uncertainty: NOT_AVAILABLE,
      };
    });
}

function extractClaims(reply) {
  return reply
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 25 && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('- ['))
    .map((line, i) => ({
      claimId: `baseline-claim-${i + 1}`,
      text: line,
      sourceIds: extractCitationRefs(line),
    }));
}

function extractRecommendations(reply) {
  const section = extractSection(reply, [
    'Recommended Next Actions', 'Recommended Actions',
    'Strategic Recommendations', 'Recommendations',
  ]);
  if (!section) return [];

  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l) || /^[-*]\s/.test(l))
    .map((line, i) => ({
      recommendationId: `baseline-rec-${i + 1}`,
      text: line.replace(/^\d+\.\s+/, '').replace(/^[-*]\s+/, '').trim(),
    }));
}

function extractUncertainties(reply) {
  return reply
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /confidence|uncertain|risk|caveat|unknown|mock|fictional|placeholder|not available/i.test(l) && l.length > 15)
    .filter(Boolean);
}

/** Extract a named section from a markdown report. Returns the body text only. */
function extractSection(reply, headings) {
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`##\\s+\\d*\\.?\\s*${escaped}([^]*?)(?=##\\s+\\d|$)`, 'i');
    const match = reply.match(re);
    if (match) return match[1].trim();
  }
  return null;
}

/** Extract [n] citation numbers from a line and map to source ref strings. */
function extractCitationRefs(text) {
  return (text.match(/\[(\d+)\]/g) || []).map((m) => `baseline-src-${m.replace(/\D/g, '')}`);
}
