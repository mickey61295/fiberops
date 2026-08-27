/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-A-1 — create_budget service. Budget + BudgetLine in one commit.
// The budget-vs-actual register (registers/budget.ts, M4) reads the SAME rows.
// No doc number on this model — the plan identifies by order/dept + amount.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { BudgetInput } from '../schemas/budget'

export async function planBudget(args: BudgetInput): Promise<DocPlanResult> {
  const finYear = args.finYear?.trim() || '26-27'

  let orderId: string | undefined
  if (args.orderNo?.trim()) {
    const order = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
    if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
    orderId = order.id
  }

  let deptId: string | undefined
  if (args.deptCode?.trim()) {
    const dept = await db.department.findUnique({ where: { code: args.deptCode.trim() } })
    if (!dept) return { ok: false, error: `Department ${args.deptCode} not found` }
    deptId = dept.id
  }

  if (!orderId && !deptId) {
    return { ok: false, error: 'A budget needs an orderNo or a deptCode (order or department budget)' }
  }

  const lineSum = args.lines.reduce((s, l) => s + l.amount, 0)
  const total = args.amount > 0 ? args.amount : lineSum
  const displayRef = args.orderNo?.trim() ? `order ${args.orderNo}` : `dept ${args.deptCode}`

  const lineData = args.lines.map((l) => ({
    workId: l.workId?.trim() || null,
    amount: l.amount,
    actualAmount: l.actualAmount ?? 0,
  }))

  return {
    ok: true,
    text: `Proposed ₹${total} budget for ${displayRef} across ${lineData.length} line(s).`,
    summary: `Create budget | ${displayRef} | finYear ${finYear} | ₹${total} (${lineData.length} lines)`,
    creates: [
      {
        table: 'budget',
        data: { orderId, deptId, finYear, amount: total, lines: lineData },
      },
    ],
    sideEffects: ['Budget appears in Budget vs Actual (order PO + production spend vs budget)'],
    async commit() {
      const budget = await db.budget.create({
        data: {
          orderId: orderId ?? null,
          deptId: deptId ?? null,
          finYear,
          amount: total,
          BudgetLine: { create: lineData },
        },
        include: { BudgetLine: true },
      })
      return { id: budget.id, amount: budget.amount, lines: budget.BudgetLine.length }
    },
  }
}
