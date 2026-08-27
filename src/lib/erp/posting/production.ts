/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 10-11 — production entry + rework services. Logic extracted
// VERBATIM from tools.ts. Ledger effects: production_in pcs INTO G2 (good
// output only — rework entries are document-only, no stock move).
// SPEC-M5 §7-B (Wave B) — three variant wrappers/siblings over planProductionEntry
// (rows 8-10/13-14): finished-goods (D5 default), operation-entry (D4 default),
// scan_bundle (CutBundle-keyed prefill). The base fn and its tool stay
// byte-identical (§4 rule 1).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { ProductionEntryInput, ReworkInput } from '../schemas/production'
import type { FinishedGoodsInput, OperationEntryInput, ScanBundleInput } from '../schemas/production-variants'

export async function planProductionEntry(args: ProductionEntryInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const dept = await db.department.findUnique({ where: { code: args.deptCode } })
  if (!dept) return { ok: false, error: `Dept ${args.deptCode} not found` }
  const operator = await db.employee.findUnique({ where: { code: args.operatorCode } })
  if (!operator) return { ok: false, error: `Operator ${args.operatorCode} not found` }
  const amount = args.qty * args.rate
  return {
    ok: true,
    text: `Proposed production entry: ${args.qty} pcs by ${operator.name} on bundle ${args.bundleNo}, ₹${amount}.`,
    summary: `Post production | order ${args.orderNo} | dept ${dept.code} | ${args.qty} pcs | bundle ${args.bundleNo} | operator ${operator.name} | ₹${amount}`,
    creates: [{ table: 'productionEntry', data: { orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate), bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo || order.styleId, qty: args.qty, rate: args.rate, amount, lineId: args.lineId } }],
    sideEffects: ['WIP increases', 'Operator piece-rate earnings increase'],
    async commit() {
      return await db.$transaction(async (tx) => {
        const e = await tx.productionEntry.create({
          data: {
            orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate),
            bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo,
            qty: args.qty, rate: args.rate, amount, lineId: args.lineId,
          },
        })
        // Industry chain: good output enters G2 (Finished Goods) — production_in.
        // Rework entries do NOT move stock (pieces are re-sewn in WIP).
        const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
        if (g2) {
          await postLedger(tx, {
            txnType: 'production_in', itemType: 'pcs', itemId: order.id,
            godownId: g2.id, deptId: dept.id, orderId: order.id,
            docNo: args.bundleNo, docDate: new Date(args.prodDate),
            in: { pcs: args.qty },
            notes: `Production ${dept.code} bundle ${args.bundleNo}`,
          })
        }
        return { id: e.id }
      })
    },
  }
}

export async function planReworkEntry(args: ReworkInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const dept = await db.department.findUnique({ where: { code: args.deptCode } })
  if (!dept) return { ok: false, error: `Dept ${args.deptCode} not found` }
  const operator = args.operatorCode ? await db.employee.findUnique({ where: { code: args.operatorCode } }) : null
  if (args.operatorCode && !operator) return { ok: false, error: `Operator ${args.operatorCode} not found` }
  const prodDate = args.prodDate ? new Date(args.prodDate) : new Date()
  const rate = args.rate || 0
  const amount = args.qty * rate

  return {
    ok: true,
    text: `Proposed rework entry: ${args.qty} pcs of ${order.orderNo} re-processed @ ${dept.code}.`,
    summary: `Rework | order ${order.orderNo} | dept ${dept.code} | ${args.qty} pcs | bundle ${args.bundleNo}${operator ? ' | operator ' + operator.name : ''} | ₹${amount}`,
    creates: [{ table: 'productionEntry', data: { orderId: order.id, deptId: dept.id, prodDate, bundleNo: args.bundleNo, operatorId: operator?.id, qty: args.qty, rate, amount, rework: true, styleNo: order.styleId } }],
    sideEffects: ['Rework tracked separately from first-pass output', 'Piece-rate earnings accrue to the operator'],
    async commit() {
      const e = await db.productionEntry.create({
        data: { orderId: order.id, deptId: dept.id, prodDate, bundleNo: args.bundleNo, operatorId: operator?.id, qty: args.qty, rate, amount, rework: true },
      })
      return { id: e.id }
    },
  }
}

// ───────────── SPEC-M5 §7-B Wave B variants (posting-file wrappers, §4 rule 1) ─────────────

/** §7-B-8 — finished-goods entry (FrmFinishGoodsEntry): a production entry in
 *  the Finishing dept (D5) — the variant only injects the dept default; the
 *  G2 production_in ledger effect comes from the base service unchanged. */
export async function planFinishedGoods(args: FinishedGoodsInput): Promise<DocPlanResult> {
  return planProductionEntry({
    ...args,
    deptCode: args.deptCode?.trim() || 'D5',
  } as Parameters<typeof planProductionEntry>[0])
}

/** §7-B-9 — operation entry (FrmOperationEntry / Frm_SubProcess): a
 *  sub-process entry keyed by bundleNo in the Sewing dept (D4 default). */
export async function planOperationEntry(args: OperationEntryInput): Promise<DocPlanResult> {
  return planProductionEntry({
    ...args,
    deptCode: args.deptCode?.trim() || 'D4',
  } as Parameters<typeof planProductionEntry>[0])
}

/** §7-B-10 — bundle/barcode scan (FrmBundle_ProductionEntry /
 *  frmBarcodeReadingNew): DS keyed by bundleNo → looks up the CutBundle (by
 *  bundleNo OR barcode), prefills order/style/colour/size, qty defaults to
 *  the bundle qty, rate defaults to the operator's piece-rate master, then
 *  delegates to planProductionEntry. NOTE: CutBundle FKs are relation-less
 *  columns (PITFALLS #21) — order/cut/colour/size resolve via id lookups. */
export async function planScanBundle(args: ScanBundleInput): Promise<DocPlanResult> {
  const key = args.bundleNo?.trim()
  if (!key) return { ok: false, error: 'bundleNo is required (bundle no or scanned barcode)' }
  const bundle = await db.cutBundle.findFirst({
    where: { OR: [{ bundleNo: key }, { barcode: key }] },
  })
  if (!bundle) return { ok: false, error: `Bundle ${key} not found (create a cut order first — bundles are auto-generated)` }
  const cutOrder = bundle.cutOrderId
    ? await db.cutOrder.findUnique({ where: { id: bundle.cutOrderId } }).catch(() => null)
    : null
  const order = cutOrder?.orderId
    ? await db.order.findUnique({ where: { id: cutOrder.orderId } }).catch(() => null)
    : null
  if (!order) return { ok: false, error: `Cut order for bundle ${bundle.bundleNo} has no order` }
  const operator = await db.employee.findUnique({ where: { code: args.operatorCode } })
  if (!operator) return { ok: false, error: `Operator ${args.operatorCode} not found` }
  const colour = bundle.colourId
    ? await db.colour.findUnique({ where: { id: bundle.colourId } }).catch(() => null)
    : null
  const size = bundle.sizeId
    ? await db.size.findUnique({ where: { id: bundle.sizeId } }).catch(() => null)
    : null
  const qty = args.qty ?? bundle.qty
  const rate = args.rate ?? operator.pieceRate ?? 0
  return planProductionEntry({
    orderNo: order.orderNo,
    deptCode: args.deptCode?.trim() || 'D4',
    prodDate: args.prodDate || new Date().toISOString().slice(0, 10),
    bundleNo: bundle.bundleNo,
    operatorCode: args.operatorCode,
    qty,
    rate,
    styleNo: order.styleId ?? undefined,
    colourName: colour?.name,
    sizeName: size?.name,
  })
}
