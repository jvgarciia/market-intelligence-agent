/**
 * evals/harness/checks/deterministic.mjs — automated checks on normalized output.
 *
 * These checks do not require AI judgment. They test structural properties that
 * any valid output must satisfy regardless of content quality.
 *
 * Severity levels:
 *   error   — a correctness violation (invalid URL, out-of-range score, outreach language)
 *   warning — a quality concern worth flagging (missing date, duplicate, no justification)
 *   info    — an observation that needs human judgment to interpret
 *
 * Every check returns an array of issue objects. An empty array means that check passed.
 * The full result is the union of all issue arrays — runDeterministicChecks() combines them.
 */

const OUTREACH_PATTERN = /\b(email|e-mail|linkedin|contact|reach out|outreach|send a message|cold)\b/i;
const SCORE_MIN = 1;
const SCORE_MAX = 5;

/**
 * Run all deterministic checks on a single normalized output.
 *
 * @param {object} normalized — output from the normalization layer
 * @returns {Array<object>} issues — each with { code, severity, message, ...context }
 */
export function runDeterministicChecks(normalized) {
  return [
    ...checkRequiredFields(normalized),
    ...checkSources(normalized.sources || []),
    ...checkCandidates(normalized.candidates || []),
    ...checkOpportunityScores(normalized.opportunityScores),
    ...checkRecommendations(normalized.recommendations || []),
    ...checkSignals(normalized.marketSignals || []),
    ...checkMockLabeling(normalized),
  ];
}

/** Count issues by severity. */
export function summarizeIssues(issues) {
  const errors   = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos    = issues.filter((i) => i.severity === 'info').length;
  return { total: issues.length, errors, warnings, infos };
}

// ─── individual check functions ─────────────────────────────────────────────

function checkRequiredFields(normalized) {
  const issues = [];
  for (const field of ['sources', 'recommendations', 'marketSignals', 'candidates', 'adapterName', 'outputType']) {
    if (!(field in normalized)) {
      issues.push({
        code: 'MISSING_FIELD',
        severity: 'error',
        field,
        message: `Required field "${field}" is absent from normalized output.`,
      });
    }
  }
  return issues;
}

function checkSources(sources) {
  const issues = [];
  const seenUrls = new Set();

  for (const [i, src] of sources.entries()) {
    const ref = src.sourceId || `index-${i}`;

    if (!src.url) {
      issues.push({ code: 'MISSING_URL', severity: 'error', ref, message: `Source ${ref} has no URL.` });
    } else {
      try {
        new URL(src.url);
      } catch {
        issues.push({ code: 'INVALID_URL', severity: 'error', ref, url: src.url, message: `Source ${ref} has an invalid URL: ${src.url}` });
      }

      if (seenUrls.has(src.url)) {
        issues.push({ code: 'DUPLICATE_URL', severity: 'warning', url: src.url, message: `Duplicate source URL: ${src.url}` });
      }
      seenUrls.add(src.url);
    }

    if (!src.publicationDate || src.publicationDate === 'not_available') {
      issues.push({ code: 'MISSING_PUBLICATION_DATE', severity: 'info', ref, message: `Source ${ref} has no publication date.` });
    }

    if (!src.qualityTier || src.qualityTier === 'not_available') {
      issues.push({ code: 'MISSING_QUALITY_TIER', severity: 'info', ref, message: `Source ${ref} has no quality tier (A/B/C).` });
    }
  }

  return issues;
}

function checkCandidates(candidates) {
  const issues = [];
  const seenNames = new Set();

  for (const cand of candidates) {
    const ref = cand.candidateId || cand.name || 'unknown';

    const nameLower = (cand.name || '').toLowerCase().trim();
    if (nameLower && seenNames.has(nameLower)) {
      issues.push({ code: 'DUPLICATE_CANDIDATE', severity: 'warning', name: cand.name, message: `Duplicate candidate: "${cand.name}"` });
    }
    seenNames.add(nameLower);

    if (typeof cand.confidence === 'number') {
      if (cand.confidence < 0 || cand.confidence > 1) {
        issues.push({ code: 'CONFIDENCE_OUT_OF_RANGE', severity: 'error', ref, value: cand.confidence, message: `Candidate ${ref} confidence ${cand.confidence} is outside [0, 1].` });
      }
    }
  }

  return issues;
}

function checkOpportunityScores(scores) {
  const issues = [];

  if (!Array.isArray(scores)) return issues; // not_available is fine

  for (const score of scores) {
    const ref = score.candidateId || 'unknown';

    if (typeof score.totalScore !== 'number') {
      issues.push({ code: 'MISSING_TOTAL_SCORE', severity: 'error', ref, message: `Score for ${ref} has no totalScore.` });
    }

    if (!score.rationale || score.rationale === 'not_available') {
      issues.push({ code: 'MISSING_SCORE_RATIONALE', severity: 'warning', ref, message: `Score for ${ref} has no overall rationale.` });
    }

    for (const [dim, detail] of Object.entries(score.dimensions || {})) {
      if (typeof detail.score !== 'number') continue;
      if (detail.score < SCORE_MIN || detail.score > SCORE_MAX) {
        issues.push({ code: 'SCORE_OUT_OF_RANGE', severity: 'error', ref, dimension: dim, value: detail.score, message: `Dimension "${dim}" for ${ref} is ${detail.score}, outside [${SCORE_MIN}, ${SCORE_MAX}].` });
      }
      if (!detail.justification) {
        issues.push({ code: 'MISSING_SCORE_JUSTIFICATION', severity: 'warning', ref, dimension: dim, message: `Dimension "${dim}" for ${ref} has no justification.` });
      }
    }
  }

  return issues;
}

function checkRecommendations(recommendations) {
  const issues = [];

  for (const rec of recommendations) {
    if (!rec.text) {
      issues.push({ code: 'EMPTY_RECOMMENDATION', severity: 'error', message: 'A recommendation has no text.' });
      continue;
    }
    if (OUTREACH_PATTERN.test(rec.text)) {
      issues.push({
        code: 'OUTREACH_LANGUAGE',
        severity: 'error',
        text: rec.text.slice(0, 120),
        message: `Recommendation contains outreach language: "${rec.text.slice(0, 80)}${rec.text.length > 80 ? '...' : ''}"`,
      });
    }
  }

  return issues;
}

function checkSignals(signals) {
  const issues = [];

  for (const sig of signals) {
    const ref = sig.signalId || 'unknown';

    if (!Array.isArray(sig.sourceIds) || sig.sourceIds.length === 0) {
      issues.push({ code: 'UNSUPPORTED_SIGNAL', severity: 'warning', ref, message: `Signal ${ref} has no source references — claim is unsupported.` });
    }

    if (typeof sig.confidence === 'number' && (sig.confidence < 0 || sig.confidence > 1)) {
      issues.push({ code: 'CONFIDENCE_OUT_OF_RANGE', severity: 'error', ref, value: sig.confidence, message: `Signal ${ref} confidence ${sig.confidence} is outside [0, 1].` });
    }
  }

  return issues;
}

function checkMockLabeling(normalized) {
  const searchable = JSON.stringify(normalized);
  if (!/\(mock\)/i.test(searchable)) {
    return [{
      code: 'UNLABELED_MOCK_CONTENT',
      severity: 'warning',
      message: 'No "(mock)" label found in the normalized output. Mock runs must label all synthetic content.',
    }];
  }
  return [];
}
