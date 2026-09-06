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
import { resolveStatutoryConfig, computeStatutory, ensureStatutoryParties, normalizeStatutory, STATUTORY_HEADS, type StatutoryConfig } from '../statutory' // SPEC-M48 L-03
import { resolveAccountByRef, type ResolvedAccount } from '../coa' // SPEC-M50 M-01
import { resolveOtConfig, computeOtDay, type OtConfig } from '../overtime' // SPEC-M49 L-04
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

  // SPEC-M49 L-04 — OT is a DAILY-run concept (attendance hours basis); a
  // piece run has no attendance hours to pay OT on — a loud error, not a
  // silent ignore (the agent might have meant a different door).
  if (args.ot && args.mode !== 'daily') {
    return { ok: false, error: 'ot: true is only valid on a DAILY run — piece runs pay production-entry earnings, not attendance hours. Re-run with mode daily or without ot.' }
  }

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

  type Line = { employeeId: string; code: string; name: string; partyId: string; days?: number; qty?: number; otHours?: number; otPay?: number; earned: number }
  const lines: Line[] = []
  let skippedZeroWage: string[] = []
  // SPEC-M49 L-04 — OT opt-in: resolve the config ONCE, compute per
  // PRESENT day (pure), FREEZE the config onto the run. OFF = the M46
  // arithmetic byte-identical + the nag when OT-able hours exist.
  let otCfg: OtConfig | null = null
  const otNotes: string[] = []
  if (args.ot) {
    const { config, source } = await resolveOtConfig()
    otCfg = config
    if (source === 'default') otNotes.push('OT config row missing/unparseable — safe defaults applied (2×, 8h standard)')
  }

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
    // SPEC-M49 L-04 — the daily basis gains the attendance HOURS + the
    // linked shift (per-day standard). hours were stored since M20; OT is
    // the first consumer. A linked shift's own hours are that day's standard
    // (a 12h shift means 12h is the normal day); no shift → the frozen/
    // live standardHours fallback.
    const att = await db.attendance.findMany({
      where: { attDate: { gte: from, lte: to } },
      select: { employeeId: true, status: true, hours: true, shiftId: true },
    })
    const shiftIds = [...new Set(att.map((a) => a.shiftId).filter(Boolean))] as string[]
    const shiftHoursById = new Map<string, number>()
    if (shiftIds.length) {
      const shifts = await db.shift.findMany({ where: { id: { in: shiftIds } }, select: { id: true, hours: true } })
      for (const s of shifts) shiftHoursById.set(s.id, s.hours)
    }
    // the nag standard when OT is OFF (compare, don't pay); when ON the
    // frozen config's standard IS the fallback — no second resolve
    const stdFallback = otCfg?.standardHours ?? (await resolveOtConfig()).config.standardHours

    const daysBy = new Map<string, number>()
    const otBy = new Map<string, { hours: number; pay: number }>()
    let otAble = 0 // present rows with hours beyond the per-day standard (the nag basis)
    for (const a of att) {
      const status = a.status?.trim() || 'present'
      const w = DAY_WEIGHT[status] ?? 1
      if (w) daysBy.set(a.employeeId, (daysBy.get(a.employeeId) ?? 0) + w)
      // AT-03 — OT accrues ONLY on present days with hours: a half day's
      // part-wage is the weight, not the hours; absent/leave times are
      // recorded but earn nothing
      const hours = a.hours ?? 0
      if (status !== 'present' || !(hours > 0)) continue
      const shiftStd = a.shiftId ? (shiftHoursById.get(a.shiftId) ?? 0) : 0
      const standard = shiftStd > 0 ? shiftStd : stdFallback
      if (hours > standard) otAble++
      if (!otCfg) continue
      const emp = empById.get(a.employeeId)
      if (!emp || !(emp.dailyWage > 0)) continue // no wage → no hourly rate (the zero-wage skip names them below)
      const day = computeOtDay(hours, standard, emp.dailyWage, otCfg.otMultiplier)
      if (day.otHours <= 0) continue
      const acc = otBy.get(a.employeeId) ?? { hours: 0, pay: 0 }
      acc.hours += day.otHours
      acc.pay += day.otPay
      otBy.set(a.employeeId, acc)
    }
    // the nag (the statutory pattern): OT-able hours exist but the run
    // didn't opt in — SAY it, don't silently pay M46 nets
    if (!args.ot && otAble > 0) {
      otNotes.push(`${otAble} present day(s) in the window carry hours beyond the per-day standard — pass ot: true to pay overtime (frozen on the run)`)
    }
    const zeroWage: string[] = []
    for (const [employeeId, days] of daysBy) {
      const emp = empById.get(employeeId)
      if (!emp) continue
      if (!(emp.dailyWage > 0)) { zeroWage.push(`${emp.code} ${emp.name}`); continue }
      const party = await ensureEmployeeParty(emp as any)
      // OT freezes on the line with the rest: Σ per-day otHours (2dp) and
      // the once-rounded Σ otPay — earned = round(days × wage) + otPay
      const acc = otCfg ? otBy.get(employeeId) : undefined
      const otHours = acc ? Math.round(acc.hours * 100) / 100 : 0
      const otPay = acc ? Math.round(acc.pay) : 0
      lines.push({ employeeId, code: emp.code, name: emp.name, partyId: party.id, days, otHours, otPay, earned: Math.round(days * emp.dailyWage) + otPay })
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

  // ── SPEC-M48 L-03 — statutory deductions, OPT-IN per run ──
  // When args.statutory: resolve the live config ONCE here, compute per line
  // (pure), and FREEZE the config onto the run (a later rate edit never moves
  // a drafted run). OFF (the default) = the M46 arithmetic byte-identical.
  let statutoryCfg: StatutoryConfig | null = null
  let statNotes: string[] = []
  if (args.statutory) {
    const { config, source } = await resolveStatutoryConfig()
    statutoryCfg = config
    if (source === 'default') statNotes.push('statutory config row missing/unparseable — safe defaults applied')
    const anyHead = config.pf.enabled || config.esi.enabled || config.pt.enabled || config.lwf.enabled
    if (!anyHead) statNotes.push('no statutory head enabled in the config — zero deductions will be computed')
  } else {
    // the nag: rates configured but the run didn't opt in — SAY it, don't
    // silently compute legacy nets (discoverability without surprise)
    const { config } = await resolveStatutoryConfig()
    if (config.pf.enabled || config.esi.enabled || config.pt.enabled || config.lwf.enabled) {
      statNotes.push('statutory rates are configured but NOT applied — pass statutory: true to deduct PF/ESI/PT/LWF')
    }
  }
  const withStatutory = statutoryCfg
    ? withAdvances.map((l) => {
        const s = computeStatutory(l.earned, statutoryCfg!)
        if (s.capped) statNotes.push(`${l.code} ${l.name}: deductions capped at earned (a head was clipped)`)
        return {
          ...l,
          pf: s.pf, pfEmployer: s.pfEmployer, esi: s.esi, esiEmployer: s.esiEmployer, pt: s.pt, lwf: s.lwf,
          deductions: s.deductions,
          net: Math.round((l.earned - l.advances - s.deductions) * 100) / 100,
        }
      })
    : withAdvances
  const finalLines = withStatutory

  const runNo = await resolveDocNo('payrollRun', 'runNo', 'PR-')
  const finYear = await activeFinYear()
  const totalEarned = finalLines.reduce((s, l) => s + l.earned, 0)
  const totalAdvances = finalLines.reduce((s, l) => s + l.advances, 0)
  const totalNet = finalLines.reduce((s, l) => s + l.net, 0)
  const negNet = finalLines.filter((l) => l.net < 0).length
  const totalDeductions = statutoryCfg ? finalLines.reduce((s, l) => s + (l as any).deductions, 0) : 0
  const totalEmployer = statutoryCfg
    ? finalLines.reduce((s, l) => s + (l as any).pfEmployer + (l as any).esiEmployer, 0)
    : 0
  // SPEC-M49 L-04 — the OT run totals (plan text + returns; earned already
  // includes otPay, so every consumer downstream is honest unchanged)
  const totalOtPay = otCfg ? finalLines.reduce((s, l) => s + (l as any).otPay, 0) : 0
  const totalOtHours = otCfg ? Math.round(finalLines.reduce((s, l) => s + (l as any).otHours, 0) * 100) / 100 : 0

  // per-head totals over the run (the J2 spec — shared by sideEffects + the
  // commit-time journals; lwf employer share derives from the FROZEN config:
  // applies where the line's lwf head ran, i.e. line.lwf > 0)
  const headTotals = STATUTORY_HEADS.map((h) => {
    const employee = finalLines.reduce((s, l) => s + (l as any)[h.key], 0)
    const employer =
      h.key === 'pf'
        ? finalLines.reduce((s, l) => s + (l as any).pfEmployer, 0)
        : h.key === 'esi'
          ? finalLines.reduce((s, l) => s + (l as any).esiEmployer, 0)
          : h.key === 'lwf'
            ? finalLines.reduce((s, l) => s + ((l as any).lwf > 0 ? (statutoryCfg as StatutoryConfig).lwf.employer : 0), 0)
            : 0 // PT: no employer share
    return { head: h, employee, employer, total: employee + employer }
  }).filter((t) => t.total > 0)

  const statText = statutoryCfg
    ? ` — statutory deductions ${inr(totalDeductions)} (employee share; employer adds ${inr(totalEmployer + headTotals.filter((t) => t.head.key === 'lwf').reduce((s, t) => s + t.employer, 0))}, a cost, not deducted)`
    : ''
  const otText = otCfg ? ` — incl. OT ${inr(totalOtPay)} (${totalOtHours} h beyond the per-day standard at ${otCfg.otMultiplier}×)` : ''
  const allNotes = [...statNotes, ...otNotes]
  const statNote = allNotes.length ? `. NOTE: ${allNotes.slice(0, 3).join('; ')}${allNotes.length > 3 ? ' …' : ''}` : ''

  return {
    ok: true,
    text: `Proposed payroll run ${runNo} (${args.mode}, ${windowStr}): ${finalLines.length} line${finalLines.length === 1 ? '' : 's'} — earned ${inr(totalEarned)}${otText}, advances ${inr(totalAdvances)}, net ${inr(totalNet)}${statText}${negNet ? ` (${negNet} line(s) negative — over-advanced, recoverable)` : ''}${statNote}${skippedZeroWage.length ? `. NOTE: ${skippedZeroWage.length} employee(s) skipped (attendance but dailyWage 0): ${skippedZeroWage.slice(0, 5).join(', ')}${skippedZeroWage.length > 5 ? ' …' : ''}` : ''}.`,
    summary: `Payroll run | ${runNo} | ${args.mode} | ${windowStr} | ${finalLines.length} lines | earned ${inr(totalEarned)} | advances ${inr(totalAdvances)} | deductions ${inr(totalDeductions)} | net ${inr(totalNet)}`,
    creates: [
      { table: 'payrollRun', data: { runNo, mode: args.mode, from, to, status: 'draft', finYear, ...(statutoryCfg ? { statutory: statutoryCfg } : {}), ...(otCfg ? { ot: otCfg } : {}), notes: args.notes ?? null } },
      ...finalLines.map((l) => ({
        table: 'payrollLine',
        data: {
          runId: `(${runNo})`, employeeId: l.employeeId, partyId: l.partyId,
          ...(l.days != null ? { days: l.days } : {}), ...(l.qty != null ? { qty: l.qty } : {}),
          earned: l.earned, advances: l.advances,
          ...(statutoryCfg
            ? { pf: (l as any).pf, pfEmployer: (l as any).pfEmployer, esi: (l as any).esi, esiEmployer: (l as any).esiEmployer, pt: (l as any).pt, lwf: (l as any).lwf, deductions: (l as any).deductions }
            : {}),
          ...(otCfg ? { otHours: (l as any).otHours, otPay: (l as any).otPay } : {}),
          net: l.net,
        },
      })),
    ],
    sideEffects: [
      'Lines freeze now — employee, party, days/qty, earned, advances, deductions, net (a later attendance edit does not move a drafted run)' + (statutoryCfg ? ' — statutory rates are frozen on the run too' : '') + (otCfg ? ' — OT multiplier + standard hours are frozen on the run too' : ''),
      'Committing posts ONE wage journal PER LINE with partyId (Dr ' + (args.mode === 'piece' ? 'Production Wages' : 'Staff Salaries') + ' / Cr Wage Payable — the L-01 accounts' + (statutoryCfg ? ', amount = earned − deductions (the statutory share never flows through the employee-party ledger)' : '') + ') and the run goes terminal',
      ...(statutoryCfg
        ? [
            ...headTotals.map(
              (t) => `Journal V-#### · Dr ${args.mode === 'piece' ? 'Production Wages' : 'Staff Salaries'} / Cr ${t.head.payableAccount} · ${t.head.label} employee ${inr(t.employee)} + employer ${inr(t.employer)} · party ${t.head.partyCode} (the remittance tracker — its ledger shows pending)`,
            ),
          ]
        : []),
      'Paying the net via pay_wages afterwards closes the employee-party ledger to exactly 0',
      'The operator statement is UNAFFECTED (entry-based, L-01 frozen) — do not also post a production wage bill over the same window: both credit Wage Payable and the ledger would double-count',
    ],
    async commit() {
      return db.$transaction(async (tx) => {
        const runNoFinal = await resolveDocNo('payrollRun', 'runNo', 'PR-', runNo)
        const run = await tx.payrollRun.create({
          data: { runNo: runNoFinal, mode: args.mode, from, to, status: 'draft', finYear, ...(statutoryCfg ? { statutory: statutoryCfg as any } : {}), ...(otCfg ? { ot: otCfg as any } : {}), notes: args.notes ?? null },
        })
        await tx.payrollLine.createMany({
          data: finalLines.map((l) => ({
            runId: run.id, employeeId: l.employeeId, partyId: l.partyId,
            ...(l.days != null ? { days: l.days } : {}), ...(l.qty != null ? { qty: l.qty } : {}),
            earned: l.earned, advances: l.advances,
            ...(statutoryCfg
              ? { pf: (l as any).pf, pfEmployer: (l as any).pfEmployer, esi: (l as any).esi, esiEmployer: (l as any).esiEmployer, pt: (l as any).pt, lwf: (l as any).lwf, deductions: (l as any).deductions }
              : {}),
            ...(otCfg ? { otHours: (l as any).otHours, otPay: (l as any).otPay } : {}),
            net: l.net,
          })),
        })
        return { id: run.id, runNo: runNoFinal, status: run.status, lines: finalLines.length, earned: totalEarned, advances: totalAdvances, deductions: totalDeductions, ...(otCfg ? { otHours: totalOtHours, otPay: totalOtPay } : {}), net: totalNet }
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
  const statutoryOn = run.statutory != null

  // SPEC-M50 M-01 (CA-04) — resolve the journal legs against the chart of
  // accounts BEFORE the plan: the wage expense account, Wage Payable, and
  // (on a statutory run) every head's payableAccount. A miss is a LOUD
  // refusal — the commit never saves an unlinked journal.
  const wageAcc = await resolveAccountByRef(debitAccount)
  const wagePayableAcc = await resolveAccountByRef('Wage Payable')
  const headAccs = new Map<string, ResolvedAccount>()
  for (const h of STATUTORY_HEADS) {
    if (!statutoryOn) break
    const acc = await resolveAccountByRef(h.payableAccount)
    if (acc) headAccs.set(h.key, acc)
  }
  const coaMissing: string[] = []
  if (!wageAcc) coaMissing.push(debitAccount)
  if (!wagePayableAcc) coaMissing.push('Wage Payable')
  if (statutoryOn) for (const h of STATUTORY_HEADS) if (!headAccs.get(h.key) && run.lines.some((l) => (h.key === 'pf' ? l.pf + l.pfEmployer : h.key === 'esi' ? l.esi + l.esiEmployer : h.key === 'pt' ? l.pt : h.key === 'lwf' ? l.lwf : 0) > 0)) coaMissing.push(h.payableAccount)
  if (coaMissing.length) {
    return { ok: false, error: `Chart of accounts incomplete — ${coaMissing.join(', ')} missing. Seed it (scripts/seed_coa.ts) or create it (create_account / /masters/account); a journal cannot save unlinked accounts (SPEC-M50 M-01).` }
  }

  // ── SPEC-M48 L-03 — the statutory split ──
  // run.statutory (the FROZEN config) non-null ⇒ this is a statutory run:
  //   J1 per line: Dr Wages / Cr Wage Payable, partyId, amount = earned −
  //   employee deductions (the statutory share NEVER flows through the
  //   employee-party ledger; skipped when the remainder is 0)
  //   J2 per head (Σ>0): Dr Wages / Cr <Head> Payable, partyId = the
  //   authority party, amount = employee + employer share — wage expense
  //   totals Σ earned + Σ employer shares, and the authority's party ledger
  //   becomes the remittance tracker (loop-closure #4)
  const journals = payable
    .map((l) => {
      const emp = empById.get(l.employeeId)
      const amount = statutoryOn ? Math.round((l.earned - l.deductions) * 100) / 100 : l.earned
      if (!(amount > 0)) return null // fully-deducted line — nothing payable to the party
      return {
        partyId: l.partyId,
        employee: `${emp?.code ?? l.employeeId} ${emp?.name ?? ''}`.trim(),
        amount,
        narration: `Payroll run ${run.runNo} · ${run.mode} · ${emp?.code ?? l.employeeId} ${emp?.name ?? ''} · ${period}`,
      }
    })
    .filter((j): j is { partyId: string; employee: string; amount: number; narration: string } => j !== null)

  // the J2 head journals — authority parties ensured HERE (plan time of the
  // commit, outside the tx — the M46 pattern; ids frozen into the spec)
  let headJournals: { head: (typeof STATUTORY_HEADS)[number]; partyId: string; employee: number; employer: number; amount: number; narration: string }[] = []
  if (statutoryOn) {
    const cfg = normalizeStatutory(run.statutory)
    const parties = await ensureStatutoryParties()
    headJournals = STATUTORY_HEADS.map((h) => {
      const employee = run.lines.reduce((s, l) => s + (l as any)[h.key], 0)
      const employer =
        h.key === 'pf'
          ? run.lines.reduce((s, l) => s + l.pfEmployer, 0)
          : h.key === 'esi'
            ? run.lines.reduce((s, l) => s + l.esiEmployer, 0)
            : h.key === 'lwf'
              ? run.lines.reduce((s, l) => s + (l.lwf > 0 ? cfg.lwf.employer : 0), 0)
              : 0 // PT: no employer share
      const amount = Math.round((employee + employer) * 100) / 100
      if (!(amount > 0)) return null
      const party = parties.get(h.key)!
      return {
        head: h,
        partyId: party.id,
        employee, employer, amount,
        narration: `Payroll run ${run.runNo} · ${run.mode} · ${h.label} statutory · employee ${inr(employee)} + employer ${inr(employer)} · ${period}`,
      }
    }).filter((j): j is { head: (typeof STATUTORY_HEADS)[number]; partyId: string; employee: number; employer: number; amount: number; narration: string } => j !== null)
  }

  const totalJournal = journals.reduce((s, j) => s + j.amount, 0)
  const totalHeads = headJournals.reduce((s, j) => s + j.amount, 0)
  const totalDeductions = statutoryOn ? run.lines.reduce((s, l) => s + l.deductions, 0) : 0

  const notes = [run.notes, args.notes?.trim()].filter(Boolean).join(' · ') || null
  const debitLabel = `${debitAccount} [${wageAcc!.code}]`
  const wagePayableLabel = `Wage Payable [${wagePayableAcc!.code}]`

  return {
    ok: true,
    text: `Committing payroll run ${run.runNo}: ${journals.length} wage journal${journals.length === 1 ? '' : 's'} (V-####, Dr ${debitLabel} / Cr ${wagePayableLabel}, one per line with its partyId${statutoryOn ? ', amount = earned − deductions' : ''}) totalling ${inr(totalJournal)}${statutoryOn ? ` + ${headJournals.length} statutory journal${headJournals.length === 1 ? '' : 's'} totalling ${inr(totalHeads)} (deductions ${inr(totalDeductions)} + employer shares)` : ''}; the run becomes terminal. Net ${inr(run.lines.reduce((s, l) => s + l.net, 0))} is then payable via pay_wages.`,
    summary: `Payroll commit | ${run.runNo} | draft → committed | ${journals.length} wage journals${statutoryOn ? ` + ${headJournals.length} statutory` : ''} | ${inr(totalJournal + totalHeads)}`,
    updates: [{ table: 'payrollRun', id: run.id, data: { status: 'committed', committedAt: new Date(), ...(args.notes?.trim() ? { notes: notes ?? undefined } : {}) } }],
    sideEffects: [
      ...journals.map((j) => `Journal V-#### · Dr ${debitLabel} / Cr ${wagePayableLabel} · ${inr(j.amount)} · party stamped (${j.employee})`),
      ...headJournals.map((j) => `Journal V-#### · Dr ${debitLabel} / Cr ${j.head.payableAccount} [${headAccs.get(j.head.key)!.code}] · ${j.head.label} employee ${inr(j.employee)} + employer ${inr(j.employer)} · party ${j.head.partyCode} (remittance pending in its ledger)`),
      'Wage Payable grows by the run total' + (statutoryOn ? '; the statutory payables (PF/ESI/PT/LWF) grow by the head journals — remit via payments to the authority parties' : '') + '; every line employee-party is credited in the ledger',
      'Payslips become printable (draft runs refuse — numbers must be posted first)',
    ],
    async commit() {
      return db.$transaction(async (tx) => {
        // SPEC-M50 CA-04 — re-resolve INSIDE the tx; a deleted account between
        // plan and commit aborts the run commit, never saves an unlinked journal.
        const wageLeg = await resolveAccountByRef(debitAccount, tx)
        const payableLeg = await resolveAccountByRef('Wage Payable', tx)
        if (!wageLeg || !payableLeg) throw new Error(`Chart of accounts incomplete — '${!wageLeg ? debitAccount : 'Wage Payable'}' is missing (SPEC-M50 M-01)`)
        const posted: string[] = []
        for (const j of journals) {
          const voucherNo = await nextVoucherNo(tx)
          await tx.journal.create({
            data: {
              voucherNo, voucherType: 'journal',
              date: new Date(), finYear: run.finYear,
              partyId: j.partyId,
              debitAccount, creditAccount: 'Wage Payable',
              debitAccountId: wageLeg.id, creditAccountId: payableLeg.id,
              amount: j.amount, narration: j.narration,
            },
          })
          posted.push(voucherNo)
        }
        for (const j of headJournals) {
          const voucherNo = await nextVoucherNo(tx)
          const headLeg = await resolveAccountByRef(j.head.payableAccount, tx)
          if (!headLeg) throw new Error(`Chart of accounts incomplete — '${j.head.payableAccount}' is missing (SPEC-M50 M-01)`)
          await tx.journal.create({
            data: {
              voucherNo, voucherType: 'journal',
              date: new Date(), finYear: run.finYear,
              partyId: j.partyId,
              debitAccount, creditAccount: j.head.payableAccount,
              debitAccountId: wageLeg.id, creditAccountId: headLeg.id,
              amount: j.amount, narration: j.narration,
            },
          })
          posted.push(voucherNo)
        }
        const updated = await tx.payrollRun.update({
          where: { id: run.id },
          data: { status: 'committed', committedAt: new Date(), ...(args.notes?.trim() ? { notes } : {}) },
        })
        return { id: updated.id, runNo: updated.runNo, status: updated.status, journals: posted.length, voucherNos: posted, total: totalJournal, statutoryJournals: headJournals.length, statutoryTotal: totalHeads }
      }).catch((err: unknown) => {
        throw docKeyViolation(err, run.runNo) ?? err
      })
    },
  }
}
