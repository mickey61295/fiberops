/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M46 L-02 — the payroll run (PR-####). The formal HR door the L-01
// reconciliation always needed: ONE run per period, ONE mode —
//   piece  : earned = Σ ProductionEntry.amount (operatorId, prodDate window)
//            — the SAME ground truth as the operator statement + wage bill
//   daily  : earned = weighted attendance days (present 1, half 0.5, absent/
//            leave 0) × dailyWage — 'half' finally has a wage effect
// advances = Σ active out-payments to the 1:1 employee-party (payDate window,
// the L-01 paid-leg definition). net = earned − advances.
// Lines FREEZE at plan time (numbers + partyId — ensureEmployeeParty runs
// before they freeze, so every line carries its party). COMMIT posts one
// Journal PER LINE with partyId: Dr Production Wages (piece) / Dr Staff
// Salaries (daily) / Cr Wage Payable — the L-01 accounts — and the run goes
// terminal (draft → committed). Paying the net through pay_wages afterwards
// closes the party ledger to exactly 0 (loop-closure #3, §12 walkthrough).
//
// Doors: create_payroll_run / commit_payroll_run tools + the /hr/payroll form
// actions — one service, both doors (ADR-001). V-#### numbers mint INSIDE the
// commit transaction (the nextAdjNo scan pattern — a racing mint dies on the
// voucherNo unique, never a silent double-post).
import { db } from '@/lib/db'
import { activeFinYear, resolveDocNo } from '../numbering'
import { docKeyViolation } from './ledger'
import { ensureEmployeeParty } from './employee-party' // SPEC-M45 L-01
import { endOfUtcDay } from '@/lib/erp/dates'
import type { DocPlanResult } from './types'
import type { PayrollRunInput, PayrollRunCommitInput } from '../schemas/payroll'

/** INR display for plan text/summary (the en-IN convention, lakhs honest). */
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** attendance status → wage weight (SPEC §12: 'half' = 0.5; absent/leave = 0). */
const DAY_WEIGHT: Record<string, number> = { present: 1, half: 0.5, absent: 0, leave: 0 }

/** V-#### scanned over the transaction client (minted inside the commit —
 * the shared journal space, the planJournal convention; multi-line runs mint
 * sequentially over the SAME tx so a race dies on the unique, OPS-05). */
async function nextVoucherNo(tx: any): Promise<string> {
  const all = await tx.journal.findMany({ where: { voucherNo: { startsWith: 'V-' } }, select: { voucherNo: true } })
  const used = new Set(all.map((r: any) => r.voucherNo))
  let n = 1
  while (used.has(`V-${String(n).padStart(4, '0')}`)) n++
  return `V-${String(n).padStart(4, '0')}`
}

// ───────── create: the run + its frozen lines ─────────

export async function planPayrollRun(args: PayrollRunInput): Promise<DocPlanResult> {
  const from = new Date(args.from)
  const to = endOfUtcDay(new Date(args.to))
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return { ok: false, error: `Invalid period dates '${args.from}' → '${args.to}' (ISO dates expected)` }
  }
  if (from.getTime() > to.getTime()) {
    return { ok: false, error: `Period is inverted — from ${args.from} is after to ${args.to}` }
  }
  const windowStr = `${args.from} → ${args.to}`

  // the piece-run overlap guard: a committed piece run over an overlapping
  // window would double-credit the party ledger (statement stays honest —
  // it is entry-based — but the LEDGER would not). Daily runs are attendance-
  // based, production bills are not windowed (undetectable, said honestly in
  // sideEffects).
  if (args.mode === 'piece') {
    const committed = await db.payrollRun.findMany({ where: { mode: 'piece', status: 'committed' }, select: { runNo: true, from: true, to: true } })
    const clash = committed.find((r) => from <= r.to && to >= r.from)
    if (clash) {
      return { ok: false, error: `A committed piece run ${clash.runNo} already covers an overlapping window (${clash.from.toISOString().slice(0, 10)} → ${clash.to.toISOString().slice(0, 10)}) — running both would double-credit the party ledger. Use a disjoint window.` }
    }
  }

  // ── the earning basis, mode-decided ──
  const employees = await db.employee.findMany({ where: { active: true }, select: { id: true, code: true, name: true, dailyWage: true } })
  const empById = new Map(employees.map((e) => [e.id, e]))

  type Line = { employeeId: string; code: string; name: string; partyId: string; days?: number; qty?: number; earned: number }
  const lines: Line[] = []
  let skippedZeroWage: string[] = []

  if (args.mode === 'piece') {
    const entries = await db.productionEntry.findMany({
      where: { operatorId: { not: null }, prodDate: { gte: from, lte: to } },
      select: { operatorId: true, amount: true, qty: true },
    })
    const byOp = new Map<string, { amount: number; qty: number }>()
    for (const e of entries) {
      const k = e.operatorId as string
      const a = byOp.get(k) ?? { amount: 0, qty: 0 }
      a.amount += e.amount
      a.qty += e.qty
      byOp.set(k, a)
    }
    for (const [employeeId, agg] of byOp) {
      const emp = empById.get(employeeId)
      if (!emp || Math.round(agg.amount) <= 0) continue // inactive or zero-value noise
      const party = await ensureEmployeeParty(emp as any)
      lines.push({ employeeId, code: emp.code, name: emp.name, partyId: party.id, qty: agg.qty, earned: Math.round(agg.amount) })
    }
    lines.sort((a, b) => b.earned - a.earned)
  } else {
    const att = await db.attendance.findMany({
      where: { attDate: { gte: from, lte: to } },
      select: { employeeId: true, status: true },
    })
    const daysBy = new Map<string, number>()
    for (const a of att) {
      const w = DAY_WEIGHT[a.status?.trim() || 'present'] ?? 1
      if (!w) continue
      daysBy.set(a.employeeId, (daysBy.get(a.employeeId) ?? 0) + w)
    }
    const zeroWage: string[] = []
    for (const [employeeId, days] of daysBy) {
      const emp = empById.get(employeeId)
      if (!emp) continue
      if (!(emp.dailyWage > 0)) { zeroWage.push(`${emp.code} ${emp.name}`); continue }
      const party = await ensureEmployeeParty(emp as any)
      lines.push({ employeeId, code: emp.code, name: emp.name, partyId: party.id, days, earned: Math.round(days * emp.dailyWage) })
    }
    skippedZeroWage = zeroWage
    lines.sort((a, b) => b.earned - a.earned)
  }

  if (lines.length === 0) {
    return {
      ok: false,
      error: `No ${args.mode === 'piece' ? 'production entries' : 'attendance'} in ${windowStr} — a payroll run needs something to pay.${skippedZeroWage.length ? ` (${skippedZeroWage.length} employee(s) have attendance but dailyWage 0: ${skippedZeroWage.slice(0, 5).join(', ')}${skippedZeroWage.length > 5 ? ' …' : ''})` : ''}`,
    }
  }

  // ── advances: out-payments to the linked party, payDate window (L-01 leg) ──
  const partyIds = lines.map((l) => l.partyId)
  const payments = await db.payment.findMany({
    where: { partyId: { in: partyIds }, direction: 'out', status: 'active', payDate: { gte: from, lte: to } },
    select: { partyId: true, amount: true },
  })
  const advancesBy = new Map<string, number>()
  for (const p of payments) advancesBy.set(p.partyId, (advancesBy.get(p.partyId) ?? 0) + p.amount)

  const withAdvances = lines.map((l) => {
    const advances = Math.round((advancesBy.get(l.partyId) ?? 0) * 100) / 100
    return { ...l, advances, net: Math.round((l.earned - advances) * 100) / 100 }
  })

  const runNo = await resolveDocNo('payrollRun', 'runNo', 'PR-')
  const finYear = await activeFinYear()
  const totalEarned = withAdvances.reduce((s, l) => s + l.earned, 0)
  const totalAdvances = withAdvances.reduce((s, l) => s + l.advances, 0)
  const totalNet = withAdvances.reduce((s, l) => s + l.net, 0)
  const negNet = withAdvances.filter((l) => l.net < 0).length

  return {
    ok: true,
    text: `Proposed payroll run ${runNo} (${args.mode}, ${windowStr}): ${withAdvances.length} line${withAdvances.length === 1 ? '' : 's'} — earned ${inr(totalEarned)}, advances ${inr(totalAdvances)}, net ${inr(totalNet)}${negNet ? ` (${negNet} line(s) negative — over-advanced, recoverable)` : ''}${skippedZeroWage.length ? `. NOTE: ${skippedZeroWage.length} employee(s) skipped (attendance but dailyWage 0): ${skippedZeroWage.slice(0, 5).join(', ')}${skippedZeroWage.length > 5 ? ' …' : ''}` : ''}.`,
    summary: `Payroll run | ${runNo} | ${args.mode} | ${windowStr} | ${withAdvances.length} lines | earned ${inr(totalEarned)} | advances ${inr(totalAdvances)} | net ${inr(totalNet)}`,
    creates: [
      { table: 'payrollRun', data: { runNo, mode: args.mode, from, to, status: 'draft', finYear, notes: args.notes ?? null } },
      ...withAdvances.map((l) => ({
        table: 'payrollLine',
        data: {
          runId: `(${runNo})`, employeeId: l.employeeId, partyId: l.partyId,
          ...(l.days != null ? { days: l.days } : {}), ...(l.qty != null ? { qty: l.qty } : {}),
          earned: l.earned, advances: l.advances, net: l.net,
        },
      })),
    ],
    sideEffects: [
      'Lines freeze now — employee, party, days/qty, earned, advances, net (a later attendance edit does not move a drafted run)',
      'Committing posts ONE wage journal PER LINE with partyId (Dr ' + (args.mode === 'piece' ? 'Production Wages' : 'Staff Salaries') + ' / Cr Wage Payable — the L-01 accounts) and the run goes terminal',
      'Paying the net via pay_wages afterwards closes the employee-party ledger to exactly 0',
      'The operator statement is UNAFFECTED (entry-based, L-01 frozen) — do not also post a production wage bill over the same window: both credit Wage Payable and the ledger would double-count',
    ],
    async commit() {
      return db.$transaction(async (tx) => {
        const runNoFinal = await resolveDocNo('payrollRun', 'runNo', 'PR-', runNo)
        const run = await tx.payrollRun.create({
          data: { runNo: runNoFinal, mode: args.mode, from, to, status: 'draft', finYear, notes: args.notes ?? null },
        })
        await tx.payrollLine.createMany({
          data: withAdvances.map((l) => ({
            runId: run.id, employeeId: l.employeeId, partyId: l.partyId,
            ...(l.days != null ? { days: l.days } : {}), ...(l.qty != null ? { qty: l.qty } : {}),
            earned: l.earned, advances: l.advances, net: l.net,
          })),
        })
        return { id: run.id, runNo: runNoFinal, status: run.status, lines: withAdvances.length, earned: totalEarned, advances: totalAdvances, net: totalNet }
      }).catch((err: unknown) => {
        throw docKeyViolation(err, runNo) ?? err
      })
    },
  }
}

// ───────── commit: the journals + terminal state ─────────

export async function planPayrollRunCommit(args: PayrollRunCommitInput): Promise<DocPlanResult> {
  const run = await db.payrollRun.findUnique({ where: { runNo: args.runNo }, include: { lines: true } })
  if (!run) return { ok: false, error: `Payroll run ${args.runNo} not found` }
  if (run.status === 'committed') {
    return { ok: false, error: `Payroll run ${args.runNo} is COMMITTED (terminal) — its wage journals are already posted; start a new run for the next period` }
  }

  const employees = await db.employee.findMany({
    where: { id: { in: run.lines.map((l) => l.employeeId) } },
    select: { id: true, code: true, name: true },
  })
  const empById = new Map(employees.map((e) => [e.id, e]))

  const payable = run.lines.filter((l) => l.earned > 0)
  const debitAccount = run.mode === 'piece' ? 'Production Wages' : 'Staff Salaries'
  const period = `${run.from.toISOString().slice(0, 10)} → ${run.to.toISOString().slice(0, 10)}`
  const journals = payable.map((l) => {
    const emp = empById.get(l.employeeId)
    return {
      partyId: l.partyId,
      employee: `${emp?.code ?? l.employeeId} ${emp?.name ?? ''}`.trim(),
      amount: l.earned,
      narration: `Payroll run ${run.runNo} · ${run.mode} · ${emp?.code ?? l.employeeId} ${emp?.name ?? ''} · ${period}`,
    }
  })
  const totalJournal = journals.reduce((s, j) => s + j.amount, 0)

  const notes = [run.notes, args.notes?.trim()].filter(Boolean).join(' · ') || null

  return {
    ok: true,
    text: `Committing payroll run ${run.runNo}: ${journals.length} wage journal${journals.length === 1 ? '' : 's'} (V-####, Dr ${debitAccount} / Cr Wage Payable, one per line with its partyId) totalling ${inr(totalJournal)}; the run becomes terminal. Net ${inr(run.lines.reduce((s, l) => s + l.net, 0))} is then payable via pay_wages.`,
    summary: `Payroll commit | ${run.runNo} | draft → committed | ${journals.length} journals | ${inr(totalJournal)}`,
    updates: [{ table: 'payrollRun', id: run.id, data: { status: 'committed', committedAt: new Date(), ...(args.notes?.trim() ? { notes: notes ?? undefined } : {}) } }],
    sideEffects: [
      ...journals.map((j) => `Journal V-#### · Dr ${debitAccount} / Cr Wage Payable · ${inr(j.amount)} · party stamped (${j.employee})`),
      'Wage Payable grows by the run total; every line employee-party is credited in the ledger',
      'Payslips become printable (draft runs refuse — numbers must be posted first)',
    ],
    async commit() {
      return db.$transaction(async (tx) => {
        const posted: string[] = []
        for (const j of journals) {
          const voucherNo = await nextVoucherNo(tx)
          await tx.journal.create({
            data: {
              voucherNo, voucherType: 'journal',
              date: new Date(), finYear: run.finYear,
              partyId: j.partyId,
              debitAccount, creditAccount: 'Wage Payable',
              amount: j.amount, narration: j.narration,
            },
          })
          posted.push(voucherNo)
        }
        const updated = await tx.payrollRun.update({
          where: { id: run.id },
          data: { status: 'committed', committedAt: new Date(), ...(args.notes?.trim() ? { notes } : {}) },
        })
        return { id: updated.id, runNo: updated.runNo, status: updated.status, journals: posted.length, voucherNos: posted, total: totalJournal }
      }).catch((err: unknown) => {
        throw docKeyViolation(err, run.runNo) ?? err
      })
    },
  }
}
