/**
 * lib/tools/webSearch.js — Tavily web search
 *
 * One file = one tool: the schema Claude sees (webSearchTool) and the
 * function that executes it (searchWeb) live together, so adding a new
 * tool to the project means adding one new file shaped like this one.
 *
 * Trimming happens here, not in the route: whatever calls this tool
 * gets results that are already safe to put in a prompt.
 */

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const MAX_RESULTS_PER_QUERY = 4;
const MAX_CONTENT_CHARS = 1200;

export function isSearchConfigured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

// The tool definition Claude sees. The description is prompt engineering:
// it teaches the model when (and when not) to reach for the tool.
export const webSearchTool = {
  name: 'web_search',
  description:
    'Search the live web for current information. Use it for facts about companies, ' +
    'competitors, markets, and recent news that may postdate your training data. ' +
    'Returns the top results as { title, url, content } objects. ' +
    'Do not search for general knowledge you are already confident about.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A focused search query. Include the company name plus what you need, ' +
          'e.g. "Acme Corp competitors B2B logistics" or "Acme Corp marketing strategy 2026".',
      },
    },
    required: ['query'],
  },
};

export async function searchWeb(query) {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: MAX_RESULTS_PER_QUERY,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed with status ${res.status}`);
  }

  const data = await res.json();

  return (data.results || []).map((result) => ({
    title: result.title || 'Untitled',
    url: result.url,
    content: (result.content || '').slice(0, MAX_CONTENT_CHARS),
  }));
}
