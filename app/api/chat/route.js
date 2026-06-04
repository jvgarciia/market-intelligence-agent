import { NextResponse } from 'next/server';
import { chat } from '@/lib/ai';

/**
 * POST /api/chat
 *
 * Receives a conversation history from the frontend,
 * sends it to the AI provider, and returns the response.
 *
 * Request body: { messages: [{ role: "user" | "assistant", content: string }] }
 * Response:     { reply: string } or { error: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body;

    // Basic validation — make sure we got something to work with
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Request must include a non-empty messages array.' },
        { status: 400 }
      );
    }

    const reply = await chat(messages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[/api/chat] Error:', error.message);

    // Don't expose internal error details to the frontend in production
    return NextResponse.json(
      { error: 'Something went wrong. Check the server logs for details.' },
      { status: 500 }
    );
  }
}
