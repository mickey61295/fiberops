/**
 * /orders/new — Order Sheet New mode (SPEC-M3 §8 row 1, item 'order-sheet-new').
 * DocScreen engine + recent-docs table below. The form door saves through
 * planOrder/commitOrder — the same service as create_order (ADR-001).
 */
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { orderConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const recent = await db.order.findMany({
    orderBy: { orderDate: 'desc' },
    take: orderConfig.recentCount ?? 20,
    include: { buyer: true, style: true },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/orders" className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700">
          <ChevronLeft className="h-4 w-4" /> Orders
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-base font-semibold">Order Sheet (new)</h1>
      </div>

      <DocScreen config={toScreenConfig(orderConfig)} mode="new" viewRoutePattern="/orders/[id]" />

      {/* recent docs */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold">
          Recent orders <span className="ml-1 text-xs font-normal text-slate-400">last {recent.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                {orderConfig.listColumns.map((c) => (
                  <th key={c.name} className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/orders/${o.id}`} className="text-emerald-700 hover:underline">{o.orderNo}</Link>
                  </td>
                  <td className="px-3 py-2">{o.buyer?.name ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.style?.styleNo ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{o.totalPcs.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">₹{o.totalValue.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2">{o.deliveryDate ? new Date(o.deliveryDate).toISOString().slice(0, 10) : '—'}</td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={orderConfig.listColumns.length} className="px-3 py-8 text-center text-sm text-slate-500">
                    No orders yet — create the first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
