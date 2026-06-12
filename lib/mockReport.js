/**
 * Static sample report for MOCK_MODE. Mirrors the exact structure the real
 * analyst prompt produces (same ## headers, inline [n] citations, confidence
 * note, Sources Used section) so the UI renders it identically to a real one.
 * The content is fiction — it exists to test layout, copy/export, and flow
 * without spending API credits.
 */
export function buildMockReport(company, industry, focus) {
  const market = industry || 'its category';

  const reply = `## 1. Company Overview
**${company}** operates in ${market} at apparent growth stage, selling primarily through a direct digital channel [1]. The business model combines a self-serve entry product with higher-touch plans for teams. Core value proposition in one sentence: ${company} promises faster results with less manual work than the established alternatives.

## 2. Target Audience
- **Hands-on operators** — small-team leads who run the work themselves, care about time saved per week, and buy after a free trial proves one concrete win.
- **Growth-stage managers** — own a number, care about reporting they can forward upward, and buy when a tool de-risks a quarterly goal [2].
- **Agency power users** — manage several client accounts at once, care about multi-account workflows, and buy when per-seat pricing beats building in-house.

## 3. Positioning
The implied brand promise is **speed without complexity**: accessible rather than premium, functional rather than emotional, aimed at the mass middle of the category [1]. The single positioning idea ${company} owns today is "results in days, not quarters" — though it shares that claim with at least one competitor and has not yet made it defensible.

## 4. Competitors
- **Acme Suite** — broader platform, enterprise pricing; wins on integrations, loses on onboarding speed (inference).
- **NorthBeam Labs** — premium specialist with strong analyst credibility; targets larger teams [2].
- **QuickStack** — cheaper point solution; competes on price, not depth.
- **DIY spreadsheets** — the real competitor for the smallest segment; free but fragile.

## 5. Marketing Channels
Paid: search ads on high-intent category terms; retargeting. Organic: SEO comparison content, an active community presence [3]. Owned: lifecycle email and an in-product referral loop. Top two channels for this audience: **SEO comparison pages** (buyers research alternatives before trials) and **lifecycle email** (trial-to-paid conversion is the revenue lever) — both compound and neither depends on auction prices.

## 6. SEO & Content Opportunities
- **"${company} vs [competitor]" comparison hub** — landing-page cluster targeting switchers; assign one page per named competitor.
- **Job-to-be-done tutorials** — long-form guides for the operator segment, format: step-by-step with templates [3].
- **Pricing-transparency explainer** — article plus calculator targeting "how much does [category] cost" queries.
- **Customer teardown series** — monthly case study format aimed at the manager segment's need for forwardable proof.

## 7. Strategic Recommendations
1. **Ship the comparison-page cluster first** — highest-intent traffic with existing demand; effort: medium.
2. **Instrument trial-to-paid email flow** — three-email sequence keyed to activation events; effort: low.
3. **Pick one defensible positioning proof point** — publish benchmark data that makes "days, not quarters" measurable; effort: high.

Confidence note: this is a MOCK report generated without any AI call — every fact above is fictional placeholder content for testing the app. Verify nothing; replace with a real run before using.

## 8. Sources Used
- [1] [${company} — company website (mock)](https://example.com/company)
- [2] [Industry landscape report (mock)](https://example.com/landscape)
- [3] [Category channel benchmarks (mock)](https://example.com/benchmarks)`;

  const sources = [
    { title: `${company} — company website (mock)`, url: 'https://example.com/company' },
    { title: 'Industry landscape report (mock)', url: 'https://example.com/landscape' },
    { title: 'Category channel benchmarks (mock)', url: 'https://example.com/benchmarks' },
  ];

  return { reply, sources };
}
