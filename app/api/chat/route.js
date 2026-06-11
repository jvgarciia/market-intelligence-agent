import { NextResponse } from 'next/server';
import { chat } from '@/lib/ai';
import { MARKET_INTELLIGENCE_SYSTEM_PROMPT } from '@/lib/prompts/marketIntelligencePrompt';
import { FOCUS_OPTIONS, DEFAULT_FOCUS, MAX_INPUT_LENGTH } from '@/lib/focusOptions';
import { searchWeb, isSearchConfigured } from '@/lib/tools/webSearch';

// Search + generation can exceed Vercel's default function timeout
export const maxDuration = 120;

/**
 * POST /api/chat
 *
 * Accepts a market intelligence research request, runs live web searches
 * when configured, and returns a structured report.
 *
 * Request body: { company: string, industry?: string, focus?: string }
 * Response:     { reply: string, sourceCount: number } or { error: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const company = typeof body.company === 'string' ? body.company.trim() : '';
    const industry = typeof body.industry === 'string' ? body.industry.trim() : '';
    const focus = typeof body.focus === 'string' ? body.focus.trim() : DEFAULT_FOCUS;

    if (!company) {
      return badRequest('Company name is required.');
    }
    if (company.length > MAX_INPUT_LENGTH) {
      return badRequest(`Company name is too long (max ${MAX_INPUT_LENGTH} characters).`);
    }
    if (industry.length > MAX_INPUT_LENGTH) {
      return badRequest(`Industry is too long (max ${MAX_INPUT_LENGTH} characters).`);
    }
    if (!FOCUS_OPTIONS.includes(focus)) {
      return badRequest(`Unknown research focus. Valid options: ${FOCUS_OPTIONS.join(', ')}.`);
    }

    const sources = await gatherSources(company, industry);

    const reply = await chat(
      [{ role: 'user', content: buildUserMessage(company, industry, focus, sources) }],
      { systemPrompt: MARKET_INTELLIGENCE_SYSTEM_PROMPT }
    );

    return NextResponse.json({ reply, sourceCount: sources.length });
  } catch (error) {
    console.error('[/api/chat] Error:', error.status || 'no-status', '-', error.message);
    return NextResponse.json({ error: errorMessageFor(error) }, { status: 500 });
  }
}

/**
 * V2.0: three fixed research angles, searched in parallel.
 * A failed or unconfigured search never blocks the report — the model
 * falls back to training knowledge and the UI says so.
 */
async function gatherSources(company, industry) {
  if (!isSearchConfigured()) return [];

  const suffix = industry ? ` ${industry}` : '';
  const queries = [
    `${company} company overview business model${suffix}`,
    `${company} competitors and alternatives${suffix}`,
    `${company} marketing strategy brand positioning recent`,
  ];

  const settled = await Promise.allSettled(queries.map((q) => searchWeb(q)));

  const seen = new Set();
  const sources = [];
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`[/api/chat] Search failed for "${queries[i]}":`, result.reason.message);
      return;
    }
    for (const item of result.value) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      sources.push(item);
    }
  });

  return sources;
}

function buildUserMessage(company, industry, focus, sources) {
  const lines = [`Company: ${company}`];
  if (industry) lines.push(`Industry: ${industry}`);
  lines.push(`Research focus: ${focus}`);

  if (sources.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    lines.push(`\nWEB SEARCH RESULTS (retrieved ${today}):`);
    sources.forEach((source, i) => {
      lines.push(`\n[${i + 1}] ${source.title}\nURL: ${source.url}\n${source.content}`);
    });
  }

  lines.push('\nGenerate a full Market Intelligence Report for this company.');
  return lines.join('\n');
}

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function errorMessageFor(error) {
  if (error.status === 401) {
    return 'The AI service rejected the server credentials. Check ANTHROPIC_API_KEY in .env.local and restart the dev server.';
  }
  if (error.status === 429 || error.status === 529) {
    return 'The AI service is busy right now. Wait a moment and try again.';
  }
  return 'Something went wrong while generating the report. Try again — if it keeps failing, check the server logs.';
}
