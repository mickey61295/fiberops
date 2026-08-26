/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 19-21 — cancel services (order / PO / invoice). Logic
// extracted VERBATIM from tools.ts. NOTE: the CURRENT tools have NO downstream
// guard (the spec's "guard: no downstream docs" is a Wave-B doc-view upgrade);
// behaviour preserved exactly.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { CancelOrderInput, CancelPoInput, CancelInvoiceInput } from '../schemas/cancel'

export async function planCancelOrder(args: CancelOrderInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  return {
    ok: true,
    text: `Proposed cancellation of ${args.orderNo}.`,
    summary: `Cancel order ${args.orderNo} (was ${order.status}) | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'order', id: order.id, data: { status: 'cancelled', notes: args.reason } }],
    sideEffects: ['POs linked to this order remain open', 'Production entries are not deleted'],
    async commit() {
      await db.order.update({ where: { id: order.id }, data: { status: 'cancelled', notes: args.reason } })
      return { id: order.id, status: 'cancelled' }
    },
  }
}

export async function planCancelPo(args: CancelPoInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({ where: { poNo: args.poNo } })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  return {
    ok: true,
    text: `Proposed cancellation of ${args.poNo}.`,
    summary: `Cancel PO ${args.poNo} (was ${po.status}) | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'purchaseOrder', id: po.id, data: { status: 'cancelled', notes: args.reason } }],
    sideEffects: ['No GRNs can be received against this PO', 'Linked order PO balance is reopened'],
    async commit() {
      await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'cancelled', notes: args.reason } })
      return { id: po.id, status: 'cancelled' }
    },
  }
}

export async function planCancelInvoice(args: CancelInvoiceInput): Promise<DocPlanResult> {
  const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: args.invoiceNo } })
  if (!inv) return { ok: false, error: `Invoice ${args.invoiceNo} not found` }
  return {
    ok: true,
    text: `Proposed cancellation of ${args.invoiceNo}.`,
    summary: `Cancel invoice ${args.invoiceNo} (was ${inv.status}) | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'salesInvoice', id: inv.id, data: { status: 'cancelled' } }],
    sideEffects: ['Party AR reduces', 'GST liability reverses'],
    async commit() {
      await db.salesInvoice.update({ where: { id: inv.id }, data: { status: 'cancelled' } })
      return { id: inv.id, status: 'cancelled' }
    },
  }
}
