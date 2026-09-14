/**
 * OMNI-1 (omniroute integration) — the env-only LLM endpoint resolution
 * contract. The resolver decides, BEFORE any client is constructed, which
 * gateway the agent brain talks to. Invariants:
 *   - AGENT_LLM_BASE_URL set  → env endpoint wholesale: no Z identity
 *     headers, keyless placeholder when no key, env model or default;
 *   - only AGENT_LLM_MODEL set → built-in gateway kept (headers intact),
 *     just the model id swapped;
 *   - nothing set → bit-for-bit the legacy behavior (glm-4.6 + Z headers);
 *   - null cfg with no env override → null (route must error cleanly);
 *   - whitespace-only env values count as unset; trailing slashes on the
 *     base URL are stripped (SDK appends '/chat/completions' itself).
 */
import { describe, it, expect } from 'vitest'
import { resolveLlmEndpoint, DEFAULT_AGENT_MODEL } from '@/lib/agent/llm-config'

const BUILTIN = {
  baseUrl: 'https://builtin.internal/v1',
  apiKey: 'zai-secret',
  chatId: 'chat-1',
  userId: 'user-1',
  token: 'tok-1',
}

describe('OMNI-1 resolveLlmEndpoint — env endpoint override', () => {
  it('full env block: env base URL + model + key wins, no Z headers', () => {
    const out = resolveLlmEndpoint(BUILTIN, {
      AGENT_LLM_BASE_URL: 'https://z8igkn15sfyw.share.zrok.io/v1',
      AGENT_LLM_MODEL: 'opencode-go/deepseek-v4.1-flash',
      AGENT_LLM_API_KEY: 'sk-omni',
    })
    expect(out).toEqual({
      baseUrl: 'https://z8igkn15sfyw.share.zrok.io/v1',
      apiKey: 'sk-omni',
      model: 'opencode-go/deepseek-v4.1-flash',
      headers: {},
      source: 'env',
    })
  })

  it('keyless gateway: missing API key falls back to the placeholder, model to the default', () => {
    const out = resolveLlmEndpoint(BUILTIN, {
      AGENT_LLM_BASE_URL: 'https://gw.example/v1',
    })
    expect(out).not.toBeNull()
    expect(out!.apiKey).toBe('omniroute-keyless') // OpenAI SDK needs SOME string
    expect(out!.model).toBe(DEFAULT_AGENT_MODEL)
    expect(out!.headers).toEqual({})
    expect(out!.source).toBe('env')
  })

  it('trailing slashes are stripped and whitespace-only values count as unset', () => {
    const out = resolveLlmEndpoint(BUILTIN, {
      AGENT_LLM_BASE_URL: '  https://gw.example/v1///  ',
      AGENT_LLM_MODEL: '   ',
      AGENT_LLM_API_KEY: '  ',
    })
    expect(out!.baseUrl).toBe('https://gw.example/v1')
    // model/key were whitespace-only → treated as unset
    expect(out!.model).toBe(DEFAULT_AGENT_MODEL)
    expect(out!.apiKey).toBe('omniroute-keyless')
  })
})

describe('OMNI-1 resolveLlmEndpoint — built-in gateway (legacy + model swap)', () => {
  it('no env: bit-for-bit the legacy behavior — glm-4.6 + Z identity headers', () => {
    const out = resolveLlmEndpoint(BUILTIN, {})
    expect(out).toEqual({
      baseUrl: BUILTIN.baseUrl,
      apiKey: BUILTIN.apiKey,
      model: 'glm-4.6',
      headers: {
        'X-Z-AI-From': 'Z',
        'X-Chat-Id': 'chat-1',
        'X-User-Id': 'user-1',
        'X-Token': 'tok-1',
      },
      source: 'builtin',
    })
  })

  it('model-only override: gateway + headers stay, model id swaps', () => {
    const out = resolveLlmEndpoint(BUILTIN, {
      AGENT_LLM_MODEL: 'glm-4.7-air',
    })
    expect(out!.baseUrl).toBe(BUILTIN.baseUrl)
    expect(out!.apiKey).toBe(BUILTIN.apiKey)
    expect(out!.model).toBe('glm-4.7-air')
    expect(out!.source).toBe('builtin')
    expect(out!.headers['X-Z-AI-From']).toBe('Z')
    expect(out!.headers['X-Chat-Id']).toBe('chat-1')
  })

  it('optional Z identity fields are omitted from headers when absent', () => {
    const out = resolveLlmEndpoint(
      { baseUrl: 'https://builtin.internal/v1', apiKey: 'k' },
      {},
    )
    expect(out!.headers).toEqual({ 'X-Z-AI-From': 'Z' })
  })

  it('null cfg with no env override → null (route errors cleanly)', () => {
    expect(resolveLlmEndpoint(null, {})).toBeNull()
  })

  it('null cfg is rescued by an env base URL (omniroute-only deployment)', () => {
    const out = resolveLlmEndpoint(null, {
      AGENT_LLM_BASE_URL: 'https://z8igkn15sfyw.share.zrok.io/v1',
      AGENT_LLM_MODEL: 'opencode-go/deepseek-v4.1-flash',
    })
    expect(out).not.toBeNull()
    expect(out!.baseUrl).toBe('https://z8igkn15sfyw.share.zrok.io/v1')
    expect(out!.model).toBe('opencode-go/deepseek-v4.1-flash')
    expect(out!.source).toBe('env')
  })
})
