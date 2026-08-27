/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 5 — receive_grn service. Logic extracted from tools.ts
// (Wave A) with TWO documented bug fixes found by the doc-parity test — the
// legacy inline code was latently broken against the reconstructed 54-model
// schema (see FIX comments below). NOTE: this op does NOT use postLedger; it
// writes the StockLedger row + CurrentStock bucket inline (dept-keyed buckets
// when a deptCode is given — legacy behaviour preserved). Ledger: purchase_grn IN.
// SPEC-M5 §7-B-18 (Wave B) — sibling fn planJobworkPcsReturn: a process-return
// GRN (grnType='process_return', pcs lines) with StockLedger OUT of the pcs
// godown. planGrn and its receive_grn tool stay byte-identical (§4 rule 1).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { GrnInput } from '../schemas/grn'
import type { JobworkPcsReturnInput } from '../schemas/grn-variants'

export async function planGrn(args: GrnInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({
    where: { poNo: args.poNo }, include: { party: true, lines: true },
  })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  const godown = await db.godown.findUnique({ where: { code: args.godownCode } })
  if (!godown) return { ok: false, error: `Godown ${args.godownCode} not found` }
  let dept: any = null
  if (args.deptCode) dept = await db.department.findUnique({ where: { code: args.deptCode } })
  const line = po.lines[0]
  if (!line) return { ok: false, error: `PO has no lines` }
  const actualQty = args.receivedQty
  const totalValue = actualQty * line.rate
  const finYear = '26-27'

  // Resolve a free GRN number
  const resolvedGrnNo = await (async () => {
    const desired = args.grnNo?.trim()
    if (desired) {
      const exists = await db.gRN.findUnique({ where: { grnNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.gRN.findMany({ where: { grnNo: { startsWith: 'GRN-' } } })
    const used = new Set(all.map((g) => g.grnNo))
    let n = 1
    while (used.has(`GRN-${String(n).padStart(4, '0')}`)) n++
    return `GRN-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed GRN ${resolvedGrnNo} against ${args.poNo}, ${actualQty} units, ₹${totalValue}.`,
    summary: `Receive GRN ${resolvedGrnNo} against ${args.poNo} | ${actualQty} ${line.uomId || 'units'} | ₹${totalValue} | into ${godown.code}`,
    creates: [
      { table: 'grn', data: { grnNo: resolvedGrnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId, godownId: godown.id, deptId: dept?.id, grnDate: args.grnDate ? new Date(args.grnDate) : new Date(), finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue } },
      { table: 'grnLine', data: { itemType: line.itemType, itemId: line.itemId, qty: actualQty, rate: line.rate, amount: totalValue } },
      { table: 'stockLedger', data: { txnType: 'purchase_grn', itemType: line.itemType, itemId: line.itemId, godownId: godown.id, deptId: dept?.id, docNo: resolvedGrnNo, docDate: args.grnDate ? new Date(args.grnDate) : new Date(), finYear, inKgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0, inPcs: line.itemType === 'accessory' ? actualQty : 0, rate: line.rate, partyId: po.partyId, refId: '<pending>' } },
      { table: 'currentStock', data: { itemType: line.itemType, itemId: line.itemId, godownId: godown.id, deptId: dept?.id, kgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0, pcs: line.itemType === 'accessory' ? actualQty : 0, rate: line.rate } },
    ],
    updates: [
      { table: 'purchaseOrder', id: po.id, data: { status: actualQty >= po.totalQty ? 'received' : 'partial' } },
      { table: 'poLine', id: line.id, data: { receivedQty: { increment: actualQty } } },
    ],
    sideEffects: ['Stock increases', 'PO status becomes received/partial', 'Party ledger will reflect this GRN'],
    async commit() {
      return await db.$transaction(async (tx) => {
        const grn = await tx.gRN.create({
          data: {
            grnNo: resolvedGrnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId,
            godownId: godown.id, deptId: dept?.id, grnDate: args.grnDate ? new Date(args.grnDate) : new Date(),
            finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue,
            lines: { create: { itemType: line.itemType, itemId: line.itemId, qty: actualQty, rate: line.rate, amount: totalValue } },
          },
        })
        await tx.stockLedger.create({
          data: {
            txnType: 'purchase_grn', itemType: line.itemType, itemId: line.itemId,
            godownId: godown.id, deptId: dept?.id, docNo: resolvedGrnNo,
            docDate: args.grnDate ? new Date(args.grnDate) : new Date(),
            finYear, inKgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0,
            inPcs: line.itemType === 'accessory' ? actualQty : 0,
            rate: line.rate, partyId: po.partyId, refId: grn.id,
          },
        })
        // Upsert current stock
        // FIX #2 (found by doc-parity test, M3 Wave A): the legacy inline code
        // keyed/created the bucket with `deptId: dept?.id || ''` — the '' value
        // violates the CurrentStock→Department FK on create, and the ''-keyed
        // unique lookup can never match the null-keyed buckets that actually
        // exist. receive_grn WITHOUT a deptCode has been hard-broken since
        // rollback #4's schema reconstruction. Nulls now match the ADR-004
        // bucket pattern when no dept is given; dept-keyed buckets (legacy
        // GRN-with-dept behaviour, cf. the seeded fabric bucket) are preserved.
        // FIX #3 (found by Wave D's bucket-count assertion, PITFALLS #18 lineage):
        // findUnique THROWS when the compound-unique key carries nulls (Prisma
        // rejects null in findUnique unique-input) — the .catch swallowed it and
        // EVERY GRN created a duplicate 50-kg bucket instead of incrementing
        // (46 junk rows had accumulated across test runs). findFirst with
        // explicit nulls matches fine (the bumpStock pattern in ledger.ts);
        // the update goes by row id so even pre-existing duplicates consolidate.
        const bucketKey = {
          itemType: line.itemType, itemId: line.itemId, godownId: godown.id,
          lotId: null, colourId: null, sizeId: null, deptId: dept?.id ?? null, orderId: null,
        }
        const existing = await tx.currentStock.findFirst({ where: bucketKey })
        if (existing) {
          await tx.currentStock.update({
            where: { id: existing.id },
            data: {
              kgs: { increment: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0 },
              pcs: { increment: line.itemType === 'accessory' ? actualQty : 0 },
            },
          })
        } else {
          await tx.currentStock.create({
            data: {
              itemType: line.itemType, itemId: line.itemId, godownId: godown.id,
              deptId: dept?.id ?? null,
              kgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0,
              pcs: line.itemType === 'accessory' ? actualQty : 0,
              rate: line.rate,
            },
          })
        }
        // Update PO + POLine
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: actualQty >= po.totalQty ? 'received' : 'partial' },
        })
        await tx.pOLine.update({
          where: { id: line.id },
          data: { receivedQty: { increment: actualQty } },
        })
        return { id: grn.id, grnNo: grn.grnNo }
      })
    },
  }
}

// ───────────── SPEC-M5 §7-B-18 — jobwork pcs return (sibling, §4 rule 1) ─────────────

/** frmJobWorkPcsReturn — return pieces to a jobwork unit for rework. Creates
 *  a GRN row with grnType='process_return' + a pcs GRNLine, and posts the
 *  StockLedger OUT of the pcs godown (default G2 Finished Goods). Shares the
 *  GRN-#### number space (§4 rule 2: prefixes stay per-family). */
export async function planJobworkPcsReturn(args: JobworkPcsReturnInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const godownCode = args.godownCode?.trim() || 'G2'
  const godown = await db.godown.findUnique({ where: { code: godownCode } })
  if (!godown) return { ok: false, error: `Godown ${godownCode} not found` }
  const retNo = await resolveDocNo('gRN', 'grnNo', 'GRN-', args.retNo)
  const retDate = args.retDate ? new Date(args.retDate) : new Date()
  const notes = args.reason?.trim() || 'Return to jobwork for rework'

  return {
    ok: true,
    text: `Proposed jobwork pcs return ${retNo}: ${args.qty} pcs of ${order.orderNo} back to ${party.name}.`,
    summary: `Jobwork pcs return ${retNo} | order ${order.orderNo} | ${args.qty} pcs | to ${party.name} | out of ${godown.code} | ${notes}`,
    creates: [
      { table: 'grn', data: { grnNo: retNo, grnType: 'process_return', partyId: party.id, godownId: godown.id, grnDate: retDate, finYear: '26-27', totalQty: args.qty, totalValue: 0 } },
      { table: 'grnLine', data: { itemType: 'pcs', itemId: order.id, qty: args.qty, rate: 0, amount: 0 } },
      { table: 'stockLedger', data: { txnType: 'process_delivery', itemType: 'pcs', itemId: order.id, godownId: godown.id, docNo: retNo, docDate: retDate, outPcs: args.qty, partyId: party.id, notes } },
    ],
    sideEffects: [
      `StockLedger: ${args.qty} pcs OUT of ${godown.code} (process_delivery — back to jobworker)`,
      'Jobworker balance will reflect the return',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const grn = await tx.gRN.create({
          data: {
            grnNo: retNo, grnType: 'process_return', partyId: party.id, godownId: godown.id,
            grnDate: retDate, finYear: '26-27', totalQty: args.qty, totalValue: 0,
            lines: { create: { itemType: 'pcs', itemId: order.id, qty: args.qty, rate: 0, amount: 0 } },
          },
        })
        await postLedger(tx, {
          txnType: 'process_delivery', itemType: 'pcs', itemId: order.id,
          godownId: godown.id, orderId: order.id,
          docNo: retNo, docDate: retDate, partyId: party.id,
          out: { pcs: args.qty },
          notes: `Jobwork pcs return ${retNo} — ${notes}`,
        })
        return { id: grn.id, grnNo: grn.grnNo }
      })
    },
  }
}
