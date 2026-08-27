/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-31 — create_expense service. Expense row (ADR-015) — EXP-####
// auto docNo. category='stylewise' requires orderNo; partyCode is the
// paid-to party. Document-only — the expense book feeds /costing/expenses
// (and budget-vs-actual reads CostSheet, NOT Expense — expenses are the
// cash-side book).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { ExpenseInput } from '../schemas/expense'

const CATEGORIES = ['fixed', 'stylewise', 'general', 'transport', 'other']
const STATUSES = ['recorded', 'settled']

export async function planExpense(args: ExpenseInput): Promise<DocPlanResult> {
  const finYear = args.finYear?.trim() || '26-27'
  if (!CATEGORIES.includes(args.category)) {
    return { ok: false, error: `category must be one of ${CATEGORIES.join(' | ')} (got '${args.category}')` }
  }
  const status = args.status?.trim() || 'recorded'
  if (!STATUSES.includes(status)) {
    return { ok: false, error: `status must be recorded | settled (got '${status}')` }
  }

  let orderId: string | undefined
  if (args.orderNo?.trim()) {
    const o = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
    if (!o) return { ok: false, error: `Order ${args.orderNo} not found` }
    orderId = o.id
  }
  if (args.category === 'stylewise' && !orderId) {
    return { ok: false, error: 'A stylewise expense needs an orderNo' }
  }
  let partyId: string | undefined
  if (args.partyCode?.trim()) {
    const p = await db.party.findUnique({ where: { code: args.partyCode.trim() } })
    if (!p) return { ok: false, error: `Party ${args.partyCode} not found` }
    partyId = p.id
  }

  const resolvedNo = await (async () => {
    const desired = args.expNo?.trim()
    if (desired) {
      const exists = await db.expense.findUnique({ where: { expNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.expense.findMany({ where: { expNo: { startsWith: 'EXP-' } } })
    const used = new Set(all.map((e) => e.expNo))
    let n = 1
    while (used.has(`EXP-${String(n).padStart(4, '0')}`)) n++
    return `EXP-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed expense ${resolvedNo} — ₹${args.amount} (${args.category}).`,
    summary: `Record expense ${resolvedNo} | ${args.category} | ₹${args.amount}${orderId ? ` | order ${args.orderNo}` : ''}${partyId ? ` | party ${args.partyCode}` : ''}`,
    creates: [
      { table: 'expense', data: { expNo: resolvedNo, finYear, category: args.category, orderId, partyId, amount: args.amount, narration: args.narration, status } },
    ],
    sideEffects: ['Expense appears in the expense book (/costing/expenses)'],
    async commit() {
      const e = await db.expense.create({
        data: {
          expNo: resolvedNo,
          expDate: args.expDate ? new Date(args.expDate) : new Date(),
          finYear, category: args.category, orderId, partyId,
          amount: args.amount, narration: args.narration, status,
        },
      })
      return { id: e.id, expNo: e.expNo, amount: e.amount }
    },
  }
}
