/* OMNI-1 (omniroute integration, 2026-09-14) — env-only LLM endpoint
 * resolution for the agent brain. The route used to hard-pin 'glm-4.6'
 * through the built-in .z-ai-config gateway; ops can now point the app at
 * ANY OpenAI-compatible endpoint (e.g. an omniroute share) via three env
 * vars — SERVER-SIDE ONLY, deliberately unreachable from any UI:
 *
 *   AGENT_LLM_BASE_URL   e.g. https://…​.share.zrok.io/v1
 *   AGENT_LLM_MODEL      e.g. opencode-go/deepseek-v4.1-flash
 *   AGENT_LLM_API_KEY    optional (keyless gateways ignore it)
 *
 * Resolution rules (contract-tested in tests/unit/llm-config.test.ts):
 *  1. AGENT_LLM_BASE_URL set → the env endpoint wins wholesale: the Z
 *     identity headers are NOT sent (they are built-in-gateway internals),
 *     the key falls back to a placeholder when unset, and the model comes
 *     from AGENT_LLM_MODEL (or the default).
 *  2. Only AGENT_LLM_MODEL set → the built-in gateway stays (headers and
 *     all), just the model id swaps — handy for pinning a different model
 *     on the same gateway.
 *  3. Nothing set → built-in gateway + 'glm-4.6', bit-for-bit the old
 *     behavior (zero-migration default).
 * Whitespace-only values count as unset. Trailing slashes on the base URL
 * are stripped (the OpenAI SDK appends '/chat/completions' itself and a
 * '//' path breaks some gateways).
 */

export const DEFAULT_AGENT_MODEL = 'glm-4.6'

/** Placeholder sent as the API key when an env endpoint needs no auth —
 * the OpenAI SDK refuses to construct without SOME string, and keyless
 * gateways ignore it entirely. */
const NO_KEY_PLACEHOLDER = 'omniroute-keyless'

export interface GatewayFileConfig {
  baseUrl: string
  apiKey: string
  chatId?: string
  userId?: string
  token?: string
}

export interface LlmEndpoint {
  /** OpenAI-compatible base URL, no trailing slash */
  baseUrl: string
  apiKey: string
  model: string
  /** Extra identity headers for the built-in gateway ({} for env endpoints) */
  headers: Record<string, string>
  /** Where this endpoint came from — 'builtin' (.z-ai-config) or 'env' */
  source: 'builtin' | 'env'
}

function trimmed(v: string | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function resolveLlmEndpoint(
  cfg: GatewayFileConfig | null,
  env: NodeJS.ProcessEnv = process.env,
): LlmEndpoint | null {
  const envBaseUrl = trimmed(env.AGENT_LLM_BASE_URL).replace(/\/+$/, '')
  const envModel = trimmed(env.AGENT_LLM_MODEL)
  const envApiKey = trimmed(env.AGENT_LLM_API_KEY)

  // Rule 1 — full env override: ops pointed the app at an external
  // OpenAI-compatible endpoint. Z identity headers stay home.
  if (envBaseUrl) {
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey || NO_KEY_PLACEHOLDER,
      model: envModel || DEFAULT_AGENT_MODEL,
      headers: {},
      source: 'env',
    }
  }

  // No gateway at all → nothing to resolve against (route errors out).
  if (!cfg) return null

  // Rule 2/3 — built-in gateway, with an optional model swap.
  return {
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: envModel || DEFAULT_AGENT_MODEL,
    headers: {
      'X-Z-AI-From': 'Z',
      ...(cfg.chatId ? { 'X-Chat-Id': cfg.chatId } : {}),
      ...(cfg.userId ? { 'X-User-Id': cfg.userId } : {}),
      ...(cfg.token ? { 'X-Token': cfg.token } : {}),
    },
    source: 'builtin',
  }
}
