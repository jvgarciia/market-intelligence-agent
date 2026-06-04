import { NextResponse } from 'next/server';
import { chat } from '@/lib/ai';
import { MARKET_INTELLIGENCE_SYSTEM_PROMPT } from '@/lib/prompts/marketIntelligencePrompt';

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
    const { company, industry, focus } = body;

    if (!company || typeof company !== 'string' || !company.trim()) {
      return NextResponse.json(
        { error: 'Company name is required.' },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(company.trim(), industry?.trim(), focus?.trim());

    const reply = await chat(
      [{ role: 'user', content: userMessage }],
      { systemPrompt: MARKET_INTELLIGENCE_SYSTEM_PROMPT }
    );

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[/api/chat] Error:', error.message);
    return NextResponse.json(
      { error: 'Something went wrong. Check the server logs for details.' },
      { status: 500 }
    );
  }
}

function buildUserMessage(company, industry, focus) {
  const lines = [`Company: ${company}`];
  if (industry) lines.push(`Industry: ${industry}`);
  if (focus) lines.push(`Research focus: ${focus}`);
  lines.push('\nGenerate a full Market Intelligence Report for this company.');
  return lines.join('\n');
}
