/**
 * /orders/amendments — Order Amendments (SPEC-M6 §2 row 14, legacy
 * FrmOrderAmend). Thin screen over planOrderAmend (the extracted update_order
 * logic — one service, two doors). History = updatedAt + notes.
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { LifecycleForm } from '@/components/erp/lifecycle-form'
import { amendOrderAction } from './actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export const dynamic = 'force-dynamic'

export default async function OrderAmendmentsPage() {
  const recent = await db.order.findMany({
    where: { status: { in: ['open', 'in_progress'] } },
    include: { buyer: true },
    orderBy: { updatedAt: 'desc' },
    take: 15,
  })
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/orders" className="hover:text-slate-800 hover:underline">Orders</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Amendments</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Order Amendments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Amend a confirmed order with history kept (updatedAt + notes trail). Same service as the agent&apos;s{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">update_order</code>.
        </p>
      </div>

      <LifecycleForm
        action={amendOrderAction}
        label="Amend an order"
        docLabel="Order No"
        docPlaceholder="SO-1001"
        submitLabel="Apply amendment"
      >
        <div>
          <label className="text-xs text-slate-500">New delivery date</label>
          <Input name="deliveryDate" type="date" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Amended qty (pcs)</label>
          <Input name="totalPcs" type="number" min={1} placeholder="leave blank to keep" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Status</label>
          <select name="status" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">keep</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Amendment note</label>
          <Textarea name="notes" rows={2} placeholder="Reason for amendment…" />
        </div>
      </LifecycleForm>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Order', 'Buyer', 'Pcs', 'Status', 'Last Updated'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">No open orders.</td></tr>
            ) : recent.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono font-medium"><Link href={`/orders/${o.id}`} className="hover:text-emerald-700 hover:underline">{o.orderNo}</Link></td>
                <td className="px-3 py-2">{o.buyer?.name ?? '—'}</td>
                <td className="px-3 py-2">{o.totalPcs}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.updatedAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
