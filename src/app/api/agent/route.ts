/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { allTools } from '@/lib/agent/tools'
import { SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { runAgentTurn, type ChatMessage, type TurnEvent } from '@/lib/agent/loop'
import { requireApiSession } from '@/lib/auth/api-guard'

export const maxDuration = 60

/* SPEC-M10: the system prompt lives in src/lib/agent/prompt.ts — versioned
 * (PROMPT_VERSION), stamped on the SSE start event + every AgentTurn row
 * (the stamping itself lives in src/lib/agent/loop.ts since M30).
 * The full prompt contract: docs/CONTEXT/specs/SPEC-M10.md §2-C1/C2. */

async function loadZaiConfig(): Promise<any | null> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')
    const candidates = [
      path.join(process.cwd(), '.z-ai-config'),
      path.join(os.homedir(), '.z-ai-config'),
      '/etc/.z-ai-config',
    ]
    for (const p of candidates) {
      try {
        const txt = await fs.readFile(p, 'utf-8')
        const cfg = JSON.parse(txt)
        if (cfg.baseUrl && cfg.apiKey) return cfg
      } catch {}
    }
    return null
  } catch {
    return null
  }
}

function buildToolSpecs() {
  // OpenAI function-calling schema — convert Zod schemas to JSON Schema.
  // Strip the $schema key which OpenAI doesn't accept.
  return allTools.map((t) => {
    const jsonSchema = zodToJsonSchema(t.schema as any, 'parameters') as any
    // zod-to-json-schema adds $schema; OpenAI rejects it
    if (jsonSchema.$schema) delete jsonSchema.$schema
    return {
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: jsonSchema,
      },
    }
  })
}

export async function POST(req: Request) {
  // SPEC-M7 Wave B — guarded: no session → 401 JSON (the SSE stream never
  // starts). The session user becomes the AgentTurn.userId + the actor
  // threaded into execute() so approval plans record who will commit.
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const actor = { userId: guard.user.id, email: guard.user.email, name: guard.user.name }
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // SSE disconnect guard: when the browser navigates away / aborts the
      // fetch mid-stream, the controller is CLOSED and every enqueue/close
      // throws ("Controller is already closed") — found by the M12 E2E suite
      // (specs navigate after their assertions; the abort raced the stream).
      // send() swallows that, flags the client gone, and the loop unwinds
      // instead of logging a fake error and burning further LLM steps.
      let clientGone = false
      const send = (event: Record<string, unknown>): boolean => {
        if (clientGone) return false
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event as never)}\n\n`))
          return true
        } catch {
          clientGone = true
          return false
        }
      }
      const safeClose = () => {
        try {
          controller.close()
        } catch {
          /* already closed by the disconnect */
        }
      }
      try {
        const body = await req.json()
        const incoming: ChatMessage[] = body.messages || []
        const lastUser = [...incoming].reverse().find((m) => m.role === 'user')
        const userText =
          typeof lastUser?.content === 'string' ? lastUser.content : ''

        const cfg = await loadZaiConfig()
        if (!cfg) {
          send({ type: 'error', error: 'ZAI config not found' })
          safeClose()
          return
        }

        const client = new OpenAI({
          baseURL: cfg.baseUrl,
          apiKey: cfg.apiKey,
          defaultHeaders: {
            'X-Z-AI-From': 'Z',
            ...(cfg.chatId ? { 'X-Chat-Id': cfg.chatId } : {}),
            ...(cfg.userId ? { 'X-User-Id': cfg.userId } : {}),
            ...(cfg.token ? { 'X-Token': cfg.token } : {}),
          },
        })

        const tools = buildToolSpecs()
        const messages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...incoming
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: typeof m.content === 'string' ? m.content : '',
            })),
        ]

        // SPEC-M30: the loop (events, tool execution, approvalId stamping,
        // audit rows) lives in src/lib/agent/loop.ts.
        await runAgentTurn({
          client,
          tools,
          messages,
          actor,
          userText,
          send: send as (ev: TurnEvent) => boolean,
        })
      } catch (err: any) {
        console.error('[/api/agent] error:', err)
        send({
          type: 'error',
          error: err?.message || 'Internal error',
        })
      } finally {
        safeClose()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
