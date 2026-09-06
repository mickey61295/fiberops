/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-33 — create_production_bill service (Production Bills,
// /accounts/production-bills). Computes the period piece-rate bill from
// ProductionEntry (optionally scoped to one dept / one operator — §7-D-33
// per-operator granularity) and posts a Journal: voucherType='journal',
// Dr Production Wages / Cr Wage Payable — the SAME accounts as the §7-B-20
// wage bill (hr/wages "Generate wage bill"), so the two doors stay
// consistent. Voucher number rides the shared V-#### space (planJournal
// convention — JOURNAL is one model).
import { db } from '@/lib/db'
import { activeFinYear } from '../numbering'
import { ensureEmployeeParty } from './employee-party' // SPEC-M45 L-01
import { resolveAccountByRef, accountLabel } from '../coa' // SPEC-M50 M-01
import type { DocPlanResult } from './types'
import type { ProductionBillInput } from '../schemas/production-bill'
import { dateOrIstToday, istTodayDate } from '@/lib/erp/dates'

export async function planProductionBill(args: ProductionBillInput): Promise<DocPlanResult> {
  const where: any = {}
  let deptName = ''
  if (args.deptCode?.trim()) {
    const dept = await db.department.findUnique({ where: { code: args.deptCode.trim() } })
    if (!dept) return { ok: false, error: `Department ${args.deptCode} not found` }
    where.deptId = dept.id
    deptName = dept.name
  }
  let operatorName = ''
  let operatorPartyId: string | undefined // SPEC-M45 L-01 — the bill hits the employee's party ledger
  let operatorPartyCode = ''
  if (args.operatorCode?.trim()) {
    const op = await db.employee.findUnique({ where: { code: args.operatorCode.trim() } })
    if (!op) return { ok: false, error: `Operator ${args.operatorCode} not found` }
    where.operatorId = op.id
    operatorName = op.name
    const party = await ensureEmployeeParty(op)
    operatorPartyId = party.id
    operatorPartyCode = party.code
  }

  const to = dateOrIstToday(args.to)
  const from = args.from ? new Date(args.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  where.prodDate = { gte: from, lte: to }

  const entries = await db.productionEntry.findMany({ where, select: { qty: true, amount: true } })
  if (entries.length === 0) {
    return { ok: false, error: `No production entries in the period ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}${deptName ? ` for dept ${args.deptCode}` : ''}${operatorName ? ` for operator ${args.operatorCode}` : ''}` }
  }
  const qty = entries.reduce((s, e) => s + e.qty, 0)
  const amount = Math.round(entries.reduce((s, e) => s + e.amount, 0))
  if (amount <= 0) {
    return { ok: false, error: `Period production amounts to ₹0 (${entries.length} entries, qty ${qty}) — nothing to bill` }
  }

  const period = `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`
  const scope = [deptName, operatorName].filter(Boolean).join(' · ') || 'all departments'
  const narration = args.narration || `Production bill ${period} · ${scope} · ${entries.length} entries · ${qty} pcs`

  const resolvedVoucherNo = await (async () => {
    const all = await db.journal.findMany({ where: { voucherNo: { startsWith: 'V-' } } })
    const used = new Set(all.map((j) => j.voucherNo))
    let n = 1
    while (used.has(`V-${String(n).padStart(4, '0')}`)) n++
    return `V-${String(n).padStart(4, '0')}`
  })()

  // SPEC-M50 M-01 (CA-04) — resolve the legs BEFORE the plan text; a miss is
  // a LOUD refusal (never an unlinked journal).
  const wagesAcc = await resolveAccountByRef('Production Wages')
  const payableAcc = await resolveAccountByRef('Wage Payable')
  if (!wagesAcc || !payableAcc) {
    const miss = !wagesAcc ? 'Production Wages' : 'Wage Payable'
    return { ok: false, error: `Chart of accounts incomplete — account '${miss}' is missing. Seed it (scripts/seed_coa.ts) or create it (create_account / /masters/account); a journal cannot save unlinked accounts (SPEC-M50 M-01).` }
  }

  return {
    ok: true,
    text: `Proposed production bill ${resolvedVoucherNo} — ₹${amount} across ${entries.length} entries (${qty} pcs, ${scope}).`,
    summary: `Post production bill ${resolvedVoucherNo} | Dr ${accountLabel(wagesAcc, 'Production Wages')} / Cr ${accountLabel(payableAcc, 'Wage Payable')} | ₹${amount} | ${period} | ${scope}`,
    creates: [
      { table: 'journal', data: { voucherNo: resolvedVoucherNo, voucherType: 'journal', partyId: operatorPartyId, debitAccount: 'Production Wages', creditAccount: 'Wage Payable', debitAccountId: wagesAcc.id, creditAccountId: payableAcc.id, amount, narration } },
    ],
    sideEffects: [
      'Wage Payable grows by the bill amount (the hr/wages register reads the same account)',
      'Production Wages expense recognized for the period',
      `GL legs classify to ${wagesAcc.code} / ${payableAcc.code} (the chart of accounts — SPEC-M50)`,
      ...(operatorPartyId
        ? [`Employee-party ${operatorPartyCode} credited — the party ledger + operator statement now see this bill (earned leg)`]
        : ['No party stamped — an aggregate bill across operators hits no single party ledger (run per-operator bills to reconcile)']),
    ],
    async commit() {
      // CA-04 — re-resolve in-commit (the plan resolved the same names).
      const wagesLeg = await resolveAccountByRef('Production Wages')
      const payableLeg = await resolveAccountByRef('Wage Payable')
      if (!wagesLeg || !payableLeg) throw new Error(`Chart of accounts incomplete — '${!wagesLeg ? 'Production Wages' : 'Wage Payable'}' is missing (SPEC-M50 M-01)`)
      const j = await db.journal.create({
        data: {
          voucherNo: resolvedVoucherNo, voucherType: 'journal',
          date: istTodayDate(), finYear: await activeFinYear(),
          partyId: operatorPartyId,
          debitAccount: 'Production Wages', creditAccount: 'Wage Payable',
          debitAccountId: wagesLeg.id, creditAccountId: payableLeg.id,
          amount, narration,
        },
      })
      return { id: j.id, voucherNo: j.voucherNo, amount, entries: entries.length, qty, partyCode: operatorPartyCode || undefined }
    },
  }
}
