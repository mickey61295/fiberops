/**
 * Statutory register service — SPEC-M48 L-03 (Module L Batch 3, Phase-6B §12).
 * The remittance view: one row per COMMITTED run × head (PF/ESI/PT/LWF) with
 * the employee share (deducted), employer share (cost) and total — the CSV
 * twin is the challan data export (what you fill into the ECR / ESIC return).
 * `variant` filters the head; `q` the run no. DRAFT runs stay out (nothing
 * posts at draft — a payslip-grade surface shows posted numbers only).
 *
 * The per-head PENDING remittance comes from the authority party's LEDGER
 * (−Σ journals + Σ payments to it — loop-closure #4), not from a shadow sum:
 * the ledger is the ground truth, so the register can never disagree with it.
 * `get_statutory_register` (agent tool) delegates here — one service, both
 * doors (ADR-001).
 */
import { db } from '@/lib/db'
import { STATUTORY_HEADS, ensureStatutoryParties } from '../statutory'
import { getPartyLedgerSummary } from './party-ledger'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryStatutoryRegister(q: RegisterQuery): Promise<RegisterResult> {
  // committed runs only (the register is a posted-numbers surface)
  const runWhere: any = { status: 'committed' }
  if (q.q) runWhere.runNo = { contains: q.q }
  const runs = await db.payrollRun.findMany({
    where: runWhere,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { id: true, runNo: true, mode: true, from: true, to: true, committedAt: true },
  })
  const runIds = runs.map((r) => r.id)
  const lines = runIds.length
    ? await db.payrollLine.findMany({
        where: { runId: { in: runIds } },
        select: { runId: true, pf: true, pfEmployer: true, esi: true, esiEmployer: true, pt: true, lwf: true },
      })
    : []

  // per-head sums per run (the lwf employer share derives from the run's
  // FROZEN config — applies where the line's lwf head ran)
  const frozenCfg = new Map<string, any>()
  if (runIds.length) {
    const withCfg = await db.payrollRun.findMany({ where: { id: { in: runIds } }, select: { id: true, statutory: true } })
    for (const r of withCfg) frozenCfg.set(r.id, r.statutory)
  }
  const lwfEmployerByRun = new Map<string, number>()
  for (const r of runs) {
    const cfg = frozenCfg.get(r.id)
    const emp = cfg?.lwf?.employer ?? 0
    lwfEmployerByRun.set(r.id, Number.isFinite(emp) && emp > 0 ? emp : 0)
  }

  // the authority parties + their ledger balances (pending remittance =
  // −balance: balance = opening − ΣJ2 journals + Σ payments-to-authority, so
  // pre-remittance it is NEGATIVE by exactly what we owe — M45's §5 row 12
  // convention; the party-ledger is the ground truth, the register mirrors it)
  const parties = await ensureStatutoryParties()
  const pendingByHead = new Map<string, number>()
  for (const [key, party] of parties) {
    const summary = await getPartyLedgerSummary(party.id).catch(() => null)
    // `|| 0` normalizes the settled −0 (JS negative zero) to a clean 0
    pendingByHead.set(key, summary ? Math.round(-summary.balance * 100) / 100 || 0 : 0)
  }

  const rows: RegisterRow[] = []
  for (const r of runs) {
    const rl = lines.filter((l) => l.runId === r.id)
    for (const h of STATUTORY_HEADS) {
      const employee = rl.reduce((s, l) => s + (l as any)[h.key], 0)
      const employer =
        h.key === 'pf'
          ? rl.reduce((s, l) => s + l.pfEmployer, 0)
          : h.key === 'esi'
            ? rl.reduce((s, l) => s + l.esiEmployer, 0)
            : h.key === 'lwf'
              ? rl.reduce((s, l) => s + (l.lwf > 0 ? lwfEmployerByRun.get(r.id) ?? 0 : 0), 0)
              : 0 // PT: no employer share
      const total = employee + employer
      if (!(total > 0)) continue
      const party = parties.get(h.key)!
      rows.push({
        id: `${r.id}:${h.key}`,
        href: `/hr/payroll/${r.id}`,
        runNo: r.runNo,
        mode: r.mode,
        period: `${r.from.toISOString().slice(0, 10)} → ${r.to.toISOString().slice(0, 10)}`,
        head: h.label,
        employee: Math.round(employee),
        employer: Math.round(employer),
        total: Math.round(total),
        authority: party.code,
        pending: pendingByHead.get(h.key) ?? 0,
        committed: r.committedAt ? r.committedAt.toISOString().slice(0, 10) : '—',
      })
    }
  }

  // the head filter (variant = pf|esi|pt|lwf)
  const filtered = q.variant ? rows.filter((r) => String(r.head).toLowerCase() === String(q.variant).toLowerCase()) : rows
  const start = (q.page - 1) * q.limit
  const pageRows = filtered.slice(start, start + q.limit)

  const employee = filtered.reduce((s, r) => s + (r.employee as number), 0)
  const employer = filtered.reduce((s, r) => s + (r.employer as number), 0)
  const total = filtered.reduce((s, r) => s + (r.total as number), 0)
  const pendingText = STATUTORY_HEADS
    .map((h) => `${h.label} ${parties.get(h.key)?.code}: ₹${(pendingByHead.get(h.key) ?? 0).toLocaleString('en-IN')}`)
    .join(' · ')

  return {
    rows: pageRows,
    totals: [
      { label: 'Rows', value: filtered.length },
      { label: 'Employee ₹', value: Math.round(employee) },
      { label: 'Employer ₹', value: Math.round(employer) },
      { label: 'Total ₹', value: Math.round(total) },
    ],
    summary: `${filtered.length} statutory row${filtered.length === 1 ? '' : 's'} (committed runs × heads) — employee ₹${Math.round(employee).toLocaleString('en-IN')} deducted, employer ₹${Math.round(employer).toLocaleString('en-IN')} (cost). Pending remittance per authority (party ledger): ${pendingText}.`,
    count: filtered.length,
  }
}
