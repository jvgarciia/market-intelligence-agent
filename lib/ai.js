/**
 * lib/ai.js — Provider-agnostic AI wrapper
 *
 * This file is the single place where all AI provider logic lives.
 * To switch providers, change AI_PROVIDER in your .env.local file.
 *
 * Supported: "anthropic" | "openai" | "gemini"
 */

const PROVIDER = process.env.AI_PROVIDER || 'anthropic';

// ─── Shared defaults ──────────────────────────────────────────────────────────
const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Be concise and clear.';
const DEFAULT_MAX_TOKENS = 1024;

// ─── Anthropic (Claude) ───────────────────────────────────────────────────────
async function callAnthropic(messages, systemPrompt) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
}

// ─── OpenAI (GPT) ─────────────────────────────────────────────────────────────
async function callOpenAI(messages, systemPrompt) {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: DEFAULT_MAX_TOKENS,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });

  return response.choices[0].message.content;
}

// ─── Google Gemini ────────────────────────────────────────────────────────────
async function callGemini(messages, systemPrompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: systemPrompt,
  });

  // Gemini uses a different message format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1].content;

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}

// ─── Unified export ───────────────────────────────────────────────────────────
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

  switch (PROVIDER) {
    case 'anthropic':
      return callAnthropic(messages, systemPrompt);
    case 'openai':
      return callOpenAI(messages, systemPrompt);
    case 'gemini':
      return callGemini(messages, systemPrompt);
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${PROVIDER}". Must be "anthropic", "openai", or "gemini".`
      );
  }
}
