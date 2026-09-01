/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 13 — create_pcs_despatch service. Logic extracted VERBATIM
// from tools.ts. Ledger effect: sales_delivery pcs OUT of G2 (postLedger).
// SPEC-M5 §6 (Wave C): returnable=false ALSO leaves a pending non_return_dc
// Approval (entityId = the DC id) inside the same transaction — approved at
// /quality/non-return-dc (approve_non_return_dc tool).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { DespatchInput } from '../schemas/despatch'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planPcsDespatch(args: DespatchInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo }, include: { buyer: true } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  // HFX-02 (Phase-6B Batch 0) — resolve line colour/size NAMES to ids BEFORE
  // planning (the packing-list id-map precedent, ERRATUM 4 picker convention):
  // the schema accepts colourName/sizeName, the PcsDespatchLine columns are
  // colourId/sizeId, and the old commit silently DROPPED them (despatch.ts:59
  // created lines with styleNo/qty/rate only) — every DC showed colourless,
  // sizeless lines in the view + courier/LAD print.
  const colourIds = new Map<string, string>()
  const sizeIds = new Map<string, string>()
  for (const l of args.lines || []) {
    if (l.colourName?.trim() && !colourIds.has(l.colourName.trim())) {
      const c = await db.colour.findUnique({ where: { name: l.colourName.trim() } })
      if (!c) return { ok: false, error: `Colour ${l.colourName} not found` }
      colourIds.set(l.colourName.trim(), c.id)
    }
    if (l.sizeName?.trim() && !sizeIds.has(l.sizeName.trim())) {
      const s = await db.size.findUnique({ where: { name: l.sizeName.trim() } })
      if (!s) return { ok: false, error: `Size ${l.sizeName} not found` }
      sizeIds.set(l.sizeName.trim(), s.id)
    }
  }
  // SPEC-M6 §7-B — variant rules: courier REQUIRES courierName; loading uses
  // the LAD-#### number space and status 'loading' (DC- space untouched).
  const mode = args.mode ?? 'despatch'
  if (mode === 'courier' && !args.courierName?.trim()) {
    return { ok: false, error: 'Courier DC requires courierName (the courier company)' }
  }
  const numberPrefix = mode === 'loading' ? 'LAD-' : 'DC-'
  const initialStatus = mode === 'loading' ? 'loading' : 'despatched'
  const finYear = '26-27'
  const resolvedDcNo = await (async () => {
    const desired = args.dcNo?.trim()
    if (desired) {
      const exists = await db.pcsDespatch.findUnique({ where: { dcNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.pcsDespatch.findMany({ where: { dcNo: { startsWith: numberPrefix } } })
    const used = new Set(all.map((d) => d.dcNo))
    let n = 1
    while (used.has(`${numberPrefix}${String(n).padStart(4, '0')}`)) n++
    return `${numberPrefix}${String(n).padStart(4, '0')}`
  })()
  const lines = args.lines || []
  const lineRows = lines.map((l) => ({
    styleNo: l.styleNo,
    qty: l.qty,
    rate: l.rate || 0,
    colourId: l.colourName?.trim() ? colourIds.get(l.colourName.trim()) ?? null : null,
    sizeId: l.sizeName?.trim() ? sizeIds.get(l.sizeName.trim()) ?? null : null,
  }))
  return {
    ok: true,
    text: `Proposed despatch DC ${resolvedDcNo} for ${order.orderNo} — ${args.totalPcs} pcs.`,
    summary: `Create despatch DC ${resolvedDcNo} | order ${order.orderNo} | buyer ${order.buyer?.name || '-'} | ${args.totalPcs} pcs | vehicle ${args.vehicleNo || '-'} | courier ${args.courierName || '-'}`,
    creates: [
      { table: 'pcsDespatch', data: { dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId, despatchDate: dateOrIstToday(args.despatchDate), finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: initialStatus, lrNo: args.lrNo, transporter: args.transporter, freight: args.freight, cartons: args.cartons, grossWeightKg: args.grossWeightKg } },
      ...lineRows.map((l) => ({ table: 'pcsDespatchLine', data: { pcsDespatchId: '<pending>', styleNo: l.styleNo, qty: l.qty, rate: l.rate || 0, colourId: l.colourId, sizeId: l.sizeId } })),
      ...(args.returnable === false ? [{ table: 'approval', data: { entity: 'non_return_dc', entityId: '<pending>', step: 1, requestedBy: 'agent', status: 'pending' } }] : []),
    ],
    sideEffects: [
      'Finished goods stock reduces',
      'Order completion % increases',
      ...(args.returnable === false ? [`Pending non-return DC approval for ${resolvedDcNo} appears in /quality/non-return-dc`] : []),
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const d = await tx.pcsDespatch.create({
          data: {
            dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId,
            despatchDate: dateOrIstToday(args.despatchDate),
            finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: initialStatus,
            lrNo: args.lrNo, transporter: args.transporter, freight: args.freight, cartons: args.cartons, grossWeightKg: args.grossWeightKg,
            lines: { create: lineRows.map(({ styleNo, qty, rate, colourId, sizeId }) => ({ styleNo, qty, rate, colourId, sizeId })) },
          },
        })
        // Industry chain: despatched pcs leave G2 (Finished Goods) — sales_delivery.
        const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
        if (g2) {
          await postLedger(tx, {
            txnType: 'sales_delivery', itemType: 'pcs', itemId: order.id,
            godownId: g2.id, deptId: null, orderId: order.id,
            docNo: resolvedDcNo, docDate: dateOrIstToday(args.despatchDate),
            out: { pcs: args.totalPcs },
            notes: `Despatch DC ${resolvedDcNo} → ${order.buyer?.name || 'buyer'}`,
          })
        }
        // SPEC-M5 §6 Wave C — leave the pending non-return row in the SAME transaction.
        if (args.returnable === false) {
          await tx.approval.create({
            data: { entity: 'non_return_dc', entityId: d.id, step: 1, requestedBy: 'agent', status: 'pending' },
          })
        }
        return { id: d.id, dcNo: d.dcNo, ...(args.returnable === false ? { nonReturnApproval: true } : {}) }
      })
    },
  }
}
