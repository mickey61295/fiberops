/* eslint-disable @typescript-eslint/no-explicit-any */
/* SPEC-M30 (QoL1 D-1/D-2/D-3) — the manual agent loop, extracted from
 * src/app/api/agent/route.ts so it is unit-testable (injectable LLM client
 * + persist hook) and single-sourced. The route keeps only stream plumbing:
 * guard → config → OpenAI client → ReadableStream(send/safeClose) → this.
 *
 * Changes vs the pre-M30 inline loop (frozen in SPEC-M30 §2-B):
 *  1. parseWithCoercion + normalizeArgs are IMPORTED from
 *     ./parse-with-coercion (the 60-line inline duplicate is deleted; the
 *     module header's "shared by both doors" contract is finally true).
 *  2. tool-call events carry the PARSED args (what the proposal actually
 *     executed) so the approval door round-trips identical inputs.
 *  3. Malformed tool-args JSON no longer kills the turn — the model gets an
 *     error tool-result and self-corrects (the unknown-tool pattern).
 *  4. A completion with BOTH content and tool_calls pushes ONE assistant
 *     message (the old loop pushed it twice — duplicated narration in the
 *     model's own context).
 *  5. Write tools with a plan + commit get a crypto-random approvalId
 *     stamped into plan.approvalId and persisted on the AgentTurn row —
 *     the approve door verifies it (QoL1 D-3 correlation).
 */

import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { getTool, type AgentActor } from './tools'
import { normalizeArgs, parseWithCoercion } from './parse-with-coercion'
import { PROMPT_VERSION } from './prompt'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: any[]
  tool_call_id?: string
  name?: string
}

/** The minimal LLM surface the loop needs — the OpenAI client satisfies it;
 * tests inject a fake. */
export interface LlmClient {
  chat: {
    completions: {
      create: (params: any) => Promise<any>
    }
  }
}

export interface TurnEvent {
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

export const MAX_STEPS = 12

/** What gets persisted per executed tool call. Injected in tests. */
export interface TurnAuditRow {
  prompt: string
  plan: string | null
  toolCalls: string
  result: string
  approved: boolean
  userId: string
  promptVersion: string
  approvalId?: string
}

export interface RunAgentTurnOptions {
  client: LlmClient
  /** OpenAI function-calling tool specs (built by the route). */
  tools: any[]
  /** Full outgoing message list (system + user/assistant history). */
  messages: ChatMessage[]
  actor: AgentActor
  /** The raw user text of this turn (audit rows store it). */
  userText: string
  /** SSE send; returns false when the client is gone (the loop unwinds). */
  send: (event: TurnEvent) => boolean
  maxSteps?: number
  /** Persist hook — default writes the real AgentTurn row. */
  persistTurn?: (row: TurnAuditRow) => Promise<void>
}

async function persistAgentTurn(row: TurnAuditRow): Promise<void> {
  await db.agentTurn.create({ data: row }).catch(() => {})
}

export async function runAgentTurn(opts: RunAgentTurnOptions): Promise<void> {
  const {
    client,
    tools,
    messages,
    actor,
    userText,
    send,
    maxSteps = MAX_STEPS,
    persistTurn = persistAgentTurn,
  } = opts

  let step = 0

  // SPEC-M10 C2: every stream opens with the active prompt version
  send({ type: 'start', promptVersion: PROMPT_VERSION })

  while (step < maxSteps) {
    step++
    if (!send({ type: 'step-start', step })) break // client gone — stop burning LLM steps

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
      send({ type: 'error', error: 'No completion choice' })
      break
    }
    const msg = choice.message as any
    const toolCalls = msg.tool_calls || []

    // 1. Emit any text content. (M30 fix #4: the events stream exactly as
    // before — narration before tool calls is USER-VISIBLE and must survive;
    // the fix is in the HISTORY below: a text-only push happens ONLY when
    // there are no tool calls, otherwise the content rides the tool_calls
    // message — ONE assistant message per completion, never two.)
    if (msg.content) {
      send({ type: 'text-start', id: `text-${step}`, step })
      const chunks = msg.content.match(/.{1,4}/g) || [msg.content]
      for (const chunk of chunks) {
        if (!send({ type: 'text-delta', id: `text-${step}`, delta: chunk })) break
      }
      send({ type: 'text-end', id: `text-${step}` })
    }

    if (toolCalls.length === 0) {
      messages.push({ role: 'assistant', content: msg.content })
      // No more tool calls — we're done
      send({ type: 'step-end', step, finishReason: 'stop' })
      break
    }

    // The assistant message carrying the tool calls (M30 fix #4: content
    // rides THIS message — never a second, text-only duplicate).
    messages.push({
      role: 'assistant',
      content: msg.content ?? '',
      tool_calls: toolCalls,
    })

    // 2. Execute each tool call and stream back the result
    for (const tc of toolCalls) {
      const toolName = tc.function?.name ?? ''
      const t = getTool(toolName)

      // M30 fix #3 (QoL1 D-2): malformed tool-args JSON must not kill the
      // turn. Feed the failure back to the model as a tool result (the
      // unknown-tool pattern) and continue.
      let rawArgs: any
      try {
        rawArgs = JSON.parse(tc.function?.arguments || '{}')
      } catch (err: any) {
        const parseError = `Invalid JSON arguments for ${toolName}: ${err?.message || String(err)}`
        send({
          type: 'tool-call-start',
          toolCallId: tc.id,
          toolName,
          args: null,
          isWrite: t?.isWrite ?? false,
        })
        send({
          type: 'tool-call-end',
          toolCallId: tc.id,
          toolName,
          args: null,
          output: { error: parseError, toolName },
        })
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: parseError }).slice(0, 8000),
        })
        continue
      }
      const args = normalizeArgs(rawArgs)

      // M30 fix #1 (QoL1 D-1): validate + coerce BEFORE execution; the
      // events carry the PARSED args so the approval door round-trips
      // exactly what the proposal executed.
      const parsed = t ? parseWithCoercion(t.schema, args) : null
      const eventArgs = parsed?.ok ? parsed.value : args

      send({
        type: 'tool-call-start',
        toolCallId: tc.id,
        toolName,
        args: eventArgs,
        isWrite: t?.isWrite ?? false,
      })

      let result: any
      if (!t) {
        result = { error: `Unknown tool: ${toolName}` }
      } else if (!parsed?.ok) {
        const issues = (parsed?.error?.issues || [])
          .map((i: any) => `${(i.path || []).join('.') || '(root)'}: ${i.message}`)
          .join('; ')
        result = { error: `Invalid arguments for ${toolName}: ${issues || parsed?.error?.message || 'validation failed'}` }
      } else {
        try {
          result = await t.execute(parsed.value, actor)
        } catch (err: any) {
          result = { error: err.message || String(err) }
        }
      }

      // M30 fix #5 (QoL1 D-3): stamp the correlation token on write plans
      // that carry a commit fn — the panel round-trips it and the approve
      // door verifies it against the persisted row.
      const needsApproval = !!(t?.isWrite && result?.plan && result?.commit)
      const stampedPlan = needsApproval
        ? { ...result.plan, approvalId: result.plan.approvalId ?? randomUUID() }
        : result?.plan

      if (needsApproval || (t && parsed?.ok)) {
        // Persist audit log — SPEC-M7 Wave B: userId = the logged-in user.
        // (Read tools and non-commit writes keep the pre-M30 row shape;
        // approvalId is additive and only set for approval-carrying plans.)
        await persistTurn({
          prompt: userText,
          plan: stampedPlan ? JSON.stringify(stampedPlan) : null,
          toolCalls: JSON.stringify([
            { name: toolName, args: eventArgs, isWrite: t?.isWrite ?? false },
          ]),
          result: (result.error ? 'ERROR: ' + result.error : result.text || JSON.stringify(result.json || '')).slice(0, 2000),
          approved: !t?.isWrite,
          userId: actor.userId,
          promptVersion: PROMPT_VERSION, // SPEC-M10 C2 — version every turn
          ...(stampedPlan?.approvalId ? { approvalId: stampedPlan.approvalId } : {}),
        })
      }

      const toolOutput = {
        text: result.text,
        json: result.json,
        plan: stampedPlan,
        isWrite: result.isWrite ?? t?.isWrite,
        toolName,
        hasCommitFn: !!result.commit,
        error: result.error,
      }

      send({
        type: 'tool-call-end',
        toolCallId: tc.id,
        toolName,
        args: eventArgs,
        output: toolOutput,
      })

      // 3. Send tool result back to the model in OpenAI format.
      // extract_document results carry whole documents — allow much
      // larger payloads than regular tool results.
      const resultLimit = toolName === 'extract_document' ? 80000 : 8000
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolOutput).slice(0, resultLimit),
      })
    }

    send({
      type: 'step-end',
      step,
      finishReason: 'tool-calls',
    })
  }

  send({ type: 'finish' })
}
