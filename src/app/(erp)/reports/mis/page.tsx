/**
 * /reports/mis — MIS Dashboard (SPEC-M6 §2 row 3, the DB archetype). KPI
 * tiles + a 14-day production bar chart (CSS — no chart lib, §3 rule 6),
 * every number computed by REPORT SERVICES (§4 rule: the dashboard imports
 * the report layer, zero new queries) and deep-linked to its report.
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, ClipboardCheck, IndianRupee, Package, TrendingUp } from 'lucide-react'
import { REPORT_SERVICES } from '@/lib/erp/reports'
import { getUpcomingHolidays } from '@/lib/erp/holidays' // SPEC-M28 — the shutdown strip
import { queryOrderStatus } from '@/lib/erp/registers/order-status'
import type { RegisterQuery } from '@/lib/erp/registers/types'

export const dynamic = 'force-dynamic'

const q = (over: Partial<RegisterQuery> = {}): RegisterQuery => ({ limit: 500, page: 1, ...over })
const fmtINR = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN')
const fmtInt = (n: number) => (n || 0).toLocaleString('en-IN')

function Tile({ label, value, sub, href, icon: Icon, tone }: {
  label: string; value: string; sub?: string; href: string; icon: React.ComponentType<{ className?: string }>; tone: 'emerald' | 'sky' | 'amber' | 'indigo' | 'rose'
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <Link href={href} className="group rounded-lg border bg-white p-4 shadow-sm hover:border-emerald-200 hover:shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
        </div>
        <div className={`rounded-md p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}

export default async function MisDashboardPage() {
  const from14 = new Date(Date.now() - 13 * 86_400_000)
  from14.setHours(0, 0, 0, 0)

  const [status, currentStock, outstanding, dailyInOut, topBuyers, audit] = await Promise.all([
    queryOrderStatus(),
    REPORT_SERVICES['current-stock'](q()),
    REPORT_SERVICES['outstanding-summary'](q()),
    REPORT_SERVICES['daily-in-out'](q({ from: from14 })),
    REPORT_SERVICES['despatch-packing-summary'](q()),
    REPORT_SERVICES['approval-audit'](q()),
  ])

  // SPEC-M28 §7-H — upcoming shutdowns (Pongal/Deepavali planning reflex)
  const holidays = await getUpcomingHolidays({ days: 45 })

  // SPEC-M41 PRC-07 — DCs without a gate pass (the recon card): despatched/
  // loading DCs with NO OUT-side gate row referencing them. Silent when clean
  // (the M28 discipline).
  const recentDcs = await db.pcsDespatch.findMany({
    where: { status: { in: ['loading', 'despatched'] } },
    orderBy: { despatchDate: 'desc' },
    take: 200,
    select: { dcNo: true, totalPcs: true, despatchDate: true, status: true },
  })
  const gateRefs = recentDcs.length
    ? new Set((await db.gateEntry.findMany({
        where: { gateType: 'out', refDocNo: { in: recentDcs.map((d) => d.dcNo) } },
        select: { refDocNo: true },
      })).map((g) => g.refDocNo).filter(Boolean) as string[])
    : new Set<string>()
  const dcsWithoutGate = recentDcs.filter((d) => !gateRefs.has(d.dcNo))

  const stockValue = Number(currentStock.totals?.find((t) => t.label === 'Value')?.value ?? 0)
  const ar = Number(outstanding.totals?.find((t) => t.label === 'AR Outstanding')?.value ?? 0)
  const ap = Number(outstanding.totals?.find((t) => t.label === 'AP Outstanding')?.value ?? 0)
  const pendingApprovals = audit.rows.filter((r) => r.status === 'pending').length

  // 14-day production bars: Σ inPcs per day from daily-in-out rows
  const byDay = new Map<string, number>()
  for (const r of dailyInOut.rows) {
    const d = r.docDate ? new Date(r.docDate as string).toISOString().slice(0, 10) : '—'
    byDay.set(d, (byDay.get(d) ?? 0) + Number(r.inPcs ?? 0))
  }
  const days: { key: string; label: string; pcs: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    days.push({ key, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), pcs: byDay.get(key) ?? 0 })
  }
  const maxPcs = Math.max(1, ...days.map((d) => d.pcs))

  const top5 = [...topBuyers.rows].slice(0, 5)
  const maxBuyerValue = Math.max(1, ...top5.map((r) => Number(r.value ?? 0)))

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/reports" className="hover:text-slate-800 hover:underline">Reports & Analytics</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">MIS Dashboard</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">MIS Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Management view — every tile deep-links its report (the M4-C KPI pattern).</p>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label="Open Orders" value={fmtInt(status.totalOpenOrders)} sub={`${fmtInt(status.totalOpenPcs)} pcs open · avg ${status.avgStagesDone.toFixed(1)}/15 stages`} href="/reports/order-status-summary?status=open" icon={Package} tone="emerald" />
        <Tile label="Stock Value" value={fmtINR(stockValue)} sub="current stock at rate" href="/reports/current-stock" icon={Boxes} tone="sky" />
        <Tile label="Receivables (AR)" value={fmtINR(ar)} sub="outstanding, aging in report" href="/reports/outstanding-summary" icon={ArrowUpRight} tone="indigo" />
        <Tile label="Payables (AP)" value={fmtINR(ap)} sub="supplier outstanding" href="/reports/outstanding-summary" icon={ArrowDownRight} tone="amber" />
        <Tile label="Pending Approvals" value={fmtInt(pendingApprovals)} sub="all kinds, inbox drill" href="/approvals" icon={ClipboardCheck} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* SPEC-M28 — upcoming shutdowns: the Tirupur planning reflex */}
      {holidays.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4" data-testid="holiday-strip">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-amber-900">Upcoming shutdowns</div>
            <Link href="/masters/govt-holiday" className="text-xs text-amber-700 hover:underline">holiday calendar →</Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {holidays.slice(0, 4).map((h, i) => (
              <span key={i} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-900">
                <span className="font-medium">{h.name}</span>{' '}
                <span className="text-amber-600">
                  {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  {h.daysUntil === 0 ? ' · today' : ` · ${h.daysUntil}d`}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SPEC-M41 PRC-07 — DCs without a gate pass (recon; silent when clean) */}
      {dcsWithoutGate.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4" data-testid="dc-gate-recon">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-rose-900">DCs without a gate pass</div>
            <Link href="/dispatch/register" className="text-xs text-rose-700 hover:underline">despatch register →</Link>
          </div>
          <div className="mt-2 space-y-1">
            {dcsWithoutGate.slice(0, 6).map((d) => (
              <div key={d.dcNo} className="flex items-center justify-between text-xs text-rose-900">
                <span className="font-mono font-medium">{d.dcNo}</span>
                <span className="text-rose-600">{d.totalPcs} pcs · {d.status} · {new Date(d.despatchDate).toISOString().slice(0, 10)}</span>
              </div>
            ))}
            {dcsWithoutGate.length > 6 && (
              <div className="text-[11px] text-rose-500">… and {dcsWithoutGate.length - 6} more</div>
            )}
          </div>
        </div>
      )}

      {/* 14-day production bar chart */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-sm">Production In — last 14 days</span>
            </div>
            <Link href="/reports/daily-in-out" className="text-xs text-emerald-700 hover:underline">Daily In-Out →</Link>
          </div>
          <div className="mt-4 flex h-40 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="group relative flex-1">
                <div
                  className={`w-full rounded-t ${d.pcs > 0 ? 'bg-emerald-500/80 group-hover:bg-emerald-600' : 'bg-slate-100'}`}
                  style={{ height: `${Math.max(4, (d.pcs / maxPcs) * 150)}px` }}
                  title={`${d.label}: ${fmtInt(d.pcs)} pcs in`}
                />
                <div className="mt-1 text-center text-[9px] text-slate-400">{d.label.split(' ')[0]}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Peak {fmtInt(maxPcs)} pcs · Σ {fmtInt(days.reduce((s, d) => s + d.pcs, 0))} pcs in (14d)
          </div>
        </div>

        {/* Top buyers by despatch value */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-indigo-600" />
              <span className="font-semibold text-sm">Top Buyers by Despatch Value</span>
            </div>
            <Link href="/reports/despatch-packing-summary" className="text-xs text-emerald-700 hover:underline">Full report →</Link>
          </div>
          <div className="mt-4 space-y-3">
            {top5.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No despatches yet.</div>
            ) : (
              top5.map((r) => (
                <Link key={r.id} href={r.href ?? '/reports/despatch-packing-summary'} className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{r.buyer as string}</span>
                    <span className="font-semibold text-slate-900">{fmtINR(r.value as number)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-indigo-500/70" style={{ width: `${Math.max(3, (Number(r.value ?? 0) / maxBuyerValue) * 100)}%` }} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <AlertCircle className="h-3.5 w-3.5" />
        All tiles computed by the report services (one query layer); the agent renders the same numbers via
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">render_report</code>.
        <BarChart3 className="ml-1 h-3.5 w-3.5" />
      </div>
    </div>
  )
}
