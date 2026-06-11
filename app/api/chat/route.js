import { NextResponse } from 'next/server';
import { chat } from '@/lib/ai';
import { MARKET_INTELLIGENCE_SYSTEM_PROMPT } from '@/lib/prompts/marketIntelligencePrompt';
import { FOCUS_OPTIONS, DEFAULT_FOCUS, MAX_INPUT_LENGTH } from '@/lib/focusOptions';

/**
 * POST /api/chat
 *
 * Accepts a market intelligence research request and returns a structured report.
 *
 * Request body: { company: string, industry?: string, focus?: string }
 * Response:     { reply: string } or { error: string }
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

    const reply = await chat(
      [{ role: 'user', content: buildUserMessage(company, industry, focus) }],
      { systemPrompt: MARKET_INTELLIGENCE_SYSTEM_PROMPT }
    );

    return NextResponse.json({ reply });
  } catch (error) {
    // Log enough to debug server-side; send only a safe, actionable message to the UI
    console.error('[/api/chat] Error:', error.status || 'no-status', '-', error.message);
    return NextResponse.json({ error: errorMessageFor(error) }, { status: 500 });
  }
}

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function buildUserMessage(company, industry, focus) {
  const lines = [`Company: ${company}`];
  if (industry) lines.push(`Industry: ${industry}`);
  lines.push(`Research focus: ${focus}`);
  lines.push('\nGenerate a full Market Intelligence Report for this company.');
  return lines.join('\n');
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
