/**
 * lib/tools/webSearch.js — Tavily web search
 *
 * One file = one tool. V2.0 calls searchWeb() directly from the API
 * route (fixed queries). V2.1 will wrap this same function in a Claude
 * tool definition so the model can decide what to search.
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
