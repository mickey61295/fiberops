'use client'
/**
 * The "Send now" door on the digest screen (SPEC-M9 §9 M13) — POSTs to
 * /api/cron/digest and surfaces the flags' verdict (armed/webhook/status).
 */
import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DigestSendButton() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const send = async () => {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/digest', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (body.sent) setResult(`Sent — webhook responded ${body.status}`)
      else setResult(body.reason ?? body.error ?? 'Not sent')
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-slate-500" data-digest-send-result>{result}</span>}
      <Button size="sm" onClick={send} disabled={busy} data-digest-send>
        <Send className="h-3.5 w-3.5 mr-1" /> {busy ? 'Sending…' : 'Send now'}
      </Button>
    </div>
  )
}
