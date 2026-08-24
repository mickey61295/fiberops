'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Send, X, Check, AlertCircle, Loader2, ChevronDown, ChevronRight, Database, Wrench } from 'lucide-react'
import { toast } from 'sonner'

interface AgentPanelProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCommitted: () => void
}

interface ToolCall {
  toolCallId: string
  toolName: string
  args: any
  output?: any
  status: 'calling' | 'result' | 'error'
  isWrite?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  toolCalls: ToolCall[]
}

interface PendingApproval {
  toolCallId: string
  toolName: string
  args: any
  plan: any
  messageId: string
}

const SUGGESTED_PROMPTS = [
  'List all open purchase orders',
  'Show me the stock position in the Main godown',
  'Create a sales order for buyer B001, style S-1001, 5000 pcs at ₹350/pc (Red/M=1000, Red/L=1000, Blue/M=1500, Blue/L=1500), delivery 2026-10-15',
  'Show me production status for SO-1001',
  'Get dashboard KPIs',
  'Show me pending approvals',
]

export function AgentPanel({ open, onOpenChange, onCommitted }: AgentPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, PendingApproval>>({})
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({})
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming])

  const toggleExpand = useCallback((id: string) => {
    setExpandedResults((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const sendPrompt = useCallback(async (promptText?: string) => {
    const text = (promptText ?? input).trim()
    if (!text || streaming) return

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
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
        signal: controller.signal,
      })

      if (!res.body) {
        toast.error('No response stream')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentTextBuffer = ''

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
            case 'text-delta': {
              currentTextBuffer += payload.delta || ''
              setMessages((prev) => {
                const next = [...prev]
                const idx = next.findIndex((m) => m.id === assistantMsgId)
                if (idx >= 0) {
                  next[idx] = { ...next[idx], text: currentTextBuffer }
                }
                return next
              })
              break
            }
            case 'tool-call-start': {
              currentTextBuffer = '' // reset for next text segment
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
              // If write + has plan + has commit fn → pending approval
              if (output?.isWrite && output?.plan && output?.hasCommitFn) {
                setPendingApprovals((prev) => ({
                  ...prev,
                  [toolCallId]: {
                    toolCallId,
                    toolName,
                    args,
                    plan: output.plan,
                    messageId: assistantMsgId,
                  },
                }))
              }
              break
            }
            case 'error': {
              toast.error('Agent error: ' + (payload.error || 'unknown'))
              break
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error(err?.message || 'Network error')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming])

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const approve = async (toolCallId: string) => {
    const pending = pendingApprovals[toolCallId]
    if (!pending) return
    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: pending.toolName, args: pending.args }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Approved: ${(pending.plan.summary || '').slice(0, 60)}…`)
        setPendingApprovals((prev) => {
          const next = { ...prev }
          delete next[toolCallId]
          return next
        })
        onCommitted()
      } else {
        toast.error('Approval failed: ' + (data.error || ''))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const reject = (toolCallId: string) => {
    setPendingApprovals((prev) => {
      const next = { ...prev }
      delete next[toolCallId]
      return next
    })
    toast.info('Plan rejected')
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
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
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
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Try these</div>
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
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
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <div className="max-w-[80%] bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                    {m.text}
                  </div>
                ) : (
                  <div className="space-y-2 w-full">
                    {m.text && (
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.text}</div>
                    )}
                    {m.toolCalls.map((tc, i) => {
                      const isExpanded = expandedResults[`${m.id}-${i}`]
                      const result = tc.output
                      const isPending = !!pendingApprovals[tc.toolCallId]
                      const isError = tc.status === 'error' || result?.error
                      return (
                        <Card key={tc.toolCallId} className={`p-3 border ${isError ? 'border-red-300 bg-red-50' : isPending ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex items-start gap-2">
                            <div className="h-6 w-6 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <Wrench className="h-3.5 w-3.5 text-slate-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-semibold text-slate-900">{tc.toolName}</span>
                                {tc.status === 'calling' && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300"><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />calling</Badge>}
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

                              {isPending && (
                                <div className="mt-2 p-2 bg-white rounded border border-amber-300">
                                  <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide mb-1">Plan awaiting approval</div>
                                  <div className="text-xs text-slate-800 mb-1.5">{result.plan.summary}</div>
                                  {result.plan.creates?.length > 0 && (
                                    <div className="text-[10px] text-slate-600 mb-1">
                                      <span className="font-semibold">Creates:</span> {result.plan.creates.length} record(s)
                                    </div>
                                  )}
                                  {result.plan.updates?.length > 0 && (
                                    <div className="text-[10px] text-slate-600 mb-1">
                                      <span className="font-semibold">Updates:</span> {result.plan.updates.length} record(s)
                                    </div>
                                  )}
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
          </div>
        </ScrollArea>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!input.trim()) return
            sendPrompt()
          }}
          className="border-t border-slate-200 p-3 space-y-2"
        >
          <Textarea
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
              {streaming && (
                <Button size="sm" variant="outline" onClick={stop} type="button">
                  Stop
                </Button>
              )}
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!input.trim() || streaming}>
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
