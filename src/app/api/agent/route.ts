/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { allTools, getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION, SYSTEM_PROMPT } from '@/lib/agent/prompt'
// qol1-reconcile (SPEC-QoL1 D-1) — the canonical coercion stack, shared by
// BOTH doors (this proposal door AND /api/agent/approve). The M36-era inline
// duplicate lived here; it moved back to its designed home verbatim.
import { normalizeArgs, parseWithCoercion } from '@/lib/agent/parse-with-coercion'
// CHAT-02 (Phase-6B Batch 2) — the dynamic context line: today IST, user,
// activeFinYear(), active screen + docNo, godown roster.
import { buildDynamicContext } from '@/lib/agent/context'
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

/** CHAT-10 (Phase-6B Batch 2) — a tool result the model can still PARSE.
 * The old `JSON.stringify(...).slice(0, 8000)` amputated long row arrays
 * mid-array (invalid JSON tail) and silently dropped every row past the
 * byte budget. Here rows are trimmed one-by-one (arrays only) until the
 * payload fits, and a `truncated: true` marker + row count is stamped on
 * the payload so the model KNOWS it is looking at a partial list. */
function boundedToolContent(output: Record<string, unknown>, limit: number): string {
  let payload = JSON.stringify(output)
  if (payload.length <= limit) return payload
  const trimmed: Record<string, unknown> = { ...output, truncated: true }
  const json = output.json
  if (Array.isArray(json)) {
    // drop rows from the END until it fits (or nothing is left)
    let keep = json.length
    while (keep > 0) {
      keep--
      trimmed.json = json.slice(0, keep)
      trimmed.rowsShown = keep
      payload = JSON.stringify(trimmed)
      if (payload.length <= limit) return payload
    }
  }
  // non-array or still too large: fall back to the byte slice (last resort —
  // at least the marker is present in the head of the payload)
  return JSON.stringify(trimmed).slice(0, limit)
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
          controller.enqueue(encoder.encode(encodeEvent(event as never)))
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
        // CHAT-02 (Phase-6B Batch 2, SPEC-M38 §1) — the brain used to get
        // SYSTEM_PROMPT + verbatim history and NOTHING else: no date, no user,
        // no FY, no screen (route.ts:231-239 was context-blind while the prompt
        // demanded next-step awareness). One dynamic line now rides after the
        // system prompt; it replaces the hard-coded '26-27' + G1–G3 prose the
        // prompt used to carry (CHAT-11).
        const dynamicLine = await buildDynamicContext(body.screen, {
          name: guard.user.name,
          email: guard.user.email,
          role: (guard.user as any).role,
        })
        const messages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: dynamicLine },
          ...incoming
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: typeof m.content === 'string' ? m.content : '',
            })),
        ]

        // SPEC-M10 C2: every stream opens with the active prompt version
        send({ type: 'start', promptVersion: PROMPT_VERSION })

        // Manual agent loop
        let exhaustedSteps = false // CHAT-12 — visible MAX_STEPS exhaustion
        while (step < MAX_STEPS) {
          step++
          if (!send({ type: 'step-start', step })) break // client gone — stop burning LLM steps

          // HFX-14 (Phase-6B Batch 0) — REAL streaming. The old call was
          // stream:false + a fake 4-char regex chunker whose dot-class NEVER
          // matched newline — every \n in every assistant message was deleted
          // in transport (owner issue 1, root layer 1).
          // Now: stream:true, content deltas pass through VERBATIM as they
          // arrive, and tool_call fragments are stitched by index across
          // chunks (id / function.name / function.arguments arrive split).
          const completion = await client.chat.completions.create({
            model: 'glm-4.6',
            messages: messages as any,
            tools: tools as any,
            tool_choice: 'auto',
            temperature: 0.2,
            stream: true,
          })

          let textContent = ''
          let textStarted = false
          const toolCallAcc = new Map<
            number,
            { id: string; index: number; type: 'function'; function: { name: string; arguments: string } }
          >()
          for await (const chunk of completion) {
            const delta = (chunk as any).choices?.[0]?.delta
            if (!delta) continue
            if (delta.content) {
              if (!textStarted) {
                send({ type: 'text-start', id: `text-${step}`, step })
                textStarted = true
              }
              // newline-faithful passthrough — no re-chunking
              send({ type: 'text-delta', id: `text-${step}`, delta: delta.content })
              textContent += delta.content
            }
            for (const tc of delta.tool_calls || []) {
              const acc =
                toolCallAcc.get(tc.index) ??
                { id: '', index: tc.index, type: 'function' as const, function: { name: '', arguments: '' } }
              if (tc.id) acc.id = tc.id
              if (tc.function?.name) acc.function.name += tc.function.name
              if (tc.function?.arguments) acc.function.arguments += tc.function.arguments
              toolCallAcc.set(tc.index, acc)
            }
          }
          if (textStarted) send({ type: 'text-end', id: `text-${step}` })

          const msg = {
            content: textContent || null,
            tool_calls: [...toolCallAcc.values()].filter((t) => t.function.name),
          } as any

          // 1. History: text content (streamed above)
          if (msg.content) {
            messages.push({ role: 'assistant', content: msg.content })
          }

          // 2. Process tool calls
          const toolCalls = msg.tool_calls || []
          if (toolCalls.length === 0) {
            // No more tool calls — we're done
            send({ type: 'step-end', step, finishReason: 'stop' })
            break
          }
          // CHAT-12 — the loop is about to exit on the step budget with the
          // model STILL asking for tools: surface it, never truncate silently.
          if (step >= MAX_STEPS) exhaustedSteps = true

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
            // QoL1 D-2 (qol1-reconcile) — malformed tool-call JSON must NEVER
            // kill the turn. The M36-era code parsed tc.function.arguments
            // UNGUARDED: a truncated generation threw past the per-call try
            // into the outer catch, aborting the whole SSE turn with zero
            // recovery. Now the parse failure becomes an error TOOL RESULT the
            // model sees and can retry from — the loop continues.
            let args: any
            try {
              args = normalizeArgs(JSON.parse(tc.function.arguments || '{}'))
            } catch (err: any) {
              const parseError = `Malformed JSON arguments for ${toolName} — the model output was truncated or invalid. Retry the tool call with clean JSON.`
              console.warn('[/api/agent] D-2 guard:', toolName, err?.message || err)
              send({
                type: 'tool-call-start',
                toolCallId: tc.id,
                toolName,
                args: {},
                isWrite: t?.isWrite ?? false,
              })
              send({
                type: 'tool-call-end',
                toolCallId: tc.id,
                toolName,
                args: {},
                output: { error: parseError, toolName, isWrite: t?.isWrite ?? false },
                turnId: null, // no AgentTurn row was written — nothing to approve
              })
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ error: parseError }),
              })
              continue
            }

            send({
              type: 'tool-call-start',
              toolCallId: tc.id,
              toolName,
              args,
              isWrite: t?.isWrite ?? false,
            })

            let result: any
            // CHAT-06 — the AgentTurn row id rides the tool-call-end event so
            // the panel's Approve posts { turnId }: the route then executes the
            // STORED plan (never a re-planned mutant).
            let turnId: string | null = null
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
                  // user (was hardcoded 'admin'). CHAT-06: capture the row id.
                  const turnRow = await db.agentTurn
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
                    .catch(() => null)
                  turnId = turnRow?.id ?? null
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

            send({
              type: 'tool-call-end',
              toolCallId: tc.id,
              toolName,
              args,
              output: toolOutput,
              turnId, // CHAT-06 — approve-by-id
            })

            // 4. Send tool result back to the model in OpenAI format.
            // extract_document results carry whole documents — allow much
            // larger payloads than regular tool results.
            // CHAT-10 — the 8K slice used to amputate the JSON silently (rows
            // dropped mid-array → an unparseable tail the model still tried to
            // read). Now rows are TRIMMED and the payload is marked truncated
            // before any byte-slicing happens.
            const resultLimit = toolName === 'extract_document' ? 80000 : 8000
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: boundedToolContent(toolOutput, resultLimit),
            })
          }

          send({
            type: 'step-end',
            step,
            finishReason: 'tool-calls',
          })
        }

        // CHAT-12 — MAX_STEPS exhaustion is VISIBLE (the old loop fell
        // through to finish and the panel showed a normal end after a silent
        // truncation mid-tool-chain).
        if (exhaustedSteps) {
          send({
            type: 'error',
            error: `Step budget exhausted (${MAX_STEPS} steps) — the task stopped mid-way. Ask me to continue with the remaining part.`,
          })
        }
        send({ type: 'finish' })
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
