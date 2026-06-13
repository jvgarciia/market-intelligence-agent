/**
 * scripts/run-workflow-demo.mjs — run one Market Opportunity workflow in mock
 * mode and print where to inspect the artifacts. Costs nothing (no API calls).
 *
 *   npm run workflow:demo
 */

import { runWorkflow } from '../lib/workflow/runWorkflow.mjs';

const request = {
  targetMarket: 'Spain',
  targetCustomerType: 'water utilities',
  solutionDescription: 'AI leak-detection and water-network monitoring software',
  businessObjective: 'Shortlist utilities worth researching for outbound marketing',
  constraints: ['EU only', 'public-sector and regulated utilities'],
};

const result = runWorkflow(request, { mode: 'mock' });

console.log('Market Opportunity workflow — mock run complete ($0 spent, no API calls).');
console.log('');
console.log('Run ID:', result.runId);
console.log('Folder:', result.dir);
console.log('Artifacts (inspect these):');
for (const file of result.files) console.log('  -', file);
console.log('');
console.log('Review Gate 1 → open 02-candidates.json + 03-validation.json');
console.log('Review Gate 2 → open 05-brief.md');
