/**
 * SPEC-M30 — first unit coverage of the agent loop itself
 * (src/lib/agent/loop.ts, extracted from the route for exactly this). The
 * LLM client is a scripted fake; persistTurn is an injected collector (no
 * DB writes from the loop itself). Tool execution runs the REAL registry
 * (reads / dry plans only).
 *
 * Pins (the frozen SPEC-M30 §3.1 set):
 *   - D-2 malformed tool-args JSON → the turn SURVIVES, no `error` event,
 *     the model receives the failure as a tool result (self-correct path);
 *   - D-1 parsed args in events — a string `limit` coerces to a number and
 *     the events + audit row carry the PARSED value (not the raw string);
 *   - E one assistant message per completion (the pre-M30 double-push bug);
 *   - D-3 approvalId stamped into the plan + persisted on the turn row;
 *   - clientGone unwind (send() false stops burning LLM steps);
 *   - maxSteps budget exit; unknown-tool error feed; start event version.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { runAgentTurn, MAX_STEPS, type TurnEvent, type TurnAuditRow, type LlmClient, type ChatMessage } from '../../src/lib/agent/loop'
import { PROMPT_VERSION } from '../../src/lib/agent/prompt'
import { db } from '@/lib/db'

const stamp = Date.now()

/** Scripted fake: returns completions[i] (last one repeats); records a
 * SNAPSHOT of every create() call's messages (the loop pushes into the same
 * array reference — a live recording would show the final state at every
 * call, not what the model saw at call time). */
function fakeClient(completions: any[], calls: any[] = []): LlmClient {
  let i = 0
  return {
    chat: {
      completions: {
        create: async (params: any) => {
          calls.push({
            ...params,
            messages: (params.messages || []).map((m: any) => ({ ...m })),
          })
          const c = completions[Math.min(i, completions.length - 1)]
          i++
          return { choices: [{ message: c }] }
        },
      },
    },
  }
}

const actor = { userId: 'agent-loop-test-user', email: 'loop@fiberpro.local', name: 'Loop Test' }

function harness(completions: any[], opts: { maxSteps?: number; sendFalseAfter?: number } = {}) {
  const events: TurnEvent[] = []
  const rows: TurnAuditRow[] = []
  const calls: any[] = []
  let sent = 0
  const send = (ev: TurnEvent): boolean => {
    sent++
    events.push(ev)
    return opts.sendFalseAfter === undefined ? true : sent <= opts.sendFalseAfter
  }
  const messages: ChatMessage[] = [{ role: 'system', content: 'sys' }, { role: 'user', content: 'do it' }]
  const run = () =>
    runAgentTurn({
      client: fakeClient(completions, calls),
      tools: [],
      messages,
      actor,
      userText: 'do it',
      send,
      ...(opts.maxSteps ? { maxSteps: opts.maxSteps } : {}),
      persistTurn: async (row) => {
        rows.push(row)
      },
    })
  return { events, rows, calls, messages, run }
}

const textCompletion = (content: string) => ({ content, tool_calls: [] })
const toolCompletion = (calls: Array<{ id: string; name: string; args: string }>, content?: string) => ({
  content: content ?? null,
  tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.args } })),
})

afterAll(async () => {
  await db.$disconnect()
})

describe('runAgentTurn — SPEC-M30 correctness pins', () => {
  it('opens the stream with the active PROMPT_VERSION (M10 C2)', async () => {
    const { events, run } = harness([textCompletion('ok')])
    await run()
    expect(events[0]).toEqual({ type: 'start', promptVersion: PROMPT_VERSION })
    expect(events[events.length - 1].type).toBe('finish')
  })

  it('D-2: malformed tool-args JSON does NOT kill the turn — the model gets an error tool-result', async () => {
    const { events, calls, rows, run } = harness([
      toolCompletion([{ id: 'tc1', name: 'list_orders', args: '{"limit": "5"' }]), // broken JSON
      textCompletion('recovered'),
    ])
    await run()

    // No stream-death: no `error` event, the turn finishes normally.
    expect(events.filter((e) => e.type === 'error')).toHaveLength(0)
    expect(events[events.length - 1].type).toBe('finish')

    // The failure went back to the model as a tool result (call 2's context).
    const secondCallMessages = calls[1].messages
    const toolMsg = secondCallMessages.find((m: any) => m.role === 'tool' && m.tool_call_id === 'tc1')
    expect(toolMsg).toBeDefined()
    expect(String(toolMsg.content)).toContain('Invalid JSON arguments for list_orders')

    // The tool-call-end carries the error output for the panel.
    const end = events.find((e) => e.type === 'tool-call-end')!
    expect(end.output.error).toContain('Invalid JSON arguments')
    expect(end.toolName).toBe('list_orders')

    // No audit row for the malformed call (nothing executed).
    expect(rows).toHaveLength(0)
  })

  it('D-1: events + audit rows carry the PARSED (coerced) args, not the raw strings', async () => {
    const { events, rows, run } = harness([
      toolCompletion([{ id: 'tc2', name: 'list_orders', args: '{"limit": "7"}' }]), // string number
      textCompletion('here they are'),
    ])
    await run()

    const start = events.find((e) => e.type === 'tool-call-start')!
    expect(start.args.limit).toBe(7) // number, coerced — NOT "7"
    expect(typeof start.args.limit).toBe('number')

    const end = events.find((e) => e.type === 'tool-call-end')!
    expect(end.args.limit).toBe(7)

    // Audit row stores the same parsed args the proposal executed.
    expect(rows).toHaveLength(1)
    const persistedArgs = JSON.parse(rows[0].toolCalls)[0].args
    expect(persistedArgs.limit).toBe(7)
    expect(rows[0].approved).toBe(true) // read tool → auto-marked
    expect(rows[0].promptVersion).toBe(PROMPT_VERSION)
  })

  it('E: a completion with content AND tool_calls pushes ONE assistant message (no duplicate narration)', async () => {
    const { calls, run } = harness([
      toolCompletion([{ id: 'tc3', name: 'list_orders', args: '{}' }], 'Let me check the open orders…'),
      textCompletion('Done'),
    ])
    await run()

    const secondCallMessages = calls[1].messages
    const assistantMsgs = secondCallMessages.filter((m: any) => m.role === 'assistant')
    expect(assistantMsgs).toHaveLength(1) // the pre-M30 bug pushed two
    expect(assistantMsgs[0].content).toBe('Let me check the open orders…')
    expect(assistantMsgs[0].tool_calls).toHaveLength(1)
  })

  it('D-3: write tools get a crypto-random approvalId stamped into plan + turn row', async () => {
    const code = `LP-${stamp}`
    const { events, rows, run } = harness([
      toolCompletion([{ id: 'tc4', name: 'create_party', args: JSON.stringify({ name: `Loop Party ${stamp}`, partyType: 'both', code }) }]),
      textCompletion('plan proposed'),
    ])
    await run()

    const end = events.find((e) => e.type === 'tool-call-end')!
    expect(end.output.plan.approvalId).toMatch(/^[0-9a-f-]{36}$/) // UUID
    expect(end.output.hasCommitFn).toBe(true)

    // The persisted row carries the SAME correlation token + the stamped plan.
    expect(rows).toHaveLength(1)
    expect(rows[0].approvalId).toBe(end.output.plan.approvalId)
    expect(rows[0].approved).toBe(false) // write tool → awaits the human door
    const persistedPlan = JSON.parse(rows[0].plan as string)
    expect(persistedPlan.approvalId).toBe(end.output.plan.approvalId)

    // execute() is a DRY plan — nothing committed without the approve door.
    const committed = await db.party.findFirst({ where: { code } })
    expect(committed).toBeNull()
  })

  it('clientGone: send() false unwinds the loop without burning more LLM steps', async () => {
    // send true for step 1's five events (start, step-start, tool-call pair,
    // step-end), then false forever → the step-2 step-start breaks the loop
    // BEFORE create().
    const { events, calls, run } = harness(
      [toolCompletion([{ id: 'tc5', name: 'list_orders', args: '{}' }]), textCompletion('never reached')],
      { sendFalseAfter: 5 },
    )
    await run()
    expect(calls).toHaveLength(1) // exactly one LLM completion
    expect(events[events.length - 1].type).toBe('finish')
  })

  it('maxSteps budget: the loop exits after maxSteps with finish (no runaway)', async () => {
    const { events, calls, run } = harness(
      [toolCompletion([{ id: 'tc6', name: 'list_orders', args: '{}' }])], // always tool-calls
      { maxSteps: 2 },
    )
    await run()
    expect(calls).toHaveLength(2)
    const stepStarts = events.filter((e) => e.type === 'step-start')
    expect(stepStarts).toHaveLength(2)
    expect(events[events.length - 1].type).toBe('finish')
  })

  it('unknown tool: the model gets the Unknown tool error (pre-M30 pattern preserved)', async () => {
    const { events, calls, run } = harness([
      toolCompletion([{ id: 'tc7', name: 'accept_supplier_bill', args: '{}' }]), // the ghost tool
      textCompletion('ok'),
    ])
    await run()
    const end = events.find((e) => e.type === 'tool-call-end')!
    expect(end.output.error).toContain('Unknown tool')
    const toolMsg = calls[1].messages.find((m: any) => m.role === 'tool' && m.tool_call_id === 'tc7')
    expect(String(toolMsg.content)).toContain('Unknown tool')
  })

  it('MAX_STEPS default stays 12 (the budget pin)', () => {
    expect(MAX_STEPS).toBe(12)
  })
})
