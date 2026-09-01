/**
 * /procurement/po/amendments — PO Amendments (SPEC-M41 PRC-02, legacy
 * FrmPoAmend). Thin screen over planPoAmend (the planOrderAmend twin — one
 * service, two doors). History = the appended [amended …] notes trail + the
 * runCommit audit row.
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { amendPoAction } from './actions'
import { LifecycleForm } from '@/components/erp/lifecycle-form'

export const dynamic = 'force-dynamic'

export default async function PoAmendmentsPage() {
  const recent = await db.purchaseOrder.findMany({
    where: { status: { in: ['open', 'partial', 'received'] } },
    include: { party: true, lines: true },
    orderBy: { createdAt: 'desc' },
    take: 15,
  })
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/procurement" className="hover:text-slate-800 hover:underline">Procurement</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">PO Amendments</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">PO Amendments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Fix a mis-keyed rate or delivery date with a trail (qty below already-received refuses). Same service as the agent&apos;s{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">update_purchase_order</code>.
        </p>
      </div>

      <LifecycleForm
        action={amendPoAction}
        label="Amend a purchase order"
        docLabel="PO No"
        docPlaceholder="PO-Y-001"
        submitLabel="Apply amendment"
      >
        <div>
          <label className="text-xs text-slate-500">New delivery date</label>
          <input name="deliveryDate" type="date" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Status</label>
          <select name="status" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">keep</option>
            <option value="open">open</option>
            <option value="partial">partial</option>
            <option value="received">received</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Line revisions (JSON)</label>
          <textarea
            name="lines"
            rows={3}
            placeholder='[{"itemType":"yarn","itemCode":"YRN-001","qty":120,"rate":210}] — leave blank for header-only'
            className="w-full rounded-md border border-input bg-transparent p-2 text-sm font-mono"
          />
          <p className="mt-1 text-[11px] text-slate-400">Address lines by itemType + itemCode as written on the PO; pass qty and/or rate.</p>
        </div>
        <div>
          <label className="text-xs text-slate-500">Amendment note</label>
          <textarea name="notes" rows={2} placeholder="Reason for amendment…" className="w-full rounded-md border border-input bg-transparent p-2 text-sm" />
        </div>
      </LifecycleForm>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['PO', 'Party', 'Lines', 'Received', 'Status', 'Created'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">No open POs.</td></tr>
            ) : recent.map((po) => (
              <tr key={po.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono font-medium">{po.poNo}</td>
                <td className="px-3 py-2">{po.party?.name ?? '—'}</td>
                <td className="px-3 py-2">{po.lines.length}</td>
                <td className="px-3 py-2">{po.lines.map((l) => `${Math.round(l.receivedQty * 100) / 100}/${l.qty}`).join(', ') || '—'}</td>
                <td className="px-3 py-2">{po.status}</td>
                <td className="px-3 py-2">{po.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
