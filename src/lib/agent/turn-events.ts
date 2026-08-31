/* eslint-disable @typescript-eslint/no-explicit-any */
/* SPEC-M30 (QoL1 D-4) — pure SSE parsing + transcript reduction for the
 * agent panel. No React, no browser APIs — unit-tested like voice.ts; the
 * panel wires it (side effects: toasts, 401 redirect, nextFormUrl
 * navigation, the promptVersion chip).
 *
 * The bug this module fixes: the pre-M30 panel reset its text buffer on
 * every tool-call-start, so the model's narration BEFORE a tool call was
 * silently REPLACED by later text segments. Here text segments ACCUMULATE
 * per assistant message (joined with a blank line); tool calls live beside
 * them; pending approvals capture the SPEC-M30 approvalId from the plan.
 */

// ───────────── SSE wire format ─────────────

/** Split an SSE byte-stream buffer into complete events. Tolerates CRLF
 * (spec-legal) — normalized to \n first. Returns the events + the rest
 * (the incomplete tail the caller must carry into the next chunk). */
export function splitSseBuffer(buffer: string): { events: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n\n')
  const rest = parts.pop() || ''
  return { events: parts, rest }
}

/** Parse one raw SSE event into its payload object. Returns null for
 * non-data lines, keep-alives, [DONE], and non-JSON bodies (the caller
 * skips those — exactly the pre-M30 panel behavior, now in one place). */
export function parseSseEvent(evt: string): any | null {
  const lines = evt.split('\n')
  const dataLines = lines
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
  if (dataLines.length === 0) return null
  const json = dataLines.join('\n')
  if (!json || json === '[DONE]') return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ───────────── Transcript state ─────────────

export type ToolCallStatus = 'calling' | 'result' | 'error'

export interface PanelToolCall {
  toolCallId: string
  toolName: string
  args: any
  output?: any
  status: ToolCallStatus
  isWrite?: boolean
}

export interface PanelMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  toolCalls: PanelToolCall[]
}

export interface PendingApproval {
  toolCallId: string
  toolName: string
  args: any
  plan: any
  messageId: string
  /** SPEC-M30 D-3 — the correlation token from the proposing loop; the
   * approve door requires it. */
  approvalId?: string
}

export type PendingApprovals = Record<string, PendingApproval>

/** Compose the visible text: accumulated closed segments + the open one,
 * blank-line separated; empties dropped. */
export function composeText(closedSegments: string[], open: string): string {
  return [...closedSegments, open].filter((s) => s !== '').join('\n\n')
}

/**
 * Reducer over the panel transcript. Create one per outgoing prompt,
 * seeded with the current messages; drive it with applyEvent as SSE
 * payloads arrive; every state-changing call returns FRESH immutable
 * state (React-friendly); null when the event changed nothing.
 */
export class TranscriptReducer {
  private messages: PanelMessage[]
  private pending: PendingApprovals = {}
  private activeAssistantId: string | null = null
  private closedSegments: string[] = []
  private openSegment = ''
  private seq = 0

  constructor(initial: PanelMessage[]) {
    this.messages = [...initial]
  }

  get state(): { messages: PanelMessage[]; pendingApprovals: PendingApprovals } {
    return { messages: this.messages, pendingApprovals: this.pending }
  }

  get outgoingMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text }))
  }

  addUserMessage(text: string): string {
    const id = `u-${Date.now()}-${this.seq++}`
    this.messages = [...this.messages, { id, role: 'user', text, toolCalls: [] }]
    return id
  }

  /** Start a (fresh) assistant message — resets the segment machinery. */
  beginAssistant(): string {
    const id = `a-${Date.now()}-${this.seq++}`
    this.activeAssistantId = id
    this.closedSegments = []
    this.openSegment = ''
    this.messages = [...this.messages, { id, role: 'assistant', text: '', toolCalls: [] }]
    return id
  }

  /** Apply one SSE payload. Returns fresh state when something changed,
   * null otherwise (caller may skip setState). */
  applyEvent(payload: any): { messages: PanelMessage[]; pendingApprovals: PendingApprovals } | null {
    if (!payload || typeof payload !== 'object') return null
    switch (payload.type) {
      case 'text-delta': {
        if (!this.activeAssistantId) return null
        this.openSegment += payload.delta || ''
        this.patchActiveMessage()
        return this.state
      }
      case 'tool-call-start': {
        if (!this.activeAssistantId) return null
        // Close the open segment — narration before a tool call SURVIVES
        // (the pre-M30 panel wiped it).
        if (this.openSegment !== '') {
          this.closedSegments = [...this.closedSegments, this.openSegment]
          this.openSegment = ''
        }
        const id = this.activeAssistantId
        this.messages = this.messages.map((m) =>
          m.id === id
            ? {
                ...m,
                toolCalls: [
                  ...m.toolCalls,
                  {
                    toolCallId: payload.toolCallId,
                    toolName: payload.toolName,
                    args: payload.args,
                    status: 'calling' as ToolCallStatus,
                    isWrite: payload.isWrite,
                  },
                ],
              }
            : m,
        )
        return this.state
      }
      case 'tool-call-end': {
        if (!this.activeAssistantId) return null
        const id = this.activeAssistantId
        const { toolCallId, output, toolName, args } = payload
        this.messages = this.messages.map((m) =>
          m.id === id
            ? {
                ...m,
                toolCalls: m.toolCalls.map((tc) =>
                  tc.toolCallId === toolCallId
                    ? { ...tc, output, status: (output?.error ? 'error' : 'result') as ToolCallStatus }
                    : tc,
                ),
              }
            : m,
        )
        // Write + plan + commit fn → pending approval (the panel's card).
        // SPEC-M30: capture the approvalId from the stamped plan.
        if (output?.isWrite && output?.plan && output?.hasCommitFn) {
          this.pending = {
            ...this.pending,
            [toolCallId]: {
              toolCallId,
              toolName,
              args,
              plan: output.plan,
              messageId: id,
              approvalId: output.plan.approvalId,
            },
          }
        }
        return this.state
      }
      default:
        return null
    }
  }

  private patchActiveMessage() {
    if (!this.activeAssistantId) return
    const text = composeText(this.closedSegments, this.openSegment)
    const id = this.activeAssistantId
    this.messages = this.messages.map((m) => (m.id === id ? { ...m, text } : m))
  }
}
