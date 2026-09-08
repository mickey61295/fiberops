/**
 * Statutory register service — SPEC-M47 L-03 (Module L Batch 3, Phase-6B
 * §12). One row per PayrollLine × COMMITTED run (the payslip precedent: a
 * statutory view is over posted numbers — draft lines can still be ignored).
 * `variant` = head filter (pf|esi|pt|lwf — rows with that head nonzero),
 * `q` matches employee code/name or run no, `from`/`to` window the run
 * period (overlap). The service OWNS the sums. `get_statutory_register`
 * (agent tool) delegates here — json shape frozen. The CSV twin IS the
 * challan data export (per-head columns: UAN/esiNo + wage bases + EE/ER
 * legs — what an ECR/challan upload needs).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryStatutoryRegister(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { run: { status: 'committed' } }

  if (q.variant === 'pf') where.OR = [{ pfEe: { gt: 0 } }, { pfEr: { gt: 0 } }]
  else if (q.variant === 'esi') where.OR = [{ esiEe: { gt: 0 } }, { esiEr: { gt: 0 } }]
  else if (q.variant === 'pt') where.ptAmt = { gt: 0 }
  else if (q.variant === 'lwf') where.OR = [{ lwfEe: { gt: 0 } }, { lwfEr: { gt: 0 } }]

  if (q.from || q.to) {
    where.run = {
      status: 'committed',
      ...(q.to ? { from: { lte: q.to } } : {}),
      ...(q.from ? { to: { gte: q.from } } : {}),
    }
  }

  if (q.q) {
    const needle = q.q
    where.OR = [
      ...(where.OR ?? []),
      { employee: { code: { contains: needle } } },
      { employee: { name: { contains: needle } } },
      { run: { runNo: { contains: needle } } },
    ]
  }

  const [lines, count] = await Promise.all([
    db.payrollLine.findMany({
      where,
      include: { run: { select: { runNo: true, mode: true, from: true, to: true } }, employee: { select: { code: true, name: true, uan: true, esiNo: true } } },
      orderBy: [{ run: { createdAt: 'desc' } }, { employee: { code: 'asc' } }],
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.payrollLine.count({ where }),
  ])

  const rows: RegisterRow[] = lines.map((l) => ({
    id: l.id,
    href: `/hr/payroll/${l.runId}`,
    run: l.run.runNo,
    period: `${l.run.from.toISOString().slice(0, 10)} → ${l.run.to.toISOString().slice(0, 10)}`,
    employee: `${l.employee.code} ${l.employee.name}`,
    uan: l.employee.uan?.trim() || '—',
    esiNo: l.employee.esiNo?.trim() || '—',
    gross: Math.round(l.earned),
    pfWages: Math.round(l.pfWages),
    pfEe: Math.round(l.pfEe),
    pfEr: Math.round(l.pfEr),
    pfEps: Math.round(l.pfEps),
    pfEpf: Math.round(l.pfEpf),
    pfEdli: Math.round(l.pfEdli),
    pfAdmin: Math.round(l.pfAdmin),
    esiEe: Math.round(l.esiEe),
    esiEr: Math.round(l.esiEr),
    pt: Math.round(l.ptAmt),
    lwfEe: Math.round(l.lwfEe),
    lwfEr: Math.round(l.lwfEr),
    deduction: Math.round(l.statDeduction),
    net: Math.round(l.net),
  }))

  const gross = rows.reduce((s, r) => s + (r.gross as number), 0)
  const pfEe = rows.reduce((s, r) => s + (r.pfEe as number), 0)
  const esiEe = rows.reduce((s, r) => s + (r.esiEe as number), 0)
  const pt = rows.reduce((s, r) => s + (r.pt as number), 0)
  const lwf = rows.reduce((s, r) => s + (r.lwfEe as number), 0)
  const deduction = rows.reduce((s, r) => s + (r.deduction as number), 0)
  return {
    rows,
    totals: [
      { label: 'Lines', value: count },
      { label: 'Gross ₹', value: gross },
      { label: 'PF EE ₹', value: pfEe },
      { label: 'ESI EE ₹', value: esiEe },
      { label: 'PT ₹', value: pt },
      { label: 'LWF EE ₹', value: lwf },
      { label: 'Deduction ₹', value: deduction },
    ],
    summary: `${count} committed statutory line${count === 1 ? '' : 's'} — gross ₹${gross.toLocaleString('en-IN')}, employee deduction ₹${deduction.toLocaleString('en-IN')} (PF ₹${pfEe.toLocaleString('en-IN')} · ESI ₹${esiEe.toLocaleString('en-IN')} · PT ₹${pt.toLocaleString('en-IN')} · LWF ₹${lwf.toLocaleString('en-IN')})`,
    count,
  }
}
