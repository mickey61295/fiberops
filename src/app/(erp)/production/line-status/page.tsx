/**
 * /production/line-status — Live WIP per line (SPEC-M6 §2 row 13, legacy DB
 * archetype). Board page (NOT a RegisterScreen — the M4 order-status
 * pattern, §10): per-line issued vs produced vs WIP + efficiency, from the
 * SAME queryLineWip service the line-wip report renders (one query layer).
 */
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { queryLineWip } from '@/lib/erp/reports/core-reports'

export const dynamic = 'force-dynamic'

const fmtInt = (n: number) => (n || 0).toLocaleString('en-IN')

export default async function LineStatusPage() {
  const res = await queryLineWip({ limit: 200, page: 1 })
  const totalIssued = res.rows.reduce((s, r) => s + Number(r.issued ?? 0), 0)
  const totalProduced = res.rows.reduce((s, r) => s + Number(r.produced ?? 0), 0)
  const totalWip = res.rows.reduce((s, r) => s + Number(r.wip ?? 0), 0)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/production" className="hover:text-slate-800 hover:underline">Production</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Line Status</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Line Status — Live WIP</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Issued vs produced vs pending pieces per production line. Legacy used the EmpID-as-LineID trick; here
          LineIssue × ProductionEntry join on the real lineId.
        </p>
      </div>

      {/* KPI band */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Issued (all lines)</div>
          <div className="mt-1 text-2xl font-bold">{fmtInt(totalIssued)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Produced</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{fmtInt(totalProduced)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">WIP on lines</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{fmtInt(totalWip)}</div>
        </div>
      </div>

      {/* per-line table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Line</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Issues</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Issued</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Produced</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">WIP</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progress</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-slate-400">
                  No line issues yet — issue pieces to a line first.
                </td>
              </tr>
            ) : (
              res.rows.map((r) => {
                const issued = Number(r.issued ?? 0)
                const produced = Number(r.produced ?? 0)
                const wip = Number(r.wip ?? 0)
                const pct = issued > 0 ? Math.min(100, Math.round((produced / issued) * 100)) : 0
                return (
                  <tr key={r.id as string} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-mono font-medium">{r.line as string}</td>
                    <td className="px-3 py-2 text-slate-600">{(r.lineName as string) ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{fmtInt(Number(r.issues ?? 0))}</td>
                    <td className="px-3 py-2 text-right">{fmtInt(issued)}</td>
                    <td className="px-3 py-2 text-right">{fmtInt(produced)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${wip > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{fmtInt(wip)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-emerald-500/80" style={{ width: `${pct}%` }} />
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-slate-50">{pct}%</Badge>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Activity className="h-3.5 w-3.5" />
        Same numbers as the{' '}
        <Link href="/reports/line-wip" className="text-emerald-700 hover:underline">Line WIP report</Link>{' '}
        and the agent&apos;s <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">get_line_status</code>.
      </div>
    </div>
  )
}
