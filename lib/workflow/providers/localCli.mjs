/**
 * lib/workflow/providers/localCli.mjs — local Claude Code CLI provider.
 *
 * Runs the locally-installed Claude Code CLI as a child process and uses the
 * authenticated OAuth session — NOT the metered ANTHROPIC_API_KEY.
 *
 * This is for private local development only. It must never be reachable from
 * a production deployment or from external users. Production builds must use
 * the anthropic-api provider instead.
 *
 * Provider interface:
 *   generate({ systemPrompt, userMessage, timeoutMs?, model? }, { spawnFn? })
 *   → { content, structuredOutput, provider, model, executionMode,
 *       startedAt, completedAt, latencyMs, usage, toolActivity,
 *       warnings, rawProviderOutput }
 *
 * spawnFn can be injected in tests so no real CLI call is ever made during
 * the automated test suite.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CLI_PATH = '/opt/homebrew/bin/claude';
const DEFAULT_TIMEOUT_MS = 180_000; // 3 minutes
const DEFAULT_MODEL = 'sonnet';

// ─── environment ─────────────────────────────────────────────────────────────

/**
 * Check whether the CLI binary exists at the known path.
 * Does not verify that the user is authenticated.
 */
export function isAvailable() {
  return existsSync(CLI_PATH);
}

/**
 * Build a sanitized child-process environment.
 * Strips paid API keys so the CLI falls back to its OAuth session.
 * Never logs or persists the returned object.
 *
 * @param {object} [baseEnv] - override process.env in tests
 */
export function buildSafeEnv(baseEnv = process.env) {
  const safe = { ...baseEnv };
  // Remove these so the CLI cannot accidentally route to metered endpoints.
  // The CLI without --bare uses OAuth from the keychain; ANTHROPIC_API_KEY
  // would override that and cause subscription-billed → API-billed routing.
  delete safe.ANTHROPIC_API_KEY;
  delete safe.TAVILY_API_KEY;
  delete safe.OPENAI_API_KEY;
  delete safe.GEMINI_API_KEY;
  return safe;
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Run a prompt through the local Claude Code CLI.
 *
 * @param {object} params
 *   systemPrompt  string  — role/behaviour instructions (passed via --system-prompt)
 *   userMessage   string  — the task, context, and output schema instructions
 *   timeoutMs     number  — optional; defaults to LOCAL_CLAUDE_TIMEOUT_MS or 180 000
 *   model         string  — optional; defaults to LOCAL_CLAUDE_MODEL or "sonnet"
 *
 * @param {object} [_injected]
 *   spawnFn       function — replaces spawnSync in tests (never the real CLI)
 *
 * @returns {object} normalized provider result
 */
export async function generate(params, _injected = {}) {
  const { systemPrompt, userMessage, timeoutMs: paramTimeout, model: paramModel } = params;
  const spawnFn = _injected.spawnFn || spawnSync;

  // ── safety gates ────────────────────────────────────────────────────────────

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'local-cli provider is disabled in production. ' +
      'This provider uses a personal Claude Code subscription session and must ' +
      'not be used to serve external users. ' +
      'Configure AI_PROVIDER=anthropic-api and ANTHROPIC_API_KEY for production.'
    );
  }

  if (!isAvailable()) {
    throw new Error(
      `local-cli provider: Claude CLI not found at ${CLI_PATH}. ` +
      'Install Claude Code (claude.ai/code) and run `claude auth login`.'
    );
  }

  // ── resolve config ───────────────────────────────────────────────────────────

  const timeoutMs =
    paramTimeout ||
    parseInt(process.env.LOCAL_CLAUDE_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10);

  const model =
    paramModel || process.env.LOCAL_CLAUDE_MODEL || DEFAULT_MODEL;

  // ── build argument list ───────────────────────────────────────────────────────
  // Args are passed as an array — never concatenated into a shell string — so
  // there is no risk of shell-injection from content in the prompts.

  const args = [
    '--print',
    '--output-format', 'text',
    '--model', model,
    '--no-session-persistence', // don't persist this automated run to history
  ];

  if (systemPrompt) {
    // --system-prompt replaces the default Claude Code system prompt, including
    // any auto-discovered CLAUDE.md from the project directory. This gives us a
    // clean, predictable research context instead of the development rules.
    args.push('--system-prompt', systemPrompt);
  }

  // The user message is the final positional argument.
  args.push(userMessage);

  // ── spawn subprocess ──────────────────────────────────────────────────────────

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const spawnResult = spawnFn(CLI_PATH, args, {
    env: buildSafeEnv(),
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024, // 10 MB
    encoding: 'utf8',
  });

  const completedAt = new Date().toISOString();
  const latencyMs = Date.now() - t0;

  // ── handle process errors ────────────────────────────────────────────────────

  if (spawnResult.error) {
    if (spawnResult.error.code === 'ETIMEDOUT') {
      throw new Error(
        `local-cli provider: timed out after ${timeoutMs}ms. ` +
        'Increase LOCAL_CLAUDE_TIMEOUT_MS or simplify the research request.'
      );
    }
    throw new Error(`local-cli provider: process error: ${spawnResult.error.message}`);
  }

  if (spawnResult.status !== 0) {
    const stderrPreview = (spawnResult.stderr || '').slice(0, 1000);
    throw new Error(
      `local-cli provider: CLI exited with code ${spawnResult.status}.\n` +
      `stderr: ${stderrPreview || '(empty)'}`
    );
  }

  const rawText = (spawnResult.stdout || '').trim();

  // ── extract structured output ─────────────────────────────────────────────────

  const warnings = [];
  let structuredOutput = null;

  try {
    structuredOutput = extractJson(rawText);
  } catch (e) {
    warnings.push(`JSON extraction failed: ${e.message}`);
  }

  // ── return normalized result ──────────────────────────────────────────────────

  return {
    content: rawText,
    structuredOutput,
    provider: 'local-cli',
    model,
    executionMode: 'local-cli',
    startedAt,
    completedAt,
    latencyMs,
    usage: {
      // The CLI text-mode output does not expose token counts.
      inputTokens: 'not_available',
      outputTokens: 'not_available',
    },
    // Individual tool calls are handled inside the CLI agent loop and are
    // not surfaced in text-mode output.
    toolActivity: 'not_available',
    warnings,
    rawProviderOutput: {
      // Enough for debugging; never the full env or credentials.
      exitCode: spawnResult.status,
      stderrPreview: (spawnResult.stderr || '').slice(0, 500),
    },
    estimatedApiCost: 'not_applicable',
    subscriptionUsage: 'not_available',
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Find and parse the outermost JSON object in a text response.
 * Claude may occasionally emit a brief preamble before the JSON; this handles it.
 */
function extractJson(text) {
  if (!text) throw new Error('empty response from CLI');

  // First try: the entire trimmed output is JSON.
  try {
    return JSON.parse(text);
  } catch (_) {
    // fall through
  }

  // Second try: find the outermost { … } block.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch (_) {
      // fall through
    }
  }

  throw new Error(
    `No valid JSON object found in CLI response. ` +
    `First 300 chars: ${text.slice(0, 300)}`
  );
}
