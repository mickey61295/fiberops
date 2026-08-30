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
  if (args.operatorCode?.trim()) {
    const op = await db.employee.findUnique({ where: { code: args.operatorCode.trim() } })
    if (!op) return { ok: false, error: `Operator ${args.operatorCode} not found` }
    where.operatorId = op.id
    operatorName = op.name
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

  return {
    ok: true,
    text: `Proposed production bill ${resolvedVoucherNo} — ₹${amount} across ${entries.length} entries (${qty} pcs, ${scope}).`,
    summary: `Post production bill ${resolvedVoucherNo} | Dr Production Wages / Cr Wage Payable | ₹${amount} | ${period} | ${scope}`,
    creates: [
      { table: 'journal', data: { voucherNo: resolvedVoucherNo, voucherType: 'journal', debitAccount: 'Production Wages', creditAccount: 'Wage Payable', amount, narration } },
    ],
    sideEffects: [
      'Wage Payable grows by the bill amount (the hr/wages register reads the same account)',
      'Production Wages expense recognized for the period',
    ],
    async commit() {
      const j = await db.journal.create({
        data: {
          voucherNo: resolvedVoucherNo, voucherType: 'journal',
          date: istTodayDate(), finYear: '26-27',
          debitAccount: 'Production Wages', creditAccount: 'Wage Payable',
          amount, narration,
        },
      })
      return { id: j.id, voucherNo: j.voucherNo, amount, entries: entries.length, qty }
    },
  }
}
