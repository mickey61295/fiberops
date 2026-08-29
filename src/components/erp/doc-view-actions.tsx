'use client'

/**
 * SPEC-M18 §4-C1/C2 (Wave C) — the doc-view action row.
 *
 * Cancel / Void: shown only for the four families with cancel services
 * (order, purchase-order, invoice, program) and only while the doc is in a
 * non-terminal status. Two-step safety: the button PLANS first (the dialog
 * shows the service's own summary + side-effects), the operator adds an
 * optional reason, Confirm re-runs plan + commit — the same services the
 * agent tools and the /close form doors use (ADR-001).
 *
 * Duplicate: client-only — stashes the viewed doc under
 * sessionStorage['fo.duplicate.<slug>'] and opens the family's New screen,
 * which seeds header + lines from the stash (fresh number, dates from source)
 * and toasts the source doc.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { planCancelDocView, commitCancelDocView } from '@/lib/erp/cancel-action'
import { NEW_ROUTE_BY_SLUG } from '@/lib/erp/new-routes'

/** the four families with cancel services (client copy of cancel-action.ts's
 * CANCEL_PLAN keyset — 'use server' files export async functions only) */
const CANCELABLE_SLUGS = new Set(['order', 'purchase-order', 'invoice', 'program'])

/** Statuses in which the cancel door is hidden (terminal states). The service
 * guards regardless — this is muscle-memory hygiene, not the enforcement. */
const CANCEL_HIDDEN_STATUS: Record<string, string[]> = {
  order: ['cancelled', 'completed'],
  // 'completed' AND the 'complete' spelling the lifecycle service checks
  'purchase-order': ['cancelled', 'received', 'completed', 'complete'],
  invoice: ['cancelled', 'paid'],
  program: ['cancelled', 'completed', 'complete'],
}

export interface DocViewActionsProps {
  slug: string
  docNo?: string
  /** current doc status (view pages pass it via initial.status) */
  status?: string
  /** the viewed doc, for the Duplicate stash */
  seed?: { docNo?: string; header?: Record<string, unknown>; lines?: unknown }
}

export function DocViewActions({ slug, docNo, status, seed }: DocViewActionsProps) {
  const router = useRouter()
  const [planOpen, setPlanOpen] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [reason, setReason] = useState('')
  const [plan, setPlan] = useState<{ summary: string; sideEffects: string[] } | null>(null)

  const number = docNo || seed?.docNo || ''
  const canCancel = !!number && CANCELABLE_SLUGS.has(slug) && !(CANCEL_HIDDEN_STATUS[slug] ?? []).includes(status ?? '')
  const duplicateRoute = number ? NEW_ROUTE_BY_SLUG[slug] : undefined
  if (!canCancel && !duplicateRoute) return null

  const cancelLabel = slug === 'invoice' ? 'Void invoice' : slug === 'order' ? 'Cancel order' : slug === 'program' ? 'Cancel program' : 'Cancel PO'

  async function openCancelDialog() {
    setPlanning(true)
    const res = await planCancelDocView(slug, number)
    setPlanning(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setPlan(res.plan)
    setReason('')
    setPlanOpen(true)
  }

  async function confirmCancel() {
    if (committing || !plan) return
    setCommitting(true)
    const res = await commitCancelDocView(slug, number, reason.trim())
    setCommitting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setPlanOpen(false)
    toast.success(res.summary)
    router.refresh()
  }

  function duplicate() {
    try {
      const header: Record<string, unknown> = { ...(seed?.header ?? {}) }
      delete header.status // housekeeping field, never a form field
      sessionStorage.setItem(
        `fo.duplicate.${slug}`,
        JSON.stringify({ docNo: number, header, lines: Array.isArray(seed?.lines) ? seed?.lines : [] }),
      )
    } catch {
      toast.error('Could not stash the document for duplication')
      return
    }
    router.push(duplicateRoute!)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCancel && (
        <Button size="sm" variant="outline" onClick={openCancelDialog} disabled={planning}
          title="Status transition only — the same posting service the agent uses">
          {planning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
          {cancelLabel}
        </Button>
      )}
      {duplicateRoute && (
        <Button size="sm" variant="outline" onClick={duplicate}
          title={`Open a New form prefilled from ${number} (fresh document number)`}>
          <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
        </Button>
      )}

      <Dialog open={planOpen} onOpenChange={(o) => !committing && setPlanOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cancelLabel} {number}?</DialogTitle>
            <DialogDescription>
              {plan?.summary}
            </DialogDescription>
          </DialogHeader>
          {plan && plan.sideEffects.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              {plan.sideEffects.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
          <div>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional — stored with the document)" aria-label="Cancellation reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPlanOpen(false)} disabled={committing}>Keep it</Button>
            <Button variant="destructive" size="sm" onClick={confirmCancel} disabled={committing}
              title="Re-runs the plan, then commits the status transition">
              {committing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Yes, {slug === 'invoice' ? 'void' : 'cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
