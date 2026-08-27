/**
 * /orders/close — Close Order (SPEC-M6 §2 row 15, legacy FrmOrderClose).
 * Thin lifecycle screen over planCloseOrder (guards: ≥95% despatched +
 * invoiced; force override). Same service as the close_order tool.
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { LifecycleForm } from '@/components/erp/lifecycle-form'
import { closeOrderAction } from './actions'
import { Textarea } from '@/components/ui/textarea'

export const dynamic = 'force-dynamic'

export default async function CloseOrderPage() {
  const candidates = await db.order.findMany({
    where: { status: { in: ['open', 'in_progress'] } },
    include: { buyer: true },
    orderBy: { orderDate: 'desc' },
    take: 15,
  })
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/orders" className="hover:text-slate-800 hover:underline">Orders</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Close Order</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Close Order</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Close an order once shipped &amp; billed — blocks further entries. Guards: despatched ≥ 95% and an invoice exists
          (force overrides). Agent door: <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">close_order</code>.
        </p>
      </div>

      <LifecycleForm
        action={closeOrderAction}
        label="Close an order"
        docLabel="Order No"
        docPlaceholder="SO-1001"
        submitLabel="Close order"
      >
        <div>
          <label className="text-xs text-slate-500">Closing note (optional)</label>
          <Textarea name="notes" rows={2} placeholder="Final settlement note…" />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <input type="checkbox" id="force" name="force" className="h-4 w-4" />
          <label htmlFor="force" className="text-xs text-slate-600">Force (override guards)</label>
        </div>
      </LifecycleForm>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Order', 'Buyer', 'Pcs', 'Status', 'Delivery'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">No open orders.</td></tr>
            ) : candidates.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono font-medium"><Link href={`/orders/${o.id}`} className="hover:text-emerald-700 hover:underline">{o.orderNo}</Link></td>
                <td className="px-3 py-2">{o.buyer?.name ?? '—'}</td>
                <td className="px-3 py-2">{o.totalPcs}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.deliveryDate ? o.deliveryDate.toISOString().slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
