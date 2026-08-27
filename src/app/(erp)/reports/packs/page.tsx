/**
 * /reports/packs — domain report packs (SPEC-M6 §2 row 2). The 6 legacy
 * domain .rpt sets as pack landing cards: each card lists its reports and
 * deep-links the runner.
 */
import Link from 'next/link'
import { BarChart3, ChevronRight, Layers } from 'lucide-react'
import { REPORTS } from '@/lib/erp/report-configs'
import { REPORT_PACKS } from '@/lib/erp/report-configs/types'

export const dynamic = 'force-dynamic'

export default function ReportPacksPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/reports" className="hover:text-slate-800 hover:underline">Reports & Analytics</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Report Packs</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Report Packs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Domain-wise report sets — the legacy Order / Production / Inventory / Accounts packs (plus costing-HR and quality).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_PACKS.map((pack) => {
          const packReports = REPORTS.filter((r) => r.pack === pack.id)
          return (
            <div key={pack.id} id={pack.id} className="rounded-lg border bg-white shadow-sm">
              <div className="border-b bg-slate-50/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-sm">{pack.label}</span>
                  <span className="ml-auto text-[11px] text-slate-400">{packReports.length} reports</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{pack.description}</p>
              </div>
              <div className="divide-y">
                {packReports.map((r) => (
                  <Link key={r.slug} href={`/reports/${r.slug}`} className="group flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/60">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{r.title}</div>
                      <div className="text-xs text-slate-500">{r.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600" />
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BarChart3 className="h-3.5 w-3.5" />
        Need a number fast? The agent renders any report:
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">render_report(slug: &quot;outstanding-summary&quot;)</code>
      </div>
    </div>
  )
}
