/**
 * /reports — Report Hub (SPEC-M6 §2 row 1; the reports group landing).
 * Catalog of the 28-report registry grouped by pack with search. The hub is
 * the legacy ~491-file report menu deduplicated to unique outputs.
 */
import Link from 'next/link'
import { BarChart3, FileText, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { REPORTS } from '@/lib/erp/report-configs'
import { REPORT_PACKS } from '@/lib/erp/report-configs/types'

export const dynamic = 'force-dynamic'

export default async function ReportHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? ''.toLowerCase()

  const matches = (r: (typeof REPORTS)[number]) =>
    !q || r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q) || r.slug.includes(q)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Reports & Analytics</span>
          <span>/</span>
          <span className="text-slate-700 font-medium">Report Hub</span>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Report Hub</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {REPORTS.length} parameterized reports across {REPORT_PACKS.length} packs — preview, CSV and print.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/reports/mis" className="text-sm text-emerald-700 hover:underline">
              MIS Dashboard →
            </Link>
          </div>
        </div>
      </div>

      <form action="/reports" className="flex items-center gap-2 print:hidden">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input name="q" defaultValue={q} placeholder="Search reports…" className="pl-8" />
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_PACKS.map((pack) => {
          const packReports = REPORTS.filter((r) => r.pack === pack.id && matches(r))
          return (
            <div key={pack.id} id={pack.id} className="rounded-lg border bg-white shadow-sm">
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-sm">{pack.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{packReports.length} reports</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{pack.description}</p>
              </div>
              <div className="divide-y">
                {packReports.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400">No reports match “{q}”.</div>
                ) : (
                  packReports.map((r) => (
                    <Link key={r.slug} href={`/reports/${r.slug}`} className="flex items-start gap-2 px-4 py-2.5 hover:bg-slate-50/60">
                      <FileText className="mt-0.5 h-3.5 w-3.5 text-slate-300" />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.description}</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
