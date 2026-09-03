/**
 * Payroll runs register service — SPEC-M46 L-02 (Module L Batch 2, Phase-6B
 * §12). One row per PayrollRun: mode (piece|daily), period, lines, earned,
 * advances, net, status (draft|committed), committedAt. `variant` filters the
 * mode, `status` the lifecycle, `q` the run no. The service OWNS the sums —
 * lines are children, counts + money totals ride groupBy/aggregate so the
 * register never loads every line. `get_payroll_runs` (agent tool) delegates
 * here — json shape frozen.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryPayrollRuns(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.variant) where.mode = q.variant
  if (q.status) where.status = q.status
  if (q.q) where.runNo = { contains: q.q }

  const [runs, count] = await Promise.all([
    db.payrollRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.payrollRun.count({ where }),
  ])

  const runIds = runs.map((r) => r.id)
  const lineAggs = runIds.length
    ? await db.payrollLine.groupBy({
        by: ['runId'],
        where: { runId: { in: runIds } },
        _count: true,
        _sum: { earned: true, advances: true, net: true },
      })
    : []
  const aggByRun = new Map(lineAggs.map((a) => [a.runId, a]))

  const rows: RegisterRow[] = runs.map((r) => {
    const a = aggByRun.get(r.id)
    return {
      id: r.id,
      href: `/hr/payroll/${r.id}`,
      runNo: r.runNo,
      mode: r.mode,
      period: `${r.from.toISOString().slice(0, 10)} → ${r.to.toISOString().slice(0, 10)}`,
      lines: a?._count ?? 0,
      earned: Math.round(a?._sum.earned ?? 0),
      advances: Math.round(a?._sum.advances ?? 0),
      net: Math.round(a?._sum.net ?? 0),
      status: r.status,
      committed: r.committedAt ? r.committedAt.toISOString().slice(0, 10) : '—',
    }
  })

  const earned = rows.reduce((s, r) => s + (r.earned as number), 0)
  const net = rows.reduce((s, r) => s + (r.net as number), 0)
  const committedCount = runs.filter((r) => r.status === 'committed').length
  return {
    rows,
    totals: [
      { label: 'Runs', value: count },
      { label: 'Committed', value: committedCount },
      { label: 'Earned ₹', value: earned },
      { label: 'Net ₹', value: net },
    ],
    summary: `${count} payroll run${count === 1 ? '' : 's'} (${committedCount} committed) — earned ₹${earned.toLocaleString('en-IN')}, net payable ₹${net.toLocaleString('en-IN')}`,
    count,
  }
}
