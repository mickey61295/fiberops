/**
 * /orders/status — Order Status Board (SPEC-M4 §10, DB archetype — NOT a
 * RegisterScreen; item 'order-status-board', legacy frmOrdStat family).
 * Every open/in_progress order with buyer + delivery + the 15-dot chain bar
 * (same ChainBar the doc screens use, fed by queryOrderStatus's flags) +
 * done-count n/15 + next-stage chip + row link to the Order Hub.
 * Sort: deliveryDate asc (soonest first), nulls last (service-sorted).
 * The get_order_status agent tool returns the same rows.
 */
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ChainBar } from '@/components/erp/chain-bar'
import { queryOrderStatus } from '@/lib/erp/registers/order-status'

export const dynamic = 'force-dynamic'

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default async function OrderStatusBoardPage() {
  const res = await queryOrderStatus()

  return (
    <div className="space-y-4">
      {/* breadcrumb + title */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 hover:underline">Home</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Order Status Board</span>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Order Status Board</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Every open order across the 15-stage chain — soonest delivery first.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600">get_order_status</Badge>
            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600">suggest_next_step</Badge>
          </div>
        </div>
      </div>

      {/* header KPIs (§10) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Open orders</div>
          <div className="text-2xl font-bold text-slate-900">{res.totalOpenOrders}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Open pcs</div>
          <div className="text-2xl font-bold text-slate-900">{res.totalOpenPcs.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Avg stages done</div>
          <div className="text-2xl font-bold text-slate-900">{res.avgStagesDone}<span className="text-sm font-normal text-slate-400">/15</span></div>
        </div>
      </div>

      <div className="text-xs text-slate-500">{res.summary}</div>

      {/* board */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Order</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Buyer</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Delivery</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pcs</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chain</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Next stage</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-slate-400">
                  No open or in-progress orders — everything is shipped.
                </td>
              </tr>
            ) : (
              res.rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">
                    <Link href={r.href} className="font-mono text-[13px] font-medium text-slate-800 hover:text-emerald-700 hover:underline">
                      {r.orderNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{r.buyer ?? '—'}</td>
                  <td className="px-3 py-2.5">{fmtDate(r.deliveryDate)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.totalPcs.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2.5">
                    <ChainBar state={r.flags} ctx={{ orderNo: r.orderNo, id: r.id }} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="mr-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {r.stagesDone}/15
                    </span>
                    {r.nextStage ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        {r.nextStage.split(' (')[0]}
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600">chain complete</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
