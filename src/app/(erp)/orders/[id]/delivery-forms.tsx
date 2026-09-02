'use client'

/**
 * SPEC-M43 PRG-01 — the delivery-schedule editor (Order Hub section). Client
 * rows (qty/date/notes) + useActionState submit (the StockTakeForm pattern);
 * Add-row / remove-row are pure client state, the SAVE is the server action
 * (REPLACE set through planOrderDeliveries).
 */
import { useActionState, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export interface ScheduleRow { qty: number; date: string; notes: string }

export function DeliveryScheduleEditor({
  action, orderNo, orderId, initialRows, frozen, testId,
}: {
  action: (fd: FormData) => Promise<LifecycleActionResult>
  orderNo: string
  orderId: string
  initialRows: ScheduleRow[]
  frozen?: boolean
  testId?: string
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(initialRows.length ? initialRows : [{ qty: 0, date: '', notes: '' }])
  const [state, submit, pending] = useActionState(async (_prev: LifecycleActionResult | null, fd: FormData) => action(fd), null)

  if (frozen) {
    return (
      <div className="px-4 py-3 text-xs text-slate-500">
        Order cancelled — the schedule is frozen.
      </div>
    )
  }

  return (
    <form action={submit} className="space-y-3 px-4 py-4" data-testid={testId}>
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-xs text-slate-400 tabular-nums">{i + 1}.</span>
            <input
              name={`qty.${i + 1}`} type="number" min={0} defaultValue={r.qty} placeholder="qty pcs"
              className="h-8 w-28 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums"
              aria-label={`Shipment ${i + 1} qty`}
            />
            <input
              name={`date.${i + 1}`} type="date" defaultValue={r.date}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              aria-label={`Shipment ${i + 1} date`}
            />
            <input
              name={`notes.${i + 1}`} type="text" defaultValue={r.notes} placeholder="notes (optional)"
              className="h-8 flex-1 min-w-40 rounded-md border border-input bg-transparent px-2 text-sm"
              aria-label={`Shipment ${i + 1} notes`}
            />
            <button
              type="button" title="Remove row"
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input text-slate-400 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { qty: 0, date: '', notes: '' }])}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-input px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add shipment
        </button>
        <button
          type="submit" disabled={pending}
          className="h-8 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {pending ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
          {pending ? 'Saving…' : 'Save schedule'}
        </button>
        <span className="text-xs text-slate-500">
          Saves the full set (REPLACE) — total cannot exceed the order qty.
        </span>
        {state && <span className={`text-xs ${state.ok ? 'text-emerald-700' : 'text-red-600'}`}>{state.text}</span>}
      </div>
    </form>
  )
}
