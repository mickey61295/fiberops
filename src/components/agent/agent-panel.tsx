'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useEffect, useRef } from 'react'
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

interface PendingApproval {
  toolName: string
  args: any
  plan: any
  messageId: string
}

const SUGGESTED_PROMPTS = [
  'List all open purchase orders',
  'Show me the stock position in the Main godown',
  'Create a sales order for buyer B001, style S-1001, 5000 pcs (Red/M=1000, Red/L=1000, Blue/M=1500, Blue/L=1500), delivery 2026-10-15',
  'Show me production status for SO-1001',
  'Get dashboard KPIs',
  'Show me pending approvals',
]

export function AgentPanel({ open, onOpenChange, onCommitted }: AgentPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, PendingApproval>>({})
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({})

  const { messages, input, setInput, handleSubmit, handleInputChange, status, stop, error } = useChat({
    api: '/api/agent',
    onError: (e) => {
      console.error('chat error', e)
      toast.error('Agent error: ' + e.message)
    },
    onFinish: () => {
      // scroll to bottom
    },
  })

  // Defensive: AI SDK may return undefined input during SSR
  const safeInput = typeof input === 'string' ? input : ''
  const safeHandleInputChange = (e: any) => {
    // Prefer the AI SDK's handler when available
    if (typeof handleInputChange === 'function') {
      handleInputChange(e)
      return
    }
    // Fallback: update state directly via setInput
    if (typeof setInput === 'function' && e?.target?.value !== undefined) {
      setInput(e.target.value)
    }
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  // Extract pending approvals from tool results in messages
  useEffect(() => {
    const newPending: Record<string, PendingApproval> = {}
    for (const m of messages) {
      if (m.role === 'assistant' && m.parts) {
        for (const part of m.parts as any[]) {
          if (part.type === 'tool-invocation' && part.state === 'result') {
            const result = part.result
            if (result?.isWrite && result?.plan && (result?.hasCommitFn || result?._commitFn)) {
              newPending[part.toolCallId] = {
                toolName: result.toolName,
                args: part.args,
                plan: result.plan,
                messageId: m.id,
              }
            }
          }
        }
      }
    }
    setPendingApprovals(newPending) // eslint-disable-line react-hooks/set-state-in-effect
  }, [messages])

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
        toast.success(`Approved: ${pending.plan.summary.slice(0, 60)}...`)
        // Remove from pending
        setPendingApprovals((prev) => {
          const next = { ...prev }
          delete next[toolCallId]
          return next
        })
        // Trigger refresh
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

  const toggleExpand = (id: string) => {
    setExpandedResults((prev) => ({ ...prev, [id]: !prev[id] }))
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

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="font-medium text-slate-900 mb-2">I'm your AI agent for the Fiberpro Garment ERP.</p>
                  <p className="text-xs">I can read & write data across all modules — orders, procurement, inventory, cutting, production, accounting, costing, HR, and approvals. Write actions show you a plan first; you approve before anything commits.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Try these</div>
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // 1. Update input state
                        if (typeof setInput === 'function') {
                          setInput(p)
                        }
                        // 2. Wait for state flush, then submit form
                        setTimeout(() => {
                          const form = document.querySelector('form')
                          if (form) (form as HTMLFormElement).requestSubmit()
                        }, 150)
                      }}
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
                  <div className="max-w-[80%] bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="space-y-2 w-full">
                    {/* Render assistant text */}
                    {m.content && (
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</div>
                    )}
                    {/* Render tool calls */}
                    {(m.parts as any[])?.filter((p) => p.type === 'tool-invocation').map((part: any, i: number) => {
                      const isExpanded = expandedResults[`${m.id}-${i}`]
                      const result = part.result
                      const isPending = result?.isWrite && result?.plan && pendingApprovals[part.toolCallId]
                      const isError = result?.error
                      return (
                        <Card key={i} className={`p-3 border ${isError ? 'border-red-300 bg-red-50' : isPending ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex items-start gap-2">
                            <div className="h-6 w-6 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <Wrench className="h-3.5 w-3.5 text-slate-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-semibold text-slate-900">{part.toolName}</span>
                                {part.state === 'call' && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300"><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />calling</Badge>}
                                {part.state === 'result' && !isError && !isPending && <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">ok</Badge>}
                                {isError && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300"><AlertCircle className="h-2.5 w-2.5 mr-1" />error</Badge>}
                                {isPending && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">pending approval</Badge>}
                              </div>
                              {/* Args */}
                              {part.args && (
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
                                      {JSON.stringify(part.args, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                              {/* Result preview */}
                              {result?.text && (
                                <div className="mt-1.5 text-xs text-slate-700">{result.text}</div>
                              )}
                              {result?.error && (
                                <div className="mt-1.5 text-xs text-red-700">{result.error}</div>
                              )}
                              {/* JSON result, collapsible */}
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
                              {/* Approval card */}
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
                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(part.toolCallId)}>
                                      <Check className="h-3 w-3 mr-1" /> Approve & Commit
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reject(part.toolCallId)}>
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

            {status === 'streaming' && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            )}
            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                Error: {error.message}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!safeInput.trim()) return
            handleSubmit(e)
          }}
          className="border-t border-slate-200 p-3 space-y-2"
        >
          <Textarea
            value={safeInput}
            onChange={safeHandleInputChange}
            placeholder="Ask the agent to do anything in the ERP — e.g. 'Create a yarn PO for SUP001, 500 kg of 30s cotton at ₹180/kg, delivery 2026-09-05'"
            className="min-h-[60px] max-h-[120px] resize-y text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (safeInput.trim()) {
                  handleSubmit(e as any)
                }
              }
            }}
          />
          <div className="flex justify-between items-center">
            <div className="text-[10px] text-slate-500">
              {messages.length} msgs · {status}
            </div>
            <div className="flex gap-2">
              {status === 'streaming' && (
                <Button size="sm" variant="outline" onClick={stop}>
                  Stop
                </Button>
              )}
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!safeInput.trim() || status === 'streaming'}>
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
