/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-35 — allot_contract service (Contract Allotment,
// /jobwork/contract). JobworkOrder recorded with status='allotted' BEFORE
// material leaves: dcNo gets an AL-#### placeholder prefix (§7-D-35). The
// real JW-#### DC is issued later via create_jobwork_order; receiving
// against the allotment flips status (receive_jobwork). Wraps the SAME
// JobworkOrder model the jobwork family uses — no schema growth.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { ContractAllotmentInput } from '../schemas/contract-allotment'
import { dateOrIstToday } from '@/lib/erp/dates'

const PROCESSES = ['washing', 'dyeing', 'printing', 'embroidery']

export async function planContractAllotment(args: ContractAllotmentInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.jobworkerCode.trim() } })
  if (!party) return { ok: false, error: `Party ${args.jobworkerCode} not found` }
  if (!PROCESSES.includes(args.processType)) {
    return { ok: false, error: `processType must be one of ${PROCESSES.join(' | ')} (got '${args.processType}')` }
  }

  let orderId: string | undefined
  if (args.orderNo?.trim()) {
    const o = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
    if (!o) return { ok: false, error: `Order ${args.orderNo} not found` }
    orderId = o.id
  }

  const resolvedNo = await (async () => {
    const all = await db.jobworkOrder.findMany({ where: { dcNo: { startsWith: 'AL-' } } })
    const used = new Set(all.map((j) => j.dcNo))
    let n = 1
    while (used.has(`AL-${String(n).padStart(4, '0')}`)) n++
    return `AL-${String(n).padStart(4, '0')}`
  })()

  const totalValue = args.totalValue ?? 0

  return {
    ok: true,
    text: `Proposed contract allotment ${resolvedNo} → ${party.name} (${args.processType}), ${args.totalQty} units.`,
    summary: `Allot contract ${resolvedNo} | ${party.name} | ${args.processType} | ${args.totalQty} units | ₹${totalValue}${orderId ? ` | order ${args.orderNo}` : ''} | NO material leaves yet`,
    creates: [
      { table: 'jobworkOrder', data: { dcNo: resolvedNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId, status: 'allotted' } },
    ],
    sideEffects: [
      'Allotment appears in /jobwork/contract with status allotted',
      'Material leaves ONLY when the real JW-#### DC is created (create_jobwork_order)',
    ],
    async commit() {
      const j = await db.jobworkOrder.create({
        data: {
          dcNo: resolvedNo, jobworkerId: party.id, processType: args.processType,
          totalQty: args.totalQty, totalValue, orderId,
          outDate: dateOrIstToday(args.allotDate),
          expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null,
          status: 'allotted',
        },
      })
      return { id: j.id, dcNo: j.dcNo, status: j.status }
    },
  }
}
