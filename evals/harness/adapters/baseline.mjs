/**
 * evals/harness/adapters/baseline.mjs — wraps the single-report (baseline) flow
 * for evaluation.
 *
 * The baseline API takes { company, industry, focus } and returns a prose markdown
 * report. The eval cases use { targetMarket, targetCustomerType, solutionDescription,
 * businessObjective, constraints } — a different schema. This adapter bridges that
 * gap and documents the mapping explicitly in rawOutput.inputMapping so reviewers
 * know what approximation was made.
 *
 * In mock mode: no API call is made. The adapter produces a deterministic mock
 * output that mirrors the structure POST /api/chat returns in mock mode. Content
 * is labelled "(mock)" throughout. Cost is exactly 0.
 *
 * In live modes: this file throws a clear error. Use scripts/run-eval-live.mjs
 * after explicit approval — it will wire up the real chat call.
 */

const ADAPTER_NAME = 'baseline-v1';
const MOCK = '(mock)';

/**
 * Run the baseline adapter for an eval case.
 *
 * @param {object} evalCase  — a loaded evals/cases/*.json object
 * @param {object} options   — { mode: 'mock' }
 * @returns {{ rawOutput: object, metrics: object }}
 */
export function runBaselineAdapter(evalCase, options = {}) {
  const mode = options.mode || 'mock';

  if (mode !== 'mock') {
    throw new Error(
      `BaselineAdapter: mode "${mode}" requires real Anthropic API calls. ` +
      `Only mock mode is supported here. ` +
      `Use scripts/run-eval-live.mjs with explicit confirmation to run a live evaluation.`
    );
  }

  const startMs = Date.now();
  const rawOutput = buildMockBaselineOutput(evalCase);
  const latencyMs = Date.now() - startMs;

  return {
    rawOutput,
    metrics: {
      latencyMs,
      modelCalls: 0,
      searchCalls: 0,
      inputTokens: 'not_available',
      outputTokens: 'not_available',
      estimatedCostUsd: 0.00,
      realApiCallMade: false,
      mode,
      adapterName: ADAPTER_NAME,
    },
  };
}

function buildMockBaselineOutput(evalCase) {
  const { targetMarket, targetCustomerType, solutionDescription } = evalCase.input;
  const label = `${targetMarket} — ${targetCustomerType}`;

  const reply = `## 1. Market Overview
**${label}** represents a potential opportunity for ${solutionDescription} ${MOCK}. The market shows early signs of regulatory pressure and digital adoption. Primary buyers are public-sector operators with formal procurement processes.

## 2. Key Market Signals
- Regulatory tightening around network efficiency creates near-term demand pressure ${MOCK} [1].
- Public funding programmes are emerging for infrastructure modernisation in ${targetMarket} ${MOCK} [2].
- Mid-size operators are beginning to pilot digital network monitoring ${MOCK} [3].

## 3. Competitor Landscape
- **Vendor Alpha ${MOCK}** — established platform, enterprise pricing, broad integrations.
- **Vendor Beta ${MOCK}** — specialist with strong regulatory credibility, larger-team focus.
- **Vendor Gamma ${MOCK}** — cost-competitive point solution, limited depth.

## 4. Target Organisations
Regional and municipal ${targetCustomerType} in ${targetMarket} are the primary targets ${MOCK}. Decision-making cycles are formal; budget windows tied to regulatory deadlines are the timing entry point [1][2].

## 5. Strategic Implications
The combination of regulatory pressure and available funding creates a time-bound window. The primary risk is slow public-sector procurement cycles, estimated at 12–18 months ${MOCK} [3].

## 6. Recommended Next Actions
1. Research procurement calendars for major operators in ${targetMarket}.
2. Build a regulatory-compliance angle for the positioning.
3. Monitor funding programme deadlines for commercial-timing opportunities.

Confidence note: this is a MOCK baseline report generated without any AI call — all content is fictional placeholder for infrastructure testing. Do not treat any claim above as real market data.

## 7. Sources Used
- [1] [Regulatory overview — ${targetMarket} ${MOCK}](https://example.gov/water-regulation)
- [2] [Infrastructure funding programme ${MOCK}](https://example.org/infrastructure-funding)
- [3] [Industry digitalisation survey ${MOCK}](https://example.com/utility-digitalisation)`;

  return {
    reply,
    sourceCount: 3,
    toolCallCount: 0,
    sources: [
      { title: `Regulatory overview — ${targetMarket} ${MOCK}`, url: 'https://example.gov/water-regulation' },
      { title: `Infrastructure funding programme ${MOCK}`, url: 'https://example.org/infrastructure-funding' },
      { title: `Industry digitalisation survey ${MOCK}`, url: 'https://example.com/utility-digitalisation' },
    ],
    mode: 'mock',
    inputMapping: {
      note: [
        'The baseline API accepts { company, industry, focus } — not the staged workflow schema.',
        'For evaluation, targetMarket is used as "company" and targetCustomerType as "industry".',
        'This is a documented approximation. A live baseline run would need its own prompt variant',
        'or the eval case would need to provide a company/industry pair explicitly.',
      ].join(' '),
      mappedAs: {
        company: targetMarket,
        industry: targetCustomerType,
        focus: 'market_opportunity',
      },
    },
  };
}
