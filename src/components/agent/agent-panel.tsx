'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Send, X, Check, AlertCircle, Loader2, ChevronDown, ChevronRight, Database, Wrench, Paperclip, FileText, ArrowRight, Mic, MicOff, RotateCcw, Copy, Eye, Printer, Square } from 'lucide-react'
import { toast } from 'sonner'
// HFX-15 (Phase-6B Batch 0) — assistant text renders as Markdown (+ GFM for
// the pipe tables the ingestion prompt asks the model to emit). The old
// raw-text render printed literal ##/**/| — owner issue 1, root layer 2.
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// HFX-16 — per-step narration segments (pure helpers, unit-tested)
import { appendDelta, mergeNarration, type NarrationSegments } from '@/lib/agent/narration'
// CHAT-05 (Phase-6B Batch 2) — plan contents table for approval cards
import { planDisplay } from '@/lib/agent/plan-display'
// CHAT-12 — humanized tool labels (chips read like actions, not identifiers)
import { toolLabel, toolTitle } from '@/lib/agent/tool-labels'
// CHAT-03 — screen-aware suggestions from the menu registry
import { findItemByRoute } from '@/lib/erp/menu-registry'
import { VOICE_LANGS, DEFAULT_VOICE_LANG, VOICE_LANG_STORAGE_KEY, VOICE_SPEAK_STORAGE_KEY, nextVoiceLang, getSpeechRecognition, createVoiceSession, getSpeechSynthesis, planSpeechText, speak, stopSpeaking, type VoiceSession } from '@/lib/agent/voice'

interface AgentPanelProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCommitted: () => void
  /** Optional pre-filled input (coming-soon "Ask the agent" button). Not auto-sent. */
  seedPrompt?: string
}

interface ToolCall {
  toolCallId: string
  toolName: string
  args: any
  output?: any
  status: 'calling' | 'result' | 'error' | 'stopped'
  isWrite?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  toolCalls: ToolCall[]
  /** CHAT-01 — synthetic outcome events ([Plan … APPROVED/REJECTED …]):
   * user-role so they ride the history to the model next turn, but styled
   * as system chips so the UI never lies about who spoke. */
  isEvent?: boolean
  /** CHAT-07 — post-commit CTA (View/Print) on the outcome event card. */
  cta?: { viewUrl?: string; printUrl?: string }
}

interface PendingApproval {
  toolCallId: string
  toolName: string
  args: any
  plan: any
  messageId: string
  /** CHAT-06 — the AgentTurn row the plan lives in: Approve posts this id,
   * the route executes the STORED plan and drift-guards it. */
  turnId?: string | null
  // OPS-04 — minted when the card is created (NOT per click): the approve
  // route replays the stored commit result for a repeated key, so a
  // double-clicked Approve posts exactly once.
  idempotencyKey: string
}

// CHAT-03 — the fallback prompts when the current screen has no authored
// agentPrompt. Formats match the REAL code shapes (B-#### buyers, STY-####
// styles — the old B001/S-1001 examples taught the model wrong formats).
const SUGGESTED_PROMPTS = [
  'List all open purchase orders',
  'Show me the stock position in the Main godown',
  'Create a sales order for buyer B-0001, style STY-1001, 5000 pcs at ₹350/pc (Red/M=1000, Red/L=1000, Blue/M=1500, Blue/L=1500), delivery 2026-10-15',
  'Show me production status for SO-1001',
  'Get dashboard KPIs',
  'List the documents I uploaded, then ingest the purchase order into the ERP',
]

// CHAT-04 — follow-up chips per tool domain: after a read answer, 2–3 of
// these seed the composer. Keys are the tool names the current screen's
// agentTools lists (menu-registry); unmapped tools fall back to the screen's
// own suggestions.
const TOOL_FOLLOWUPS: Record<string, string> = {
  get_dashboard_kpis: 'Show me the live factory activity',
  get_live_activity: 'What needs my attention today?',
  suggest_next_step: "What's the next step for my latest order?",
  get_order_status: 'Show me the full production track for this order',
  get_daily_in_out: "Show me yesterday's stock in and out",
  get_stock: 'Show the stock ledger for the Main godown',
  get_stock_ledger: 'What is the current stock value by godown?',
  list_orders: 'Summarize my open orders',
  list_purchase_orders: 'Which POs are still pending receipt?',
  get_party_ledger: 'Show me the bills register for this party',
  list_invoices: 'Which invoices are still unpaid?',
  get_daily_digest: 'What needs my attention today?',
  get_program_status: 'Show me line status for all production lines',
  get_line_status: 'Show me today\u2019s production entries',
  get_pending_approvals: 'Show me the approval audit trail',
  get_budget_vs_actual: 'Which orders are running over budget?',
  get_cost_sheet: 'Show me budget vs actual for this order',
}

/** CHAT-06 — typed approval phrases resolve the pending plan, never the model
 * (the old flow re-ran the tool and minted a DUPLICATE plan to approve). */
const APPROVE_PHRASE = /^\s*(ok|okay|yes|yeah|yep|approve(d)?|approve it|approve the plan|go ahead|confirm|do it|proceed|rejected?|reject it|reject the plan|no|cancel it)[.!\s]*$/i

function isApprovalPhrase(text: string): 'approve' | 'reject' | null {
  const m = text.trim().toLowerCase().match(APPROVE_PHRASE)
  if (!m) return null
  const w = m[1]
  if (w.startsWith('reject') || w === 'no' || w === 'cancel it') return 'reject'
  return 'approve'
}

export function AgentPanel({ open, onOpenChange, onCommitted, seedPrompt }: AgentPanelProps) {
  const router = useRouter()
  // CHAT-03 — screen-aware suggestions: the panel knows WHICH screen the
  // operator came from; the menu registry's 76 authored agentPrompts finally
  // become consumable (they sat unwired since M2).
  const pathname = usePathname() || '/'
  const screenItem = findItemByRoute(pathname)
    // [id] routes (e.g. /orders/SO-1001) resolve through the parent item
    ?? findItemByRoute(pathname.slice(0, pathname.lastIndexOf('/')))
    ?? undefined
  const screenPrompts: string[] = screenItem?.agentPrompt
    ? [screenItem.agentPrompt]
    : SUGGESTED_PROMPTS.slice(0, 3)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, PendingApproval>>({})
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({})
  const abortRef = useRef<AbortController | null>(null)
  // HFX-18 (Phase-6B Batch 0) — transport errors surface INLINE (chip + Retry),
  // not as toasts (the Toaster is unmounted until PRD P0-1) and not silently.
  const [streamError, setStreamError] = useState<string | null>(null)
  const lastPromptRef = useRef<string | null>(null) // what Retry re-sends
  const [attachedFile, setAttachedFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // CHAT-12 — composer autofocus the moment the panel opens (the old panel
  // demanded a click before typing; every other chat app focuses on open).
  const composerRef = useRef<HTMLTextAreaElement>(null)
  // CHAT-12 — per-message copy affordance (state: which message just copied)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  // SPEC-M10 C2 — the active system-prompt version, streamed on the start event
  const [promptVersion, setPromptVersion] = useState<string | null>(null)
  // SPEC-M24 — voice entry: mic session state (browser SpeechRecognition, en-IN/ta-IN)
  const [listening, setListening] = useState(false)
  const [voiceLang, setVoiceLang] = useState(DEFAULT_VOICE_LANG)
  const voiceSessionRef = useRef<VoiceSession | null>(null)
  const voiceBaseRef = useRef('') // the pre-voice textarea tail base; interim = base + live text
  const voiceSupported = typeof window !== 'undefined' && getSpeechRecognition() !== null
  // SPEC-M32 — the TTS confirm loop: the talking-panel toggle (default OFF —
  // never surprise audio) + the pending-plan read-back
  const [voiceSpeak, setVoiceSpeak] = useState(false)
  const voiceSpeakRef = useRef(false) // the SSE-closure mirror (never stale)
  const ttsSupported = typeof window !== 'undefined' && getSpeechSynthesis() !== null

  // Restore the persisted language on mount (client-only — SSR-safe default).
  useEffect(() => {
    const saved = window.localStorage.getItem(VOICE_LANG_STORAGE_KEY)
    if (saved && VOICE_LANGS.some((l) => l.code === saved)) setVoiceLang(saved)
    setVoiceSpeak(window.localStorage.getItem(VOICE_SPEAK_STORAGE_KEY) === '1')
  }, [])

  // Keep the ref mirror in step (the SSE callback reads the ref).
  useEffect(() => {
    voiceSpeakRef.current = voiceSpeak
  }, [voiceSpeak])

  // Stop any live session when the panel closes (no orphaned mics — and no
  // orphaned AUDIO: the M32 twin of the mic discipline).
  useEffect(() => {
    if (!open) {
      if (listening) {
        voiceSessionRef.current?.stop()
        voiceSessionRef.current = null
        setListening(false)
      }
      stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleVoice = useCallback(() => {
    if (listening) {
      voiceSessionRef.current?.stop() // onend clears the state
      return
    }
    const session = createVoiceSession(voiceLang, {
      onInterim: (text) => setInput(voiceBaseRef.current ? `${voiceBaseRef.current} ${text}` : text),
      onFinal: (text) => {
        const base = voiceBaseRef.current ? `${voiceBaseRef.current} ${text}` : text
        voiceBaseRef.current = base
        setInput(base)
      },
      onEnd: (reason) => {
        voiceSessionRef.current = null
        setListening(false)
        if (reason && reason !== 'ended') {
          const why = reason === 'not-allowed' || reason === 'service-not-allowed'
            ? 'microphone permission denied'
            : `voice stopped (${reason})`
          toast.error(`Voice: ${why}`)
        }
      },
    })
    if (!session) {
      toast.error('Speech recognition not supported in this browser')
      return
    }
    voiceBaseRef.current = input
    voiceSessionRef.current = session
    session.start()
    setListening(true)
  }, [listening, voiceLang, input])

  const cycleVoiceLang = useCallback(() => {
    setVoiceLang((prev) => {
      const next = nextVoiceLang(prev)
      window.localStorage.setItem(VOICE_LANG_STORAGE_KEY, next)
      return next
    })
  }, [])

  // Seed the input when the panel opens with a prompt (SPEC-M1 §6). Never auto-sends.
  useEffect(() => {
    if (open && seedPrompt) setInput(seedPrompt)
  }, [open, seedPrompt])

  // CHAT-12 — autofocus the composer on open (and after the seed lands).
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => composerRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // CHAT-01 — append a synthetic OUTCOME EVENT as a user-role message: it
  // renders as a system chip AND rides the history sent on the next turn, so
  // the model finally sees what happened to its plan (prompt §4.2d/§6 become
  // satisfiable — the single highest-leverage change for owner issue 2).
  const appendEvent = useCallback((text: string, cta?: { viewUrl?: string; printUrl?: string }) => {
    setMessages((prev) => [
      ...prev,
      { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role: 'user', text, toolCalls: [], isEvent: true, cta },
    ])
  }, [])

  // Auto-scroll to bottom on new messages — HFX-17 (Phase-6B Batch 0):
  // the scrollable element is the Radix Viewport (ui/scroll-area.tsx), NOT
  // the inner content div this ref marks. The old code set scrollTop on the
  // content div — a no-op — so long streams never followed. Walk up to the
  // Viewport and scroll THAT; fall back to the div if the tree changes.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const viewport = el.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    const target = viewport ?? el
    target.scrollTop = target.scrollHeight
  }, [messages, streaming])

  const toggleExpand = useCallback((id: string) => {
    setExpandedResults((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // CHAT-01/06/07 — approve posts { turnId } (the route executes the STORED
  // plan, drift-guarded), and the outcome lands as a synthetic conversation
  // EVENT so the model learns what happened; the event card carries the
  // post-commit CTA row (View / Print) derived from the committed docNo.
  const approve = useCallback(async (toolCallId: string) => {
    const pending = pendingApprovals[toolCallId]
    if (!pending) return
    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: pending.toolName,
          args: pending.args,
          idempotencyKey: pending.idempotencyKey,
          turnId: pending.turnId ?? undefined, // CHAT-06 — execute the STORED plan
        }),
      })
      if (res.status === 401) {
        toast.error('Session expired — redirecting to login')
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (data.success) {
        toast.success(`Approved: ${(pending.plan.summary || '').slice(0, 60)}…`)
        if (voiceSpeakRef.current) speak('Committed.') // SPEC-M32 — the spoken ack
        setPendingApprovals((prev) => {
          const next = { ...prev }
          delete next[toolCallId]
          return next
        })
        // CHAT-01 — the outcome event the model sees next turn (and the
        // operator sees now): plan name + APPROVED + the committed doc number.
        const docNo = data.docNo ? ` Committed: ${data.docNo}.` : ' Committed.'
        appendEvent(`[Plan ${pending.toolName} APPROVED.${docNo}]`, data.cta)
        onCommitted()
      } else if (data.drifted) {
        // CHAT-06 — the plan CHANGED since it was shown (e.g. its auto-number
        // was taken). Nothing committed: show the fresh plan for re-approval.
        toast.error(data.error || 'The plan changed — review the new plan.')
        setPendingApprovals((prev) => ({
          ...prev,
          [toolCallId]: { ...pending, plan: data.plan, idempotencyKey: crypto.randomUUID() },
        }))
        appendEvent(`[Plan ${pending.toolName} NOT committed — the plan changed since it was shown. A fresh plan is ready for review.]`)
      } else {
        toast.error('Approval failed: ' + (data.error || ''))
        appendEvent(`[Plan ${pending.toolName} APPROVAL FAILED: ${data.error || 'unknown error'} — nothing was committed.]`)
      }
    } catch (e: any) {
      toast.error(e.message)
      appendEvent(`[Plan ${pending.toolName} APPROVAL FAILED: ${e?.message || 'network error'} — nothing was committed.]`)
    }
  }, [pendingApprovals, appendEvent, onCommitted])

  // CHAT-01 — rejections are events too: the model must learn the plan was
  // declined so it stops claiming success (prompt §4.2d honesty).
  const reject = useCallback((toolCallId: string) => {
    const pending = pendingApprovals[toolCallId]
    setPendingApprovals((prev) => {
      const next = { ...prev }
      delete next[toolCallId]
      return next
    })
    if (voiceSpeakRef.current) speak('Rejected.') // SPEC-M32 — the spoken ack
    toast.info('Plan rejected')
    if (pending) appendEvent(`[Plan ${pending.toolName} REJECTED by the user. Nothing was committed.]`)
  }, [pendingApprovals, appendEvent])

  const sendPrompt = useCallback(async (promptText?: string) => {
    const rawText = (promptText ?? input).trim()
    if ((!rawText && !attachedFile) || streaming) return

    // CHAT-06 — typed "approve it" / "ok" / "reject it" while a plan is
    // pending resolves THAT plan directly. The old flow sent the phrase to
    // the model, which re-ran the tool and minted a DUPLICATE plan to
    // approve — the classic conversation-unfriendliness (owner issue 2).
    if (!attachedFile) {
      const intent = isApprovalPhrase(rawText)
      if (intent) {
        const ids = Object.keys(pendingApprovals)
        if (ids.length > 0) {
          // resolve the MOST RECENT pending plan (later keys = later cards)
          const target = pendingApprovals[ids[ids.length - 1]]
          setInput('')
          appendEvent(`[User: ${rawText}]`)
          if (intent === 'approve') {
            await approve(target.toolCallId)
          } else {
            reject(target.toolCallId)
          }
          return
        }
      }
    }

    // If a document is attached, tell the agent which file to work on.
    const text = attachedFile ? `[Attached document: ${attachedFile}]\n${rawText || 'Ingest this document into the ERP.'}` : rawText
    if (!text) return
    setStreamError(null) // HFX-18 — a fresh send clears the last inline error
    lastPromptRef.current = text // HFX-18 — Retry re-sends exactly this

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      toolCalls: [],
    }
    const assistantMsgId = `a-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      toolCalls: [],
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setAttachedFile(null)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .filter((m) => !m.isEvent || m.role === 'user') // events ride along as user-role turns
            .map((m) => ({
              role: m.role,
              content: m.text,
            })),
          // CHAT-02 — the screen the operator is on (menu title + docNo are
          // resolved server-side; the [CONTEXT] line replaces the prompt's
          // stale hardcoded FY/godowns and makes screen-scoped answers work).
          screen: { pathname },
        }),
        signal: controller.signal,
      })

      // SPEC-M7 Wave B — the API is guarded; an expired session is a JSON 401
      // (not an SSE stream) → send the user back through the login door.
      if (res.status === 401) {
        toast.error('Session expired — redirecting to login')
        window.location.href = '/login'
        return
      }

      // HFX-18 (Phase-6B Batch 0) — every non-OK response surfaces INLINE
      // with a Retry button. The old code only checked 401: a 500/429 was
      // silently swallowed (and toasts are invisible — the Toaster stays
      // unmounted until PRD P0-1).
      if (!res.ok) {
        setStreamError(`Agent unavailable (HTTP ${res.status}${res.status === 429 ? ' — rate limited' : ''}). Retry in a moment.`)
        return
      }

      if (!res.body) {
        setStreamError('No response stream from the agent. Retry in a moment.')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      // HFX-16 (Phase-6B Batch 0) — narration segments keyed by the transport's
      // text id (`text-${step}`): every step's narration PERSISTS across tool
      // calls (the old single replace-buffer was wiped on tool-call-start, so
      // "Let me check stock…" vanished when the post-tool text arrived — in
      // the UI and in the history sent next turn).
      const segments: NarrationSegments = new Map()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE: events separated by \n\n
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const evt of events) {
          const line = evt.trim()
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json || json === '[DONE]') continue
          let payload: any
          try {
            payload = JSON.parse(json)
          } catch {
            continue
          }
          switch (payload.type) {
            case 'start': {
              // SPEC-M10 C2 — stamp the active prompt version for the operator
              setPromptVersion(payload.promptVersion || null)
              break
            }
            // CHAT-12 — the protocol's bookkeeping events are now explicitly
            // CONSUMED (documented no-ops): step-start/step-end bracket steps,
            // text-start/text-end bracket narration (segments are keyed by
            // their ids), finish closes the stream. They carry no UI state the
            // panel needs — but they are NOT dead code to the transport.
            case 'step-start':
            case 'step-end':
            case 'text-start':
            case 'text-end':
            case 'finish':
              break
            case 'text-delta': {
              appendDelta(segments, payload.id, payload.delta || '')
              const merged = mergeNarration(segments)
              setMessages((prev) => {
                const next = [...prev]
                const idx = next.findIndex((m) => m.id === assistantMsgId)
                if (idx >= 0) {
                  next[idx] = { ...next[idx], text: merged }
                }
                return next
              })
              break
            }
            case 'tool-call-start': {
              setMessages((prev) => {
                const next = [...prev]
                const idx = next.findIndex((m) => m.id === assistantMsgId)
                if (idx >= 0) {
                  next[idx] = {
                    ...next[idx],
                    toolCalls: [
                      ...next[idx].toolCalls,
                      {
                        toolCallId: payload.toolCallId,
                        toolName: payload.toolName,
                        args: payload.args,
                        status: 'calling',
                        isWrite: payload.isWrite,
                      },
                    ],
                  }
                }
                return next
              })
              break
            }
            case 'tool-call-end': {
              const { toolCallId, output, toolName, args } = payload
              setMessages((prev) => {
                const next = [...prev]
                const idx = next.findIndex((m) => m.id === assistantMsgId)
                if (idx >= 0) {
                  const tcs = [...next[idx].toolCalls]
                  const tcIdx = tcs.findIndex((t) => t.toolCallId === toolCallId)
                  if (tcIdx >= 0) {
                    tcs[tcIdx] = {
                      ...tcs[tcIdx],
                      output,
                      status: output?.error ? 'error' : 'result',
                    }
                  }
                  next[idx] = { ...next[idx], toolCalls: tcs }
                }
                return next
              })
              // If write + has plan + has commit fn → pending approval.
              // SPEC-M32 — the TTS confirm loop: when the operator enabled the
              // speaker, the review card READS ITS PLAN ALOUD (the legacy
              // read-back reborn — eyes-busy/hands-busy shop floor).
              // CHAT-06 — the turnId rides along: Approve posts { turnId } and
              // the route executes the STORED plan (drift-guarded).
              if (output?.isWrite && output?.plan && output?.hasCommitFn) {
                setPendingApprovals((prev) => ({
                  ...prev,
                  [toolCallId]: {
                    toolCallId,
                    toolName,
                    args,
                    plan: output.plan,
                    messageId: assistantMsgId,
                    turnId: payload.turnId ?? null,
                    idempotencyKey: crypto.randomUUID(),
                  },
                }))
                if (voiceSpeakRef.current) {
                  speak(planSpeechText(output.plan))
                }
              }
              break
            }
            case 'error': {
              // HFX-18 — mid-stream errors surface INLINE too (toasts are
              // invisible until the Toaster mounts — PRD P0-1).
              setStreamError('Agent error: ' + (payload.error || 'unknown'))
              break
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // HFX-18 — network failures surface inline with Retry (not a toast).
        setStreamError(err?.message || 'Network error — check the connection and retry.')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming, attachedFile, pendingApprovals, pathname, approve, reject])

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
    // CHAT-12 — aborted tool chips flip to a visible "stopped" state: the
    // old panel left them spinning "calling" forever after Stop.
    setMessages((prev) => prev.map((m) => ({
      ...m,
      toolCalls: m.toolCalls.map((tc) => (tc.status === 'calling' ? { ...tc, status: 'stopped' as const } : tc)),
    })))
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.status === 401) {
        toast.error('Session expired — redirecting to login')
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      // SPEC-M3 §12 upload contract returns { ok, fileName, … } (M7B fix:
      // this used to check data.success and the attach flow never fired)
      if (data.ok) {
        setAttachedFile(data.fileName)
        toast.success(`Attached ${data.fileName} (${(data.sizeBytes / 1024).toFixed(0)} KB). Now say "ingest this" or ask a question about it.`)
      } else {
        toast.error('Upload failed: ' + (data.error || 'unknown'))
      }
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="h-14 border-b border-slate-200 px-4 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span>Fiberpro Agent</span>
            <Badge variant="secondary" className="text-[10px]">GLM-4.6</Badge>
            {promptVersion && (
              <Badge variant="outline" className="text-[10px] font-mono text-slate-500" data-testid="prompt-version">
                {promptVersion}
              </Badge>
            )}
          </SheetTitle>
          {/* HFX-19 (Phase-6B Batch 0) — exactly ONE close affordance: the
              SheetPrimitive.Close X that ui/sheet.tsx renders for every sheet
              (top-4 right-4). The panel's own duplicate X button is GONE —
              two stacked close buttons shipped since M10. */}
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="font-medium text-slate-900 mb-2">I&apos;m your AI agent for the Fiberpro Garment ERP.</p>
                  <p className="text-xs">I can read &amp; write data across all modules — orders, procurement, inventory, cutting, production, accounting, costing, HR, and approvals. Write actions show you a plan first; you approve before anything commits.</p>
                </div>
                <div className="space-y-2">
                  {/* CHAT-03 — screen-aware suggestions: the authored
                      agentPrompt for the screen the operator is ON (76 were
                      written, zero were wired); on doc routes ([id]) the
                      parent item's prompt scopes to that doc family. */}
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    {screenItem ? `From ${screenItem.label}` : 'Try these'}
                  </div>
                  {screenPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => sendPrompt(p)}
                      className="w-full text-left text-xs px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                  {!screenItem && SUGGESTED_PROMPTS.slice(3).map((p, i) => (
                    <button
                      key={`x-${i}`}
                      onClick={() => sendPrompt(p)}
                      className="w-full text-left text-xs px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' && !m.isEvent ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  m.isEvent ? (
                    // CHAT-01 — synthetic outcome events render as SYSTEM chips
                    // (slate — never the emerald user bubble: the UI never lies
                    // about who spoke) with the CHAT-07 post-commit CTA row.
                    <div
                      data-testid="agent-outcome-event"
                      className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded bg-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-slate-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-800 font-medium">{m.text}</div>
                          {(m.cta?.viewUrl || m.cta?.printUrl) && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {m.cta?.viewUrl && (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => {
                                    onOpenChange(false)
                                    router.push(m.cta!.viewUrl!)
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                              )}
                              {m.cta?.printUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    onOpenChange(false)
                                    router.push(m.cta!.printUrl!)
                                  }}
                                >
                                  <Printer className="h-3 w-3 mr-1" /> Print
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[80%] bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                      {m.text}
                    </div>
                  )
                ) : (
                  <div className="space-y-2 w-full">
                    {m.text && (
                      <>
                        {/* HFX-15 — Markdown + GFM render (headings, bold, pipe
                            tables, links, code blocks) styled to the panel theme;
                            raw markdown glyphs never reach the screen as literals. */}
                        <div
                          data-testid="assistant-text"
                          className="text-sm leading-relaxed text-slate-800 [&_a]:text-emerald-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold [&_hr]:border-slate-200 [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-2 [&_pre]:text-[12px] [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12px] [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                        {/* CHAT-12 — copy-message button (the operator asked for
                            it mid-M36 verification; one click, brief check ack) */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            aria-label="Copy message"
                            title="Copy message"
                            data-testid="copy-message"
                            onClick={() => {
                              navigator.clipboard?.writeText(m.text).then(() => {
                                setCopiedId(m.id)
                                setTimeout(() => setCopiedId(null), 1500)
                              }).catch(() => {})
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {copiedId === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </>
                    )}
                    {m.toolCalls.map((tc, i) => {
                      const isExpanded = expandedResults[`${m.id}-${i}`]
                      const result = tc.output
                      const isPending = !!pendingApprovals[tc.toolCallId]
                      const isError = tc.status === 'error' || result?.error
                      return (
                        // CHAT-12 — composite key: providers reuse tool-call ids
                        // across steps (seen live), which broke React's identity
                        // contract ("two children with the same key").
                        <Card key={`${tc.toolCallId}-${i}`} className={`p-3 border ${isError ? 'border-red-300 bg-red-50' : isPending ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex items-start gap-2">
                            <div className="h-6 w-6 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <Wrench className="h-3.5 w-3.5 text-slate-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* CHAT-12 — humanized label: chips read like
                                    actions; the raw snake_case name stays in the
                                    title/args for source truth. */}
                                <span className="text-xs font-semibold text-slate-900" title={toolTitle(tc.toolName)}>{toolLabel(tc.toolName)}</span>
                                <span className="text-[10px] font-mono text-slate-400">{tc.toolName}</span>
                                {tc.status === 'calling' && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300"><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />calling</Badge>}
                                {tc.status === 'stopped' && <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-300"><Square className="h-2.5 w-2.5 mr-1" />stopped</Badge>}
                                {tc.status === 'result' && !isError && !isPending && <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">ok</Badge>}
                                {isError && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300"><AlertCircle className="h-2.5 w-2.5 mr-1" />error</Badge>}
                                {isPending && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">pending approval</Badge>}
                              </div>

                              {tc.args && Object.keys(tc.args).length > 0 && (
                                <div className="mt-1.5">
                                  <button
                                    onClick={() => toggleExpand(`${m.id}-${i}-args`)}
                                    className="text-[10px] text-slate-500 flex items-center gap-1 hover:text-slate-700"
                                  >
                                    {expandedResults[`${m.id}-${i}-args`] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    arguments
                                  </button>
                                  {expandedResults[`${m.id}-${i}-args`] && (
                                    <pre className="mt-1 text-[10px] bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                                      {JSON.stringify(tc.args, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}

                              {result?.text && (
                                <div className="mt-1.5 text-xs text-slate-700">{result.text}</div>
                              )}
                              {result?.error && (
                                <div className="mt-1.5 text-xs text-red-700">{result.error}</div>
                              )}

                              {result?.json && (
                                <div className="mt-1.5">
                                  <button
                                    onClick={() => toggleExpand(`${m.id}-${i}`)}
                                    className="text-[10px] text-slate-500 flex items-center gap-1 hover:text-slate-700"
                                  >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <Database className="h-3 w-3" />
                                    data ({Array.isArray(result.json) ? result.json.length : Object.keys(result.json).length} items)
                                  </button>
                                  {isExpanded && (
                                    <pre className="mt-1 text-[10px] bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-60 overflow-y-auto">
                                      {JSON.stringify(result.json, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}

                              {/* W5(c) minimal slice (SPEC-M3 §9.5): suggest_next_step
                                  returns nextFormUrl — the agent-side twin of the
                                  DocScreen "Next →" CTA. One click opens the form. */}
                              {result?.json?.nextFormUrl && typeof result.json.nextFormUrl === 'string' && (
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => {
                                      onOpenChange(false)
                                      router.push(result.json.nextFormUrl)
                                    }}
                                  >
                                    Open form <ArrowRight className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                              )}

                              {isPending && (
                                <div className="mt-2 p-2 bg-white rounded border border-amber-300">
                                  <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide mb-1">Plan awaiting approval</div>
                                  <div className="text-xs text-slate-800 mb-1.5">{result.plan.summary}</div>
                                  {/* CHAT-05 — the plan's CONTENTS, not its row
                                      count: header fields as a field/value table
                                      (₹ en-IN money, dates, booleans) + the line
                                      grid rollup. Approving a ₹4-lakh order now
                                      shows the line items, not "Creates: 3 record(s)". */}
                                  {(() => {
                                    const disp = planDisplay({
                                      creates: result.plan.creates,
                                      updates: result.plan.updates,
                                    })
                                    return (
                                      <div data-testid="plan-contents" className="mb-2 rounded border border-slate-200 overflow-hidden">
                                        <div className="bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{disp.label}</div>
                                        <table className="w-full text-[11px]">
                                          <tbody>
                                            {disp.rows.map((r, idx) => (
                                              <tr key={idx} className="border-t border-slate-100">
                                                <td className="px-2 py-1 text-slate-500 w-2/5 align-top">{r.field}</td>
                                                <td className="px-2 py-1 text-slate-900 font-medium">{r.value}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                        {disp.lines.length > 0 && (
                                          <div className="border-t border-slate-100 px-2 py-1">
                                            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-0.5">Lines ({(result.plan.creates?.length ?? 1) - 1})</div>
                                            <ul className="text-[11px] text-slate-700 space-y-0.5">
                                              {disp.lines.map((l, idx) => <li key={idx}>· {l}</li>)}
                                              {disp.moreLines > 0 && <li className="text-slate-500">… +{disp.moreLines} more</li>}
                                            </ul>
                                          </div>
                                        )}
                                        {disp.updates.length > 0 && (
                                          <div className="border-t border-slate-100 px-2 py-1 text-[11px] text-slate-600">
                                            Updates: {disp.updates.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                  {result.plan.sideEffects?.length > 0 && (
                                    <div className="text-[10px] text-slate-600 mb-2">
                                      <span className="font-semibold">Side effects:</span>
                                      <ul className="list-disc list-inside">
                                        {result.plan.sideEffects.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(tc.toolCallId)}>
                                      <Check className="h-3 w-3 mr-1" /> Approve &amp; Commit
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reject(tc.toolCallId)}>
                                      <X className="h-3 w-3 mr-1" /> Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {streaming && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> working…
              </div>
            )}

            {/* CHAT-04 — post-answer follow-up chips: after a read-only answer
                (and with nothing pending), 2–3 chips derived from the current
                screen's agentTools domain seed the composer on click. */}
            {!streaming && messages.length > 0 && Object.keys(pendingApprovals).length === 0 && (() => {
              const last = messages[messages.length - 1]
              if (!last || last.role !== 'assistant' || last.toolCalls.length === 0) return null
              const allReads = last.toolCalls.every((tc) => !tc.isWrite)
              if (!allReads) return null
              const chips = (screenItem?.agentTools ?? [])
                .map((t) => TOOL_FOLLOWUPS[t])
                .filter((x): x is string => !!x)
                .slice(0, 3)
              if (chips.length === 0) return null
              return (
                <div className="flex flex-wrap gap-1.5" data-testid="followup-chips">
                  {chips.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInput(c)}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        </ScrollArea>

        {/* HFX-18 — transport/agent errors surface INLINE with Retry. Toasts
            are invisible (Toaster unmounted until PRD P0-1) and silent
            failures taught the owner to distrust the panel. */}
        {streamError && (
          <div
            data-testid="agent-stream-error"
            className="mx-3 my-2 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{streamError}</span>
            <button
              type="button"
              onClick={() => {
                const p = lastPromptRef.current
                setStreamError(null)
                if (p) sendPrompt(p)
              }}
              className="flex items-center gap-1 rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
            <button
              type="button"
              onClick={() => setStreamError(null)}
              className="text-red-500 hover:text-red-700"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!input.trim() && !attachedFile) return
            sendPrompt()
          }}
          className="border-t border-slate-200 p-3 space-y-2"
        >
          {attachedFile && (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-2 py-1.5">
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate flex-1 font-medium">{attachedFile}</span>
              <button type="button" onClick={() => setAttachedFile(null)} className="text-emerald-600 hover:text-emerald-800">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Textarea
            ref={composerRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent — e.g. 'Create a yarn PO for SUP001, 500 kg of 30s cotton at ₹180/kg, delivery 2026-09-05'"
            className="min-h-[60px] max-h-[120px] resize-y text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (input.trim()) sendPrompt()
              }
            }}
          />
          <div className="flex justify-between items-center">
            <div className="text-[10px] text-slate-500">
              {messages.length} msgs · {streaming ? 'streaming' : 'idle'}
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt,.md,.json,.tsv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadFile(f)
                }}
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={!voiceSupported || streaming}
                onClick={toggleVoice}
                title={
                  !voiceSupported
                    ? 'Speech recognition not supported in this browser'
                    : listening
                      ? `Stop dictation (${voiceLang})`
                      : `Dictate into the prompt (${voiceLang}) — review before sending`
                }
                className={listening ? 'text-red-600 border-red-300 bg-red-50' : undefined}
              >
                {listening
                  ? <MicOff className="h-3.5 w-3.5 mr-1 animate-pulse" />
                  : <Mic className="h-3.5 w-3.5 mr-1" />}
                {listening ? 'Stop' : 'Voice'}
              </Button>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={cycleVoiceLang}
                  disabled={listening}
                  title={`Voice language: ${VOICE_LANGS.find((l) => l.code === voiceLang)?.title ?? voiceLang} — click to switch`}
                  className="h-7 px-2 text-[10px] font-semibold rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  {VOICE_LANGS.find((l) => l.code === voiceLang)?.label ?? 'EN'}
                </button>
              )}
              {/* SPEC-M32 — the talking-panel toggle: read pending plans +
                  approve/reject acks aloud (default OFF — never surprise audio) */}
              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceSpeak
                    setVoiceSpeak(next)
                    window.localStorage.setItem(VOICE_SPEAK_STORAGE_KEY, next ? '1' : '0')
                    if (!next) stopSpeaking()
                  }}
                  title={voiceSpeak
                    ? 'Voice confirm ON — pending plans are read aloud. Click to silence.'
                    : 'Voice confirm OFF — click to have pending plans read aloud (the legacy read-back)'}
                  data-testid="voice-speak-toggle"
                  className={`h-7 px-2 text-[10px] font-semibold rounded-md border ${
                    voiceSpeak
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {voiceSpeak ? '🔊' : '🔇'}
                </button>
              )}
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={uploading || streaming}
                onClick={() => fileInputRef.current?.click()}
                title="Attach a document (PDF/CSV/TXT) for the agent to read & ingest"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Paperclip className="h-3.5 w-3.5 mr-1" />}
                Attach
              </Button>
              {streaming && (
                <Button size="sm" variant="outline" onClick={stop} type="button">
                  Stop
                </Button>
              )}
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={(!input.trim() && !attachedFile) || streaming}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
