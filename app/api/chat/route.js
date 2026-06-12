import { NextResponse } from 'next/server';
import { chat, chatWithTools } from '@/lib/ai';
import { MARKET_INTELLIGENCE_SYSTEM_PROMPT } from '@/lib/prompts/marketIntelligencePrompt';
import { FOCUS_OPTIONS, DEFAULT_FOCUS, MAX_INPUT_LENGTH } from '@/lib/focusOptions';
import { searchWeb, isSearchConfigured, webSearchTool } from '@/lib/tools/webSearch';
import { getAppMode, MODE_SETTINGS } from '@/lib/appMode';
import { buildMockReport } from '@/lib/mockReport';

// The agentic loop can make up to 5 sequential Claude calls plus searches
export const maxDuration = 180;

// Keeps the loading state visible in mock mode so the UI flow stays realistic
const MOCK_RESPONSE_DELAY_MS = 1200;

/**
 * POST /api/chat
 *
 * Accepts a market intelligence research request. When live search is
 * configured, Claude runs an agentic loop: it decides what to search,
 * observes results, and searches again if needed before writing the
 * report. Without a search key it falls back to model knowledge.
 *
 * Request body: { company: string, industry?: string, focus?: string }
 * Response:     { reply, sourceCount, toolCallCount, sources } or { error }
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

    const mode = getAppMode();

    if (mode === 'mock') {
      console.log('[/api/chat] MOCK_MODE active — returning sample report, no API call made');
      await new Promise((resolve) => setTimeout(resolve, MOCK_RESPONSE_DELAY_MS));
      const { reply, sources } = buildMockReport(company, industry, focus);
      return NextResponse.json({ reply, sourceCount: sources.length, toolCallCount: 0, sources, mode });
    }

    const settings = MODE_SETTINGS[mode];
    const systemPrompt = MARKET_INTELLIGENCE_SYSTEM_PROMPT + settings.systemPromptSuffix;
    const messages = [{ role: 'user', content: buildUserMessage(company, industry, focus) }];

    console.log(`[/api/chat] Mode: ${mode} (model: ${settings.model}, max searches: ${settings.maxSearches})`);

    if (!isSearchConfigured()) {
      const reply = await chat(messages, {
        systemPrompt,
        model: settings.model,
        maxTokens: settings.maxTokens,
      });
      return NextResponse.json({ reply, sourceCount: 0, toolCallCount: 0, sources: [], mode });
    }

    // The route owns source tracking; the loop in lib/ai.js stays generic
    const sources = [];
    const seenUrls = new Set();

    const { text, toolCallCount } = await chatWithTools(messages, {
      systemPrompt,
      tools: [webSearchTool],
      maxToolCalls: settings.maxSearches,
      model: settings.model,
      maxTokens: settings.maxTokens,
      async executeToolCall(name, input) {
        if (name !== 'web_search') throw new Error(`Unknown tool: ${name}`);
        const results = await searchWeb(input.query);
        for (const result of results) {
          if (result.url && !seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            sources.push({ title: result.title, url: result.url });
          }
        }
        return results;
      },
    });

    console.log(`[/api/chat] Grounded report: ${toolCallCount} searches, ${sources.length} sources`);

    return NextResponse.json({ reply: text, sourceCount: sources.length, toolCallCount, sources, mode });
  } catch (error) {
    console.error('[/api/chat] Error:', error.status || 'no-status', '-', error.message);
    return NextResponse.json({ error: errorMessageFor(error) }, { status: 500 });
  }
}

function buildUserMessage(company, industry, focus) {
  const lines = [`Company: ${company}`];
  if (industry) lines.push(`Industry: ${industry}`);
  lines.push(`Research focus: ${focus}`);
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
  if (/credit balance/i.test(error.message || '')) {
    return 'The Anthropic account is out of API credits. Add credits at console.anthropic.com under Plans & Billing, then try again.';
  }
  if (error.status === 429 || error.status === 529) {
    return 'The AI service is busy right now. Wait a moment and try again.';
  }
  return 'Something went wrong while generating the report. Try again — if it keeps failing, check the server logs.';
}
