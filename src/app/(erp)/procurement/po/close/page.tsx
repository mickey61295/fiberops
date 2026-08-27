/**
 * /procurement/po/close — PO Cancel / Complete (SPEC-M6 §2 row 16, legacy).
 * Thin screen over planPoLifecycle (cancel delegates to planCancelPo — the
 * cancel_purchase_order service; complete requires receipts).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { LifecycleForm } from '@/components/erp/lifecycle-form'
import { poLifecycleAction } from './actions'
import { Textarea } from '@/components/ui/textarea'

export const dynamic = 'force-dynamic'

export default async function PoClosePage() {
  const pos = await db.purchaseOrder.findMany({
    where: { status: { in: ['open', 'partial'] } },
    include: { party: true, grns: true },
    orderBy: { createdAt: 'desc' },
    take: 15,
  })
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/procurement" className="hover:text-slate-800 hover:underline">Procurement</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">PO Cancel / Complete</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">PO Cancel / Complete</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Cancel (no receipts allowed — same service as{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">cancel_purchase_order</code>) or complete
          (receipts required) a purchase order. Agent door for complete:{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">complete_purchase_order</code>.
        </p>
      </div>

      <LifecycleForm action={poLifecycleAction} label="Settle a purchase order" docLabel="PO No" docPlaceholder="PO-1001" submitLabel="Apply">
        <div>
          <label className="text-xs text-slate-500">Action</label>
          <select name="action" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="complete">Complete (receipts exist)</option>
            <option value="cancel">Cancel (no receipts)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Reason (optional)</label>
          <Textarea name="reason" rows={2} />
        </div>
      </LifecycleForm>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['PO', 'Party', 'Qty', 'Received', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pos.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">No open POs.</td></tr>
            ) : pos.map((po) => (
              <tr key={po.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono font-medium"><Link href={`/procurement/po/${po.id}`} className="hover:text-emerald-700 hover:underline">{po.poNo}</Link></td>
                <td className="px-3 py-2">{po.party?.name ?? '—'}</td>
                <td className="px-3 py-2">{po.totalQty}</td>
                <td className="px-3 py-2">{po.grns.reduce((s, g) => s + g.totalQty, 0)}</td>
                <td className="px-3 py-2">{po.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
