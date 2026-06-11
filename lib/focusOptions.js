/**
 * Single source of truth for research focus options.
 *
 * Both the form dropdown (ResearchForm.js) and the API validation
 * (route.js) import from here, so the UI and the server can never
 * drift out of sync.
 */
export const FOCUS_OPTIONS = [
  'General Market Intelligence',
  'Brand Positioning',
  'Competitive Landscape',
  'Target Audience',
  'Content Strategy',
  'SEO Opportunities',
  'Go-to-Market Strategy',
];

export const DEFAULT_FOCUS = FOCUS_OPTIONS[0];

export const MAX_INPUT_LENGTH = 120;
