'use client'

/**
 * SPEC-M6 §6 (Wave D) — the manual approval QUEUE strip for the four
 * acceptance IN screens. Server pages fetch the eligible documents that lack
 * an Approval row of the kind; each card's "Send to acceptance" button calls
 * sendToAcceptanceAction (idempotent) and refreshes. The strip is empty-safe:
 * an empty queue renders a quiet hint, never a dead screen.
 */
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Clock, ExternalLink, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { sendToAcceptanceAction } from '@/lib/erp/approval-queue'

export interface QueueCardRow {
  /** the underlying document id (Approval.entityId) */
  entityId: string
  /** card title, e.g. the GRN no */
  title: string
  /** primitive detail rows — [label, value] */
  details: Array<[string, string]>
  /** W2 drill href (optional) */
  href?: string | null
}

export function ApprovalQueue({
  kind,
  title,
  rows,
}: {
  kind: string
  title: string
  rows: QueueCardRow[]
}) {
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState<Set<string>>(new Set())

  if (rows.length === 0) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        Queue empty — every eligible document already has a {title.toLowerCase()} row (or nothing qualifies yet).
      </Card>
    )
  }

  const send = (entityId: string) => {
    startTransition(async () => {
      const r = await sendToAcceptanceAction(kind, entityId)
      if (r.ok) {
        setSent((s) => new Set(s).add(entityId))
        toast.success(r.created ? 'Sent to acceptance — pending row created' : 'Already has an acceptance row')
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {rows.map((row) => {
        const done = sent.has(row.entityId)
        return (
          <Card key={row.entityId} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <div className="text-sm font-bold uppercase">{row.title}</div>
                  <div className="text-xs text-slate-500">Eligible — no acceptance row yet</div>
                </div>
              </div>
            </div>
            {row.details.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded text-xs space-y-1">
                {row.details.map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="bg-slate-800 hover:bg-slate-900 text-white"
                disabled={pending || done}
                onClick={() => send(row.entityId)}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> {done ? 'Sent' : 'Send to acceptance'}
              </Button>
              {row.href && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={row.href}><ExternalLink className="h-3.5 w-3.5 mr-1" /> View</Link>
                </Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
