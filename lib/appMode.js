import { MODELS } from '@/lib/ai';

/**
 * App mode controls how much each report costs to generate.
 *
 *   mock  — no AI call at all; a static sample report (free, for UI work)
 *   cheap — real AI, smallest model, 1 search, short report (low-cost tests)
 *   full  — the complete agentic workflow (portfolio-quality output)
 *
 * Set APP_MODE in .env.local. When unset: local dev defaults to mock so
 * development never spends credits by accident; production defaults to full
 * so the deployed app keeps working without extra configuration.
 */
const VALID_MODES = ['mock', 'cheap', 'full'];

export function getAppMode() {
  const raw = (process.env.APP_MODE || '').trim().toLowerCase();
  if (VALID_MODES.includes(raw)) return raw;
  return process.env.NODE_ENV === 'production' ? 'full' : 'mock';
}

export const MODE_SETTINGS = {
  cheap: {
    model: MODELS.cheap,
    maxTokens: 1500,
    maxSearches: 1,
    systemPromptSuffix:
      '\n\nBREVITY OVERRIDE (low-cost test run): keep every section to at most 2 sentences or 3 short bullets. Ignore the depth-weighting rule. Your search budget is 1 search, not 4 — spend it on a single company-overview query. All data-honesty and citation rules still apply.',
  },
  full: {
    model: MODELS.full,
    maxTokens: 4096,
    maxSearches: 4,
    systemPromptSuffix: '',
  },
};
