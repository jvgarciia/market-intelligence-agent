/**
 * lib/ai.js — AI wrapper
 *
 * The single place where all AI provider logic lives.
 * Currently Anthropic-only. When another provider is needed,
 * install its SDK and add a call function here — nothing
 * outside this file should change.
 *
 * Two entry points:
 *   chat()          — one request, one text answer
 *   chatWithTools() — agentic loop: the model may call tools,
 *                     observe results, and continue until done
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Be concise and clear.';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * chat(messages, options)
 *
 * @param {Array}  messages  - Array of { role: "user" | "assistant", content: string }
 * @param {Object} options   - Optional: { systemPrompt: string }
 * @returns {Promise<string>} - The AI's response as a plain string
 */
export async function chat(messages, options = {}) {
  const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
}

/**
 * chatWithTools(messages, options)
 *
 * The agentic loop. Each round: send the conversation, and if the model
 * asks to use a tool, execute it, append the result, and go again. The
 * loop ends when the model answers in plain text.
 *
 * This function stays generic — it knows nothing about web search.
 * The caller supplies the tool definitions and an executeToolCall
 * function, so any future tool plugs in without touching this file.
 *
 * @param {Array}  messages - Array of { role, content }
 * @param {Object} options  - {
 *     systemPrompt: string,
 *     tools: Array of Anthropic tool definitions,
 *     executeToolCall: async (toolName, toolInput) => result,
 *     maxToolCalls: number (default 4),
 *   }
 * @returns {Promise<{ text: string, toolCallCount: number }>}
 */
export async function chatWithTools(messages, options = {}) {
  const {
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    tools = [],
    executeToolCall,
    maxToolCalls = 4,
  } = options;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const conversation = [...messages];
  let toolCallCount = 0;
  let response;

  async function runTool(block) {
    if (toolCallCount >= maxToolCalls) {
      return toolResult(
        block.id,
        'Search budget exhausted. Write the final report now using the evidence already gathered.',
        true
      );
    }
    toolCallCount++;
    try {
      const output = await executeToolCall(block.name, block.input);
      return toolResult(block.id, JSON.stringify(output), false);
    } catch (error) {
      return toolResult(block.id, `Tool failed: ${error.message}. Continue without this result.`, true);
    }
  }

  // Hard ceiling on API rounds so a misbehaving loop can never run away
  const maxRounds = maxToolCalls + 2;

  for (let round = 0; round < maxRounds; round++) {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      // Array form lets the system prompt be cached across loop rounds,
      // so repeated rounds don't re-bill the same tokens at full price
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: conversation,
      tools,
    });

    if (response.stop_reason !== 'tool_use') break;

    conversation.push({ role: 'assistant', content: response.content });

    const results = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') results.push(await runTool(block));
    }
    conversation.push({ role: 'user', content: results });
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text) {
    throw new Error('Model did not produce a final answer within the tool-call round limit.');
  }

  return { text, toolCallCount };
}

function toolResult(toolUseId, content, isError) {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content,
    ...(isError && { is_error: true }),
  };
}
