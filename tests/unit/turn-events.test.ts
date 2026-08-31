/**
 * SPEC-M30 (QoL1 D-4) — the pure SSE parser + transcript reducer the agent
 * panel drives. Pinned here:
 *   - splitSseBuffer: \n\n event splitting, CRLF tolerance, incomplete-tail
 *     carry (chunk boundaries must not lose or duplicate events);
 *   - parseSseEvent: data: prefix, [DONE], keep-alives, non-JSON garbage;
 *   - TranscriptReducer: THE P1-4 REGRESSION — text segments accumulate so
 *     narration before a tool call survives later text (the pre-M30 panel
 *     wiped it); tool-call lifecycle; pending-approval capture including the
 *     SPEC-M30 approvalId from the stamped plan; immutability of returned
 *     state; outgoingMessages shape (history carries text only).
 */
import { describe, it, expect } from 'vitest'
import {
  splitSseBuffer,
  parseSseEvent,
  composeText,
  TranscriptReducer,
  type PanelMessage,
} from '../../src/lib/agent/turn-events'

describe('splitSseBuffer — SSE wire framing', () => {
  it('splits complete events and carries the incomplete tail', () => {
    const { events, rest } = splitSseBuffer(
      'data: {"type":"a"}\n\ndata: {"type":"b"}\n\ndata: {"type":"c',
    )
    expect(events).toEqual(['data: {"type":"a"}', 'data: {"type":"b"}'])
    expect(rest).toBe('data: {"type":"c')
  })

  it('chunk boundaries: tail + next chunk reassemble without loss', () => {
    const first = splitSseBuffer('data: {"type":"start","promptVersion":"m10"}\n\ndata: {"type":"t')
    const second = splitSseBuffer(first.rest + 'ext-delta","delta":"hi"}\n\n')
    expect(second.events).toHaveLength(1)
    expect(parseSseEvent(second.events[0])).toEqual({ type: 'text-delta', delta: 'hi' })
  })

  it('CRLF (spec-legal) normalizes to \\n before splitting', () => {
    const { events, rest } = splitSseBuffer('data: {"type":"a"}\r\n\r\ndata: {"type":"b"}\r\n\r\n')
    expect(events).toEqual(['data: {"type":"a"}', 'data: {"type":"b"}'])
    expect(rest).toBe('')
  })

  it('empty buffer → no events, empty rest', () => {
    expect(splitSseBuffer('')).toEqual({ events: [], rest: '' })
  })
})

describe('parseSseEvent — payload extraction', () => {
  it('parses the data: JSON payload', () => {
    expect(parseSseEvent('data: {"type":"finish"}')).toEqual({ type: 'finish' })
  })

  it('skips non-data lines, [DONE], and keep-alive comments', () => {
    expect(parseSseEvent('event: ping')).toBeNull()
    expect(parseSseEvent('data: [DONE]')).toBeNull()
    expect(parseSseEvent(': keep-alive')).toBeNull()
    expect(parseSseEvent('data:')).toBeNull()
  })

  it('garbage JSON → null (never throws)', () => {
    expect(parseSseEvent('data: {oops')).toBeNull()
  })

  it('multi-line data joins with \\n before parsing', () => {
    expect(parseSseEvent('data: {"type":"x",\ndata: "delta":"y"}')).toEqual({
      type: 'x',
      delta: 'y',
    })
  })
})

describe('composeText — segment composition', () => {
  it('joins non-empty segments with a blank line, drops empties', () => {
    expect(composeText(['Let me check', ''], 'Here are the results')).toBe(
      'Let me check\n\nHere are the results',
    )
    expect(composeText([], '')).toBe('')
  })
})

describe('TranscriptReducer — the P1-4 segment accumulation pin', () => {
  it('narration before a tool call SURVIVES later text (the pre-M30 wipe bug)', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.addUserMessage('show open orders')
    const aid = r.beginAssistant()

    r.applyEvent({ type: 'text-delta', delta: 'Let me check the open orders…' })
    r.applyEvent({ type: 'tool-call-start', toolCallId: 'tc1', toolName: 'list_orders', args: {}, isWrite: false })
    r.applyEvent({
      type: 'tool-call-end',
      toolCallId: 'tc1',
      toolName: 'list_orders',
      args: {},
      output: { text: '3 open orders', json: [], isWrite: false },
    })
    r.applyEvent({ type: 'text-delta', delta: 'Here are the 3 open orders.' })

    const st = r.state
    const assistant = st.messages.find((m) => m.id === aid)!
    expect(assistant.text).toBe('Let me check the open orders…\n\nHere are the 3 open orders.')
    expect(assistant.toolCalls).toHaveLength(1)
    expect(assistant.toolCalls[0].status).toBe('result')
  })

  it('tool-call lifecycle: calling → result, error status on error output', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.beginAssistant()
    r.applyEvent({ type: 'tool-call-start', toolCallId: 't1', toolName: 'x', args: {} })
    r.applyEvent({ type: 'tool-call-end', toolCallId: 't1', toolName: 'x', args: {}, output: { error: 'boom' } })
    let tc = r.state.messages[0].toolCalls[0]
    expect(tc.status).toBe('error')

    r.applyEvent({ type: 'tool-call-start', toolCallId: 't2', toolName: 'y', args: {} })
    r.applyEvent({ type: 'tool-call-end', toolCallId: 't2', toolName: 'y', args: {}, output: { json: [] } })
    tc = r.state.messages[0].toolCalls[1]
    expect(tc.status).toBe('result')
  })

  it('pending approval captures the SPEC-M30 approvalId from the stamped plan', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.beginAssistant()
    r.applyEvent({ type: 'tool-call-start', toolCallId: 'w1', toolName: 'create_party', args: { name: 'X' }, isWrite: true })
    r.applyEvent({
      type: 'tool-call-end',
      toolCallId: 'w1',
      toolName: 'create_party',
      args: { name: 'X' },
      output: {
        isWrite: true,
        hasCommitFn: true,
        plan: { summary: 'Create party X', approvalId: 'uuid-1234' },
      },
    })
    const pending = r.state.pendingApprovals['w1']
    expect(pending).toBeDefined()
    expect(pending.approvalId).toBe('uuid-1234')
    expect(pending.toolName).toBe('create_party')
  })

  it('read tools and no-commit-fn outputs do NOT create pending approvals', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.beginAssistant()
    r.applyEvent({ type: 'tool-call-start', toolCallId: 'r1', toolName: 'list_orders', args: {} })
    r.applyEvent({
      type: 'tool-call-end',
      toolCallId: 'r1',
      toolName: 'list_orders',
      args: {},
      output: { isWrite: false, plan: null, hasCommitFn: false, json: [] },
    })
    expect(Object.keys(r.state.pendingApprovals)).toHaveLength(0)
  })

  it('returns FRESH immutable state (previous arrays untouched)', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.beginAssistant()
    const before = r.state.messages
    r.applyEvent({ type: 'text-delta', delta: 'hello' })
    const st = r.state
    expect(st.messages).not.toBe(before)
    expect(before[0].text).toBe('') // the pre-event snapshot is unchanged
    expect(st.messages[0].text).toBe('hello')
  })

  it('irrelevant/unknown events return null (no state change)', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.beginAssistant()
    expect(r.applyEvent({ type: 'step-start', step: 1 })).toBeNull()
    expect(r.applyEvent({ type: 'finish' })).toBeNull()
    expect(r.applyEvent(null)).toBeNull()
    expect(r.applyEvent('nope' as any)).toBeNull()
  })

  it('events before beginAssistant are ignored (no active assistant)', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    expect(r.applyEvent({ type: 'text-delta', delta: 'x' })).toBeNull()
    expect(r.state.messages).toHaveLength(0)
  })

  it('outgoingMessages: user/assistant text only, tool payloads stripped', () => {
    const seed: PanelMessage[] = [
      { id: 'u1', role: 'user', text: 'hi', toolCalls: [] },
      { id: 'a1', role: 'assistant', text: 'hello', toolCalls: [{ toolCallId: 't', toolName: 'x', args: {}, status: 'result', output: { json: [1, 2, 3] } }] },
    ]
    const r = new TranscriptReducer(seed)
    r.addUserMessage('next question')
    expect(r.outgoingMessages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'next question' },
    ])
  })

  it('a fresh assistant per turn: segments reset, both turns keep their text', () => {
    const r = new TranscriptReducer([] as PanelMessage[])
    r.addUserMessage('q1')
    const a1 = r.beginAssistant()
    r.applyEvent({ type: 'text-delta', delta: 'answer one' })
    r.addUserMessage('q2')
    const a2 = r.beginAssistant()
    r.applyEvent({ type: 'text-delta', delta: 'answer two' })
    const m1 = r.state.messages.find((m) => m.id === a1)!
    const m2 = r.state.messages.find((m) => m.id === a2)!
    expect(m1.text).toBe('answer one')
    expect(m2.text).toBe('answer two')
  })
})
