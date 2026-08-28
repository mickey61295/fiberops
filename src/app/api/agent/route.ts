/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { allTools, getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION, SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { db } from '@/lib/db'
import { requireApiSession } from '@/lib/auth/api-guard'

export const maxDuration = 60

/* SPEC-M10: the system prompt lives in src/lib/agent/prompt.ts — versioned
 * (PROMPT_VERSION), stamped on the SSE start event + every AgentTurn row.
 * The full prompt contract: docs/CONTEXT/specs/SPEC-M10.md §2-C1/C2. */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: any[]
  tool_call_id?: string
  name?: string
}

interface TurnEvent {
  type:
    | 'start'
    | 'step-start'
    | 'text-start'
    | 'text-delta'
    | 'text-end'
    | 'tool-call-start'
    | 'tool-call-args-delta'
    | 'tool-call-end'
    | 'tool-result'
    | 'step-end'
    | 'finish'
    | 'error'
  [key: string]: any
}

const MAX_STEPS = 12

function encodeEvent(ev: TurnEvent): string {
  return `data: ${JSON.stringify(ev)}\n\n`
}

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

function normalizeArgs(args: any): any {
  if (args === null || typeof args !== 'object') return args
  const out: any = Array.isArray(args) ? [] : {}
  for (const [key, val] of Object.entries(args)) {
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          out[key] = JSON.parse(trimmed)
          continue
        } catch {}
      }
      out[key] = val
    } else if (typeof val === 'object') {
      out[key] = normalizeArgs(val)
    } else {
      out[key] = val
    }
  }
  return out
}

// LLMs sometimes pass numbers as strings ("4.5") or booleans as "true".
// After a zod failure, patch only the flagged paths and re-validate.
function setByPath(obj: any, path: (string | number)[], value: any) {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]
    cur = cur?.[k as any]
  }
  const last = path[path.length - 1]
  if (cur != null && last !== undefined) {
    ;(cur as any)[last as any] = value
  }
}

function getByPath(obj: any, path: (string | number)[]): any {
  let cur = obj
  for (const k of path) cur = cur?.[k as any]
  return cur
}

function parseWithCoercion(schema: any, args: any): { ok: true; value: any } | { ok: false; error: any } {
  try {
    return { ok: true, value: schema.parse(args) }
  } catch (first: any) {
    const issues = first?.issues || []
    if (issues.length === 0) return { ok: false, error: first }
    let fixed: any
    try {
      fixed = JSON.parse(JSON.stringify(args))
    } catch {
      return { ok: false, error: first }
    }
    let applied = 0
    for (const issue of issues) {
      const path: (string | number)[] = issue.path || []
      if (path.length === 0) continue
      const current = getByPath(fixed, path)
      if (issue.code === 'invalid_type' && (issue.expected === 'number' || issue.expected === 'integer')) {
        if (typeof current === 'string' && current.trim() !== '' && Number.isFinite(Number(current))) {
          setByPath(fixed, path, Number(current))
          applied++
        }
      } else if (issue.code === 'invalid_type' && issue.expected === 'boolean') {
        if (current === 'true' || current === 'false') {
          setByPath(fixed, path, current === 'true')
          applied++
        }
      }
    }
    if (applied === 0) return { ok: false, error: first }
    try {
      return { ok: true, value: schema.parse(fixed) }
    } catch (second: any) {
      return { ok: false, error: second }
    }
  }
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
      let step = 0
      try {
        const body = await req.json()
        const incoming: ChatMessage[] = body.messages || []
        const lastUser = [...incoming].reverse().find((m) => m.role === 'user')
        const userText =
          typeof lastUser?.content === 'string' ? lastUser.content : ''

        const cfg = await loadZaiConfig()
        if (!cfg) {
          controller.enqueue(
            encoder.encode(encodeEvent({ type: 'error', error: 'ZAI config not found' })),
          )
          controller.close()
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

        // SPEC-M10 C2: every stream opens with the active prompt version
        controller.enqueue(
          encoder.encode(encodeEvent({ type: 'start', promptVersion: PROMPT_VERSION })),
        )

        // Manual agent loop
        while (step < MAX_STEPS) {
          step++
          controller.enqueue(
            encoder.encode(encodeEvent({ type: 'step-start', step })),
          )

          const completion = await client.chat.completions.create({
            model: 'glm-4.6',
            messages: messages as any,
            tools: tools as any,
            tool_choice: 'auto',
            temperature: 0.2,
            stream: false,
          })

          const choice = completion.choices?.[0]
          if (!choice) {
            controller.enqueue(
              encoder.encode(
                encodeEvent({ type: 'error', error: 'No completion choice' }),
              ),
            )
            break
          }
          const msg = choice.message as any

          // 1. Stream any text content
          if (msg.content) {
            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: 'text-start',
                  id: `text-${step}`,
                  step,
                }),
              ),
            )
            // Emit in chunks for nicer UX
            const chunks = msg.content.match(/.{1,4}/g) || [msg.content]
            for (const chunk of chunks) {
              controller.enqueue(
                encoder.encode(
                  encodeEvent({
                    type: 'text-delta',
                    id: `text-${step}`,
                    delta: chunk,
                  }),
                ),
              )
            }
            controller.enqueue(
              encoder.encode(
                encodeEvent({ type: 'text-end', id: `text-${step}` }),
              ),
            )
            messages.push({ role: 'assistant', content: msg.content })
          }

          // 2. Process tool calls
          const toolCalls = msg.tool_calls || []
          if (toolCalls.length === 0) {
            // No more tool calls — we're done
            controller.enqueue(
              encoder.encode(
                encodeEvent({ type: 'step-end', step, finishReason: 'stop' }),
              ),
            )
            break
          }

          // Append the assistant message with tool_calls to history
          messages.push({
            role: 'assistant',
            content: msg.content ?? '',
            tool_calls: toolCalls,
          })

          // 3. Execute each tool call and stream back the result
          for (const tc of toolCalls) {
            const toolName = tc.function.name
            const t = getTool(toolName)
            const rawArgs = JSON.parse(tc.function.arguments || '{}')
            const args = normalizeArgs(rawArgs)

            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: 'tool-call-start',
                  toolCallId: tc.id,
                  toolName,
                  args,
                  isWrite: t?.isWrite ?? false,
                }),
              ),
            )

            let result: any
            if (!t) {
              result = { error: `Unknown tool: ${toolName}` }
            } else {
              // Validate arguments against the tool's zod schema (with type
              // coercion for common LLM string/number mixups) so the model
              // gets a clean, actionable error instead of a runtime crash.
              const parsed = parseWithCoercion(t.schema, args)
              if (!parsed.ok) {
                const issues = (parsed.error?.issues || [])
                  .map((i: any) => `${(i.path || []).join('.') || '(root)'}: ${i.message}`)
                  .join('; ')
                result = { error: `Invalid arguments for ${toolName}: ${issues || parsed.error?.message || 'validation failed'}` }
              } else {
                try {
                  result = await t.execute(parsed.value, actor)
                  // Persist audit log — SPEC-M7 Wave B: userId = the logged-in
                  // user (was hardcoded 'admin')
                  await db.agentTurn
                    .create({
                      data: {
                        prompt: userText,
                        plan: result.plan
                          ? JSON.stringify(result.plan)
                          : null,
                        toolCalls: JSON.stringify([
                          { name: toolName, args: parsed.value, isWrite: t.isWrite },
                        ]),
                        result: (
                          result.text ||
                          JSON.stringify(result.json || '')
                        ).slice(0, 2000),
                        approved: !t.isWrite,
                        userId: actor.userId,
                        promptVersion: PROMPT_VERSION, // SPEC-M10 C2 — version every turn
                      },
                    })
                    .catch(() => {})
                } catch (err: any) {
                  result = { error: err.message || String(err) }
                }
              }
            }

            const toolOutput = {
              text: result.text,
              json: result.json,
              plan: result.plan,
              isWrite: result.isWrite ?? t?.isWrite,
              toolName,
              hasCommitFn: !!result.commit,
              error: result.error,
            }

            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: 'tool-call-end',
                  toolCallId: tc.id,
                  toolName,
                  args,
                  output: toolOutput,
                }),
              ),
            )

            // 4. Send tool result back to the model in OpenAI format.
            // extract_document results carry whole documents — allow much
            // larger payloads than regular tool results.
            const resultLimit = toolName === 'extract_document' ? 80000 : 8000
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(toolOutput).slice(0, resultLimit),
            })
          }

          controller.enqueue(
            encoder.encode(
              encodeEvent({
                type: 'step-end',
                step,
                finishReason: 'tool-calls',
              }),
            ),
          )
        }

        controller.enqueue(encoder.encode(encodeEvent({ type: 'finish' })))
      } catch (err: any) {
        console.error('[/api/agent] error:', err)
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: 'error',
              error: err?.message || 'Internal error',
            }),
          ),
        )
      } finally {
        controller.close()
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
