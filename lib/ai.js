/**
 * lib/ai.js — AI wrapper
 *
 * The single place where all AI provider logic lives.
 * Currently Anthropic-only. When another provider is needed,
 * install its SDK and add a call function here — nothing
 * outside this file should change.
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Be concise and clear.';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * chat(messages, options)
 *
 * @param {Array}  messages  - Array of { role: "user" | "assistant", content: string }
 * @param {Object} options   - Optional: { systemPrompt: string }
 * @returns {Promise<string>} - The AI's response as a plain string
 *
 * Example usage:
 *   const reply = await chat([{ role: "user", content: "Hello!" }]);
 */
export async function chat(messages, options = {}) {
  const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
}
