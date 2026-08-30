/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Lifecycle services — SPEC-M6 §7-C-5/6 (Wave C). Thin status transitions
 * with guards, sharing the plan/commit DocPlanResult contract so the screens
 * (thin DocScreens) and the docTools (close_order, cancel_program,
 * complete_program, complete_purchase_order, amend) are the SAME door
 * (ADR-001). Guards per spec:
 *  - close_order: despatch Σ ≥ 95% of totalPcs AND an invoice exists
 *  - cancel_program: ledger net-zero for the program item (or force)
 *  - complete_program: balance ≤ 0 (or force) — settles status only
 *  - complete_purchase_order: received qty > 0 → status received (HFX-10 —
 *    the PO_STATUS enum has no 'completed'; 'received' is the terminal value)
 *  - planOrderAmend: the update_order inline logic extracted (§7-C-5)
 */
import { db } from '@/lib/db'
import type { DocPlanResult } from './types'

export interface CloseOrderInput {
  orderNo: string
  force?: boolean
  notes?: string
}

export async function planCloseOrder(args: CloseOrderInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({
    where: { orderNo: args.orderNo },
    include: { salesInvoices: true },
  })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  if (order.status === 'closed') return { ok: false, error: `Order ${order.orderNo} is already closed` }
  if (order.status === 'cancelled') return { ok: false, error: `Order ${order.orderNo} is cancelled — cannot close` }
  const despatches = await db.pcsDespatch.findMany({ where: { orderId: order.id } })
  const despatched = despatches.reduce((s, d) => s + d.totalPcs, 0)
  const shippedPct = order.totalPcs > 0 ? despatched / order.totalPcs : 1
  const hasInvoice = order.salesInvoices.length > 0
  if (!args.force && (shippedPct < 0.95 || !hasInvoice)) {
    return {
      ok: false,
      error: `Guards failed for ${order.orderNo}: despatched ${Math.round(shippedPct * 100)}% (needs ≥ 95%)${hasInvoice ? '' : ' and NO invoice exists'} — pass force to override`,
    }
  }
  return {
    ok: true,
    text: `Proposed CLOSE of order ${order.orderNo} (despatched ${despatched}/${order.totalPcs} pcs).`,
    summary: `Close order ${order.orderNo} | despatched ${despatched}/${order.totalPcs} pcs | invoices ${order.salesInvoices.length}${args.force ? ' | FORCED' : ''}`,
    updates: [{ table: 'order', id: order.id, data: { status: 'closed' } }],
    sideEffects: ['Order blocks further entries (posting services reject closed orders)'],
    async commit() {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'closed', notes: args.notes ? `${order.notes ? order.notes + ' | ' : ''}${args.notes}` : order.notes },
      })
      return { id: order.id, orderNo: order.orderNo }
    },
  }
}

export interface ProgramLifecycleInput {
  programNo: string
  force?: boolean
  notes?: string
}

export async function planCancelProgram(args: ProgramLifecycleInput): Promise<DocPlanResult> {
  const program = await db.program.findUnique({ where: { programNo: args.programNo } })
  if (!program) return { ok: false, error: `Program ${args.programNo} not found` }
  if (program.status === 'cancelled') return { ok: false, error: `Program ${program.programNo} is already cancelled` }
  if (program.status === 'complete') return { ok: false, error: `Program ${program.programNo} is complete — cannot cancel` }
  // ledger net-zero guard: the program's item net movement must be zero
  // (everything consumed came back in) unless forced
  if (!args.force) {
    const itemKey = program.yarnId ? 'yarn' : 'fabric'
    const itemId = program.yarnId ?? program.fabricId
    if (!itemId) return { ok: false, error: `Program ${program.programNo} has no item linked — pass force to cancel anyway` }
    const ledger = await db.stockLedger.findMany({ where: { itemType: itemKey, itemId, orderId: program.orderId } })
    const netKgs = ledger.reduce((s, r) => s + r.inKgs - r.outKgs, 0)
    if (Math.abs(netKgs) > 0.01) {
      return { ok: false, error: `Program ${program.programNo} has a non-zero ledger balance (${netKgs.toFixed(2)} kgs) — settle stock first or pass force` }
    }
  }
  return {
    ok: true,
    text: `Proposed CANCEL of program ${program.programNo}.`,
    summary: `Cancel program ${program.programNo} | status ${program.status} → cancelled${args.force ? ' | FORCED' : ''}`,
    updates: [{ table: 'program', id: program.id, data: { status: 'cancelled' } }],
    sideEffects: ['Program stops appearing in balances; ledger rows stay (audit)'],
    async commit() {
      await db.program.update({ where: { id: program.id }, data: { status: 'cancelled' } })
      return { id: program.id, programNo: program.programNo }
    },
  }
}

export async function planCompleteProgram(args: ProgramLifecycleInput): Promise<DocPlanResult> {
  const program = await db.program.findUnique({ where: { programNo: args.programNo } })
  if (!program) return { ok: false, error: `Program ${args.programNo} not found` }
  if (program.status === 'complete') return { ok: false, error: `Program ${program.programNo} is already complete` }
  if (program.status === 'cancelled') return { ok: false, error: `Program ${program.programNo} is cancelled — cannot complete` }
  // balance guard: actual achieved ≥ required (ledger-derived, the
  // program-status math) unless forced
  if (!args.force) {
    const itemKey = program.yarnId ? 'yarn' : 'fabric'
    const itemId = program.yarnId ?? program.fabricId
    if (!itemId) return { ok: false, error: `Program ${program.programNo} has no item linked — pass force to complete anyway` }
    const ledger = await db.stockLedger.findMany({ where: { itemType: itemKey, itemId, orderId: program.orderId } })
    const actual = program.yarnId
      ? ledger.reduce((s, r) => s + r.outKgs, 0)
      : ledger.reduce((s, r) => s + r.inKgs, 0)
    if (actual + 0.01 < program.requiredKgs) {
      return { ok: false, error: `Program ${program.programNo} balance ${(program.requiredKgs - actual).toFixed(2)} kgs remains (achieved ${actual.toFixed(2)}/${program.requiredKgs}) — pass force to settle anyway` }
    }
  }
  return {
    ok: true,
    text: `Proposed COMPLETE of program ${program.programNo}.`,
    summary: `Complete program ${program.programNo} | status ${program.status} → completed${args.force ? ' | FORCED' : ''}`,
    updates: [{ table: 'program', id: program.id, data: { status: 'completed' } }],
    sideEffects: ['Program settles — balances stop projecting it'],
    async commit() {
      await db.program.update({ where: { id: program.id }, data: { status: 'completed' } })
      return { id: program.id, programNo: program.programNo }
    },
  }
}

export interface PoLifecycleInput {
  poNo: string
  action: 'cancel' | 'complete'
  reason?: string
}

export async function planPoLifecycle(args: PoLifecycleInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({ where: { poNo: args.poNo }, include: { grns: true } })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  if (args.action === 'cancel') {
    if (po.status === 'cancelled') return { ok: false, error: `PO ${po.poNo} is already cancelled` }
    const received = po.grns.reduce((s, g) => s + g.totalQty, 0)
    if (received > 0) {
      return { ok: false, error: `PO ${po.poNo} has ${received} qty received against it — cancel the receipts first (accounting-aware)` }
    }
    // same service the cancel_purchase_order tool uses (no fork — ADR-001)
    const { planCancelPo } = await import('./cancel')
    return planCancelPo({ poNo: args.poNo, reason: args.reason })
  }
  // complete — HFX-10 (Phase-6B Batch 0): the terminal value is 'received'
  // (PO_STATUS = open | partial | received | cancelled — there IS no
  // 'completed'). The old code wrote 'completed' — a value outside the enum,
  // invisible to every status filter. Transitions produce only enum values.
  if (po.status === 'received') return { ok: false, error: `PO ${po.poNo} is already fully received (completed)` }
  const received = po.grns.reduce((s, g) => s + g.totalQty, 0)
  if (received <= 0) return { ok: false, error: `PO ${po.poNo} has no receipts — receive a GRN against it first` }
  return {
    ok: true,
    text: `Proposed COMPLETE of PO ${po.poNo} (received ${received} qty).`,
    summary: `Complete PO ${po.poNo} | received ${received}/${po.totalQty} qty | status ${po.status} → received`,
    updates: [{ table: 'purchaseOrder', id: po.id, data: { status: 'received' } }],
    sideEffects: ['PO settles in party balances'],
    async commit() {
      await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'received' } })
      return { id: po.id, poNo: po.poNo }
    },
  }
}

export interface OrderAmendInput {
  orderNo: string
  deliveryDate?: string
  status?: string
  notes?: string
  totalPcs?: number
}

/** The update_order inline logic extracted (SPEC-M6 §7-C-5); the tool keeps
 *  its frozen json contract and delegates here. */
export async function planOrderAmend(args: OrderAmendInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const patch: any = {}
  if (args.deliveryDate) patch.deliveryDate = new Date(args.deliveryDate)
  if (args.status) patch.status = args.status
  if (args.notes !== undefined) patch.notes = args.notes
  if (args.totalPcs !== undefined && args.totalPcs > 0) patch.totalPcs = args.totalPcs
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'Nothing to amend — provide deliveryDate, status, notes or totalPcs' }
  }
  return {
    ok: true,
    text: `Proposed amendment to order ${order.orderNo}.`,
    summary: `Amend order ${order.orderNo} | fields: ${Object.keys(patch).join(', ')}`,
    updates: [{ table: 'order', id: order.id, data: patch }],
    sideEffects: ['Order master updated (history = updatedAt + notes)'],
    async commit() {
      await db.order.update({ where: { id: order.id }, data: patch })
      return { id: order.id, orderNo: order.orderNo }
    },
  }
}
