/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M46 L-02 — the payroll run (PR-####). The formal HR door the L-01
// reconciliation always needed: ONE run per period, ONE mode —
//   piece  : earned = Σ ProductionEntry.amount (operatorId, prodDate window)
//            — the SAME ground truth as the operator statement + wage bill
//   daily  : earned = weighted attendance days (present 1, half 0.5, absent/
//            leave 0) × dailyWage — 'half' finally has a wage effect
// advances = Σ active out-payments to the 1:1 employee-party (payDate window,
// the L-01 paid-leg definition). net = earned − advances − statDeduction.
// Lines FREEZE at plan time (numbers + partyId — ensureEmployeeParty runs
// before they freeze, so every line carries its party). COMMIT posts one
// Journal PER LINE with partyId: Dr Production Wages (piece) / Dr Staff
// Salaries (daily) / Cr Wage Payable — the L-01 accounts — and the run goes
// terminal (draft → committed). Paying the net through pay_wages afterwards
// closes the party ledger to exactly 0 (loop-closure #3, §12 walkthrough).
//
// SPEC-M47 L-03 — statutory (PF/ESI/PT/LWF) computed at PLAN time from the
// /admin/statutory config (getStatutoryPure — INV-04 pure read) and FROZEN
// onto the line. Commit additionally posts the EMPLOYEE deduction legs: one
// journal per line per head (Dr Wage Payable / Cr PF|ESI|PT|LWF Payable,
// partySide 'debit' — the party-ledger sign fix, spec §4). Employer legs
// (PF employer/EPS/EDLI/admin, ESI employer, LWF employer) are register/
// challan data, NOT posted. Ledger closure with statutory: −earned +
// statDeduction + advances + net = 0 — paying the net still closes to 0.
// Zero-config (all heads disabled) ⇒ M46-identical behavior, pinned.
//
// Doors: create_payroll_run / commit_payroll_run tools + the /hr/payroll form
// actions — one service, both doors (ADR-001). V-#### numbers mint INSIDE the
// commit transaction (the nextAdjNo scan pattern — a racing mint dies on the
// voucherNo unique, never a silent double-post).
import { db } from '@/lib/db'
import { activeFinYear, resolveDocNo } from '../numbering'
import { docKeyViolation } from './ledger'
import { ensureEmployeeParty } from './employee-party' // SPEC-M45 L-01
import { getStatutoryPure } from '../statutory' // SPEC-M47 L-03
import { endOfUtcDay } from '@/lib/erp/dates'
import type { DocPlanResult } from './types'
import type { PayrollRunInput, PayrollRunCommitInput } from '../schemas/payroll'

/** INR display for plan text/summary (the en-IN convention, lakhs honest). */
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** attendance status → wage weight (SPEC §12: 'half' = 0.5; absent/leave = 0). */
const DAY_WEIGHT: Record<string, number> = { present: 1, half: 0.5, absent: 0, leave: 0 }

/** SPEC-M47 L-03 — the statutory legs of one line (employee + employer), as
 * frozen at plan time. Employer legs are register data; the employee legs
 * (pfEe + esiEe + ptAmt + lwfEe = statDeduction) reduce net. */
export interface StatLegs {
  pfWages: number; pfEe: number; pfEr: number; pfEps: number; pfEpf: number; pfEdli: number; pfAdmin: number
  esiEe: number; esiEr: number
  ptAmt: number; lwfEe: number; lwfEr: number
  statDeduction: number
}

/** Pure statutory computation (spec §3). Applicability: PF needs a UAN (the
 * enrolled proxy), ESI needs gross ≤ threshold, PT needs earned > threshold
 * (single slab) × months, LWF flat × months on every earning line. */
function computeStatLegs(earned: number, uan: string | null | undefined, stat: Record<string, any>, months: number): StatLegs {
  const r = (n: number) => Math.round(n)
  const out: StatLegs = {
    pfWages: 0, pfEe: 0, pfEr: 0, pfEps: 0, pfEpf: 0, pfEdli: 0, pfAdmin: 0,
    esiEe: 0, esiEr: 0, ptAmt: 0, lwfEe: 0, lwfEr: 0, statDeduction: 0,
  }
  if (!(earned > 0)) return out
  if (stat['pf.enabled'] && uan && String(uan).trim()) {
    const ceiling = Number(stat['pf.wageCeiling']) || 0
    out.pfWages = ceiling > 0 ? Math.min(earned, ceiling) : earned
    out.pfEe = r((out.pfWages * (Number(stat['pf.eeRate']) || 0)) / 100)
    out.pfEr = r((out.pfWages * (Number(stat['pf.erRate']) || 0)) / 100)
    out.pfEps = Math.min(r((out.pfWages * (Number(stat['pf.epsRate']) || 0)) / 100), out.pfEr)
    out.pfEpf = out.pfEr - out.pfEps
    out.pfEdli = r((out.pfWages * (Number(stat['pf.edliRate']) || 0)) / 100)
    out.pfAdmin = r((out.pfWages * (Number(stat['pf.adminRate']) || 0)) / 100)
  }
  if (stat['esi.enabled']) {
    const threshold = Number(stat['esi.wageThreshold']) || 0
    if (threshold > 0 && earned <= threshold) {
      out.esiEe = r((earned * (Number(stat['esi.eeRate']) || 0)) / 100)
      out.esiEr = r((earned * (Number(stat['esi.erRate']) || 0)) / 100)
    }
  }
  if (stat['pt.enabled']) {
    const threshold = Number(stat['pt.threshold']) || 0
    if (earned > threshold) out.ptAmt = (Number(stat['pt.monthlyAmount']) || 0) * months
  }
  if (stat['lwf.enabled']) {
    out.lwfEe = (Number(stat['lwf.eeAmount']) || 0) * months
    out.lwfEr = (Number(stat['lwf.erAmount']) || 0) * months
  }
  out.statDeduction = out.pfEe + out.esiEe + out.ptAmt + out.lwfEe
  return out
}

/** Distinct calendar months touched by [from, to] inclusive (min 1) — PT and
 * LWF are per-month heads; a multi-month run window charges per month. */
function monthsInWindow(from: Date, to: Date): number {
  const months = new Set<string>()
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1))
  while (cur.getTime() <= end.getTime()) {
    months.add(cur.toISOString().slice(0, 7))
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return Math.max(months.size, 1)
}

/** The employee deduction heads in posting order — one journal per head per
 * line at commit (Dr Wage Payable / Cr <head> Payable, partySide 'debit'). */
export const STAT_HEADS: { key: 'pfEe' | 'esiEe' | 'ptAmt' | 'lwfEe'; account: string; label: string }[] = [
  { key: 'pfEe', account: 'PF Payable', label: 'PF' },
  { key: 'esiEe', account: 'ESI Payable', label: 'ESI' },
  { key: 'ptAmt', account: 'PT Payable', label: 'PT' },
  { key: 'lwfEe', account: 'LWF Payable', label: 'LWF' },
]

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
  const employees = await db.employee.findMany({ where: { active: true }, select: { id: true, code: true, name: true, dailyWage: true, uan: true } })
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
    return { ...l, advances }
  })

  // ── SPEC-M47 L-03 — statutory legs, computed + FROZEN at plan time ──
  // (getStatutoryPure: INV-04 pure read — zero writes, tx-safe by design.)
  const stat = await getStatutoryPure()
  const anyHeadEnabled = !!(stat['pf.enabled'] || stat['esi.enabled'] || stat['pt.enabled'] || stat['lwf.enabled'])
  const months = monthsInWindow(from, to)
  const withStat: (typeof withAdvances[number] & StatLegs & { net: number })[] = withAdvances.map((l) => {
    const emp = empById.get(l.employeeId)
    const legs = anyHeadEnabled ? computeStatLegs(l.earned, emp?.uan, stat, months) : computeStatLegs(l.earned, null, {}, months)
    return { ...l, ...legs, net: Math.round((l.earned - l.advances - legs.statDeduction) * 100) / 100 }
  })
  const unenrolledPf = anyHeadEnabled && stat['pf.enabled']
    ? withStat.filter((l) => l.earned > 0 && !(empById.get(l.employeeId)?.uan || '').trim()).map((l) => l.code)
    : []
  const overThresholdEsi = anyHeadEnabled && stat['esi.enabled']
    ? withStat.filter((l) => l.earned > Number(stat['esi.wageThreshold'] || 0)).map((l) => l.code)
    : []

  const runNo = await resolveDocNo('payrollRun', 'runNo', 'PR-')
  const finYear = await activeFinYear()
  const totalEarned = withStat.reduce((s, l) => s + l.earned, 0)
  const totalAdvances = withStat.reduce((s, l) => s + l.advances, 0)
  const totalNet = withStat.reduce((s, l) => s + l.net, 0)
  const totalStat = withStat.reduce((s, l) => s + l.statDeduction, 0)
  const negNet = withStat.filter((l) => l.net < 0).length

  const statText = anyHeadEnabled
    ? ` — statutory deduction ${inr(totalStat)}${totalStat === 0 ? ' (no line qualified — check UEN/thresholds)' : ''}${unenrolledPf.length ? `; ${unenrolledPf.length} line(s) without UAN: no PF leg` : ''}${overThresholdEsi.length ? `; ${overThresholdEsi.length} line(s) over the ESI threshold: no ESI leg` : ''}`
    : ''
  const statSummary = anyHeadEnabled ? ` | statutory ${inr(totalStat)}` : ''

  const lineData = (l: (typeof withStat)[number]) => ({
    runId: '', employeeId: l.employeeId, partyId: l.partyId,
    ...(l.days != null ? { days: l.days } : {}), ...(l.qty != null ? { qty: l.qty } : {}),
    earned: l.earned, advances: l.advances, net: l.net,
    pfWages: l.pfWages, pfEe: l.pfEe, pfEr: l.pfEr, pfEps: l.pfEps, pfEpf: l.pfEpf, pfEdli: l.pfEdli, pfAdmin: l.pfAdmin,
    esiEe: l.esiEe, esiEr: l.esiEr, ptAmt: l.ptAmt, lwfEe: l.lwfEe, lwfEr: l.lwfEr, statDeduction: l.statDeduction,
  })

  return {
    ok: true,
    text: `Proposed payroll run ${runNo} (${args.mode}, ${windowStr}): ${withStat.length} line${withStat.length === 1 ? '' : 's'} — earned ${inr(totalEarned)}, advances ${inr(totalAdvances)}, net ${inr(totalNet)}${statText}${negNet ? ` (${negNet} line(s) negative — over-advanced, recoverable)` : ''}${skippedZeroWage.length ? `. NOTE: ${skippedZeroWage.length} employee(s) skipped (attendance but dailyWage 0): ${skippedZeroWage.slice(0, 5).join(', ')}${skippedZeroWage.length > 5 ? ' …' : ''}` : ''}.`,
    summary: `Payroll run | ${runNo} | ${args.mode} | ${windowStr} | ${withStat.length} lines | earned ${inr(totalEarned)} | advances ${inr(totalAdvances)}${statSummary} | net ${inr(totalNet)}`,
    creates: [
      { table: 'payrollRun', data: { runNo, mode: args.mode, from, to, status: 'draft', finYear, notes: args.notes ?? null } },
      ...withStat.map((l) => ({
        table: 'payrollLine',
        data: { ...lineData(l), runId: `(${runNo})` },
      })),
    ],
    sideEffects: [
      'Lines freeze now — employee, party, days/qty, earned, advances, net (a later attendance edit does not move a drafted run)',
      'Committing posts ONE wage journal PER LINE with partyId (Dr ' + (args.mode === 'piece' ? 'Production Wages' : 'Staff Salaries') + ' / Cr Wage Payable — the L-01 accounts) and the run goes terminal',
      'Paying the net via pay_wages afterwards closes the employee-party ledger to exactly 0',
      'The operator statement is UNAFFECTED (entry-based, L-01 frozen) — do not also post a production wage bill over the same window: both credit Wage Payable and the ledger would double-count',
      ...(anyHeadEnabled ? [
        'Statutory legs freeze now with the line (rates as configured TODAY at /admin/statutory — a later rate change never moves a drafted run)',
        `Committing also posts the EMPLOYEE deduction legs: one journal per line per head (Dr Wage Payable / Cr PF|ESI|PT|LWF Payable, partySide debit)${totalStat === 0 ? ' — this run has ZERO statutory deductions, none will post' : ''}`,
        'The employee-party ledger still closes to exactly 0 when the net is paid: −earned + statutory + advances + net = 0',
        'Employer contributions (PF employer share/EPS/EDLI/admin, ESI employer, LWF employer) are REGISTER data only — post them manually when remitting (Module M CoA will formalize the accounts)',
      ] : []),
    ],
    async commit() {
      return db.$transaction(async (tx) => {
        const runNoFinal = await resolveDocNo('payrollRun', 'runNo', 'PR-', runNo)
        const run = await tx.payrollRun.create({
          data: { runNo: runNoFinal, mode: args.mode, from, to, status: 'draft', finYear, notes: args.notes ?? null },
        })
        await tx.payrollLine.createMany({
          data: withStat.map((l) => ({ ...lineData(l), runId: run.id })),
        })
        return { id: run.id, runNo: runNoFinal, status: run.status, lines: withStat.length, earned: totalEarned, advances: totalAdvances, net: totalNet, statutory: totalStat, deduction: totalStat }
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

  // ── SPEC-M47 L-03 — the EMPLOYEE deduction legs, read off the FROZEN line
  // (never recomputed: rates were captured at plan time). One journal per
  // line per head, Dr Wage Payable / Cr <head> Payable, partySide 'debit'. ──
  const deductions = payable.flatMap((l) =>
    STAT_HEADS.filter((h) => (l[h.key] ?? 0) > 0).map((h) => {
      const emp = empById.get(l.employeeId)
      return {
        partyId: l.partyId,
        account: h.account,
        label: h.label,
        employee: `${emp?.code ?? l.employeeId} ${emp?.name ?? ''}`.trim(),
        amount: l[h.key] as number,
        narration: `Payroll run ${run.runNo} · statutory ${h.label} · ${emp?.code ?? l.employeeId} ${emp?.name ?? ''} · ${period}`,
      }
    })
  )
  const totalDeduction = deductions.reduce((s, d) => s + d.amount, 0)
  const employerTotal = payable.reduce((s, l) => s + l.pfEr + l.pfEdli + l.pfAdmin + l.esiEr + l.lwfEr, 0)

  const notes = [run.notes, args.notes?.trim()].filter(Boolean).join(' · ') || null

  return {
    ok: true,
    text: `Committing payroll run ${run.runNo}: ${journals.length} wage journal${journals.length === 1 ? '' : 's'} (V-####, Dr ${debitAccount} / Cr Wage Payable, one per line with its partyId) totalling ${inr(totalJournal)}${deductions.length ? ` + ${deductions.length} statutory deduction journal${deductions.length === 1 ? '' : 's'} (Dr Wage Payable / Cr PF|ESI|PT|LWF Payable, partySide debit) totalling ${inr(totalDeduction)}` : ''}; the run becomes terminal. Net ${inr(run.lines.reduce((s, l) => s + l.net, 0))} is then payable via pay_wages.`,
    summary: `Payroll commit | ${run.runNo} | draft → committed | ${journals.length} journals | ${inr(totalJournal)}${deductions.length ? ` + ${deductions.length} statutory | ${inr(totalDeduction)}` : ''}`,
    updates: [{ table: 'payrollRun', id: run.id, data: { status: 'committed', committedAt: new Date(), ...(args.notes?.trim() ? { notes: notes ?? undefined } : {}) } }],
    sideEffects: [
      ...journals.map((j) => `Journal V-#### · Dr ${debitAccount} / Cr Wage Payable · ${inr(j.amount)} · party stamped (${j.employee})`),
      ...deductions.map((d) => `Journal V-#### · Dr Wage Payable / Cr ${d.account} · ${inr(d.amount)} · statutory ${d.label} deduction (${d.employee})`),
      'Wage Payable grows by the run total; every line employee-party is credited in the ledger',
      ...(deductions.length ? [
        'The statutory deduction journals DEBIT the employee-party Wage Payable (partySide debit) — the ledger closure with statutory: −earned + statutory + advances + net = 0',
        `Employer contributions ${inr(employerTotal)} (PF employer/EPS/EDLI/admin, ESI employer, LWF employer) are REGISTER data, NOT posted — post them manually when remitting (Module M CoA will formalize)`,
      ] : []),
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
              partyId: j.partyId, partySide: 'credit',
              debitAccount, creditAccount: 'Wage Payable',
              amount: j.amount, narration: j.narration,
            },
          })
          posted.push(voucherNo)
        }
        for (const d of deductions) {
          const voucherNo = await nextVoucherNo(tx)
          await tx.journal.create({
            data: {
              voucherNo, voucherType: 'journal',
              date: new Date(), finYear: run.finYear,
              partyId: d.partyId, partySide: 'debit',
              debitAccount: 'Wage Payable', creditAccount: d.account,
              amount: d.amount, narration: d.narration,
            },
          })
          posted.push(voucherNo)
        }
        const updated = await tx.payrollRun.update({
          where: { id: run.id },
          data: { status: 'committed', committedAt: new Date(), ...(args.notes?.trim() ? { notes } : {}) },
        })
        return { id: updated.id, runNo: updated.runNo, status: updated.status, journals: journals.length, deductionJournals: deductions.length, voucherNos: posted, total: totalJournal, statutory: totalDeduction }
      }).catch((err: unknown) => {
        throw docKeyViolation(err, run.runNo) ?? err
      })
    },
  }
}
