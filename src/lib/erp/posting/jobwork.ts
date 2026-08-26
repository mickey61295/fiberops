/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 6-7 — jobwork out/in services. Logic extracted VERBATIM from
// tools.ts. Ledger effects: process_delivery OUT (Wave D upgrade target),
// process_receipt IN — the CURRENT tools are document-only (jobworkOrder row,
// no stock movement); preserved exactly.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { JobworkOutInput, JobworkInInput } from '../schemas/jobwork'

export async function planJobworkOut(args: JobworkOutInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.jobworkerCode } })
  if (!party) return { ok: false, error: `Party ${args.jobworkerCode} not found` }
  let order: any = null
  if (args.orderNo) {
    order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
    if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  }
  const resolvedDcNo = await (async () => {
    const desired = args.dcNo?.trim()
    if (desired) {
      const exists = await db.jobworkOrder.findUnique({ where: { dcNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.jobworkOrder.findMany({ where: { dcNo: { startsWith: 'JW-' } } })
    const used = new Set(all.map((j) => j.dcNo))
    let n = 1
    while (used.has(`JW-${String(n).padStart(4, '0')}`)) n++
    return `JW-${String(n).padStart(4, '0')}`
  })()
  const totalValue = args.totalValue ?? 0
  return {
    ok: true,
    text: `Proposed jobwork DC ${resolvedDcNo} → ${party.name} (${args.processType}), ${args.totalQty} units, ₹${totalValue}.`,
    summary: `Create jobwork DC ${resolvedDcNo} | ${party.name} | ${args.processType} | ${args.totalQty} units | ₹${totalValue} | expected in ${args.expectedInDate || '-'}`,
    creates: [{ table: 'jobworkOrder', data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId: order?.id, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate: args.outDate ? new Date(args.outDate) : new Date(), status: 'sent' } }],
    sideEffects: ['Material leaves main godown', 'Pending receipt at jobworker', 'ITC-04 line generated'],
    async commit() {
      const j = await db.jobworkOrder.create({ data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId: order?.id, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate: args.outDate ? new Date(args.outDate) : new Date(), status: 'sent' } })
      return { id: j.id, dcNo: j.dcNo }
    },
  }
}

export async function planJobworkIn(args: JobworkInInput): Promise<DocPlanResult> {
  const jw = await db.jobworkOrder.findUnique({ where: { dcNo: args.dcNo } })
  if (!jw) return { ok: false, error: `Jobwork DC ${args.dcNo} not found` }
  if (jw.status === 'received') return { ok: false, error: `Already received on ${jw.receivedDate}` }
  return {
    ok: true,
    text: `Proposed receipt of jobwork ${args.dcNo} — ${args.receivedQty || jw.totalQty} units.`,
    summary: `Receive jobwork DC ${args.dcNo} | qty ${args.receivedQty || jw.totalQty} | date ${args.receivedDate || 'today'}`,
    updates: [{ table: 'jobworkOrder', id: jw.id, data: { status: 'received', receivedDate: args.receivedDate ? new Date(args.receivedDate) : new Date(), totalQty: args.receivedQty ?? jw.totalQty } }],
    sideEffects: ['Material back in main godown', 'Jobwork cost booked'],
    async commit() {
      await db.jobworkOrder.update({ where: { id: jw.id }, data: { status: 'received', receivedDate: args.receivedDate ? new Date(args.receivedDate) : new Date(), totalQty: args.receivedQty ?? jw.totalQty } })
      return { id: jw.id, dcNo: jw.dcNo }
    },
  }
}
