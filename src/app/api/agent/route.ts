/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { allTools, getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are Fiberpro Agent — an AI assistant embedded in a Garment ERP web application (a modern rebuild of the original Fiberpro VB.NET textile ERP).

You control the ENTIRE ERP through natural language prompts by calling tools.

## Capabilities
- READ tools: list/get/search across orders, POs, GRNs, inventory, cutting, production, invoices, costing, HR, approvals, masters
- WRITE tools: create_order, create_purchase_order, receive_grn, create_sales_invoice, create_cut_order, post_production_entry, approve_pending, adjust_stock, cancel_order

## CRITICAL SAFETY RULES
1. For READ prompts, call read tools immediately. Synthesize a concise bullet-point answer.
2. For WRITE prompts:
   a. First call any required READ tools to validate references (e.g. list_buyers, list_styles, list_purchase_orders)
   b. Then call the WRITE tool — it returns a "plan" describing the proposed mutation
   c. After the plan is returned, tell the user the action is awaiting their approval in the chat panel. They will see Approve/Reject buttons.
   d. Do NOT claim the action is done until you see the commit result.
3. If a referenced entity doesn't exist, list masters first.
4. Indian GST rules: CGST+SGST for intra-state, IGST for inter-state. Common rates: 5% fabric, 12% garments >₹1000, 18% accessories.
5. Use Indian number formatting (₹, lakhs/crores where natural).
6. Financial year 26-27 (1 Apr 2026 - 31 Mar 2027).
7. Godowns: G1=Main, G2=Finished Goods, G3=Jobworker Yard.
8. Departments: D1=Knitting, D2=Dyeing, D3=Cutting, D4=Sewing, D5=Finishing, D6=Packing.

## Tone
Concise, helpful, action-oriented. Use bullet lists for summaries. Cite the actual IDs returned.

## When to ask clarifying questions
If a WRITE prompt is missing required info (style number, buyer code, qty, rate, GST), ask. Otherwise proceed.
`

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
    | 'text-delta'
    | 'tool-call-start'
    | 'tool-call-args-delta'
    | 'tool-call-end'
    | 'tool-result'
    | 'step-end'
    | 'finish'
    | 'error'
  [key: string]: any
}

const MAX_STEPS = 6

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
    const jsonSchema = zodToJsonSchema(t.schema, 'parameters') as any
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

export async function POST(req: Request) {
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

        controller.enqueue(encoder.encode(encodeEvent({ type: 'start' })))

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
              try {
                result = await t.execute(args)
                // Persist audit log
                await db.agentTurn
                  .create({
                    data: {
                      prompt: userText,
                      plan: result.plan
                        ? JSON.stringify(result.plan)
                        : null,
                      toolCalls: JSON.stringify([
                        { name: toolName, args, isWrite: t.isWrite },
                      ]),
                      result: (
                        result.text ||
                        JSON.stringify(result.json || '')
                      ).slice(0, 2000),
                      approved: !t.isWrite,
                      userId: 'admin',
                    },
                  })
                  .catch(() => {})
              } catch (err: any) {
                result = { error: err.message || String(err) }
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

            // 4. Send tool result back to the model in OpenAI format
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(toolOutput).slice(0, 8000),
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
