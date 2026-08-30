/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §11 — transfer_stock service (NEW tool, Wave D).
// item + fromGodown + toGodown + qty → ONE transaction writing the ledger PAIR
// godown_transfer_out (from-godown) + godown_transfer_in (to-godown), both
// sharing one GT-#### doc number, each bumping its own CurrentStock bucket via
// postLedger (ADR-004 bucket rule). Net effect on total stock: zero.
// SPEC-M5 §6 (Wave C): requiresAck=true ALSO leaves a pending godown_transfer
// Approval (entityId = GT-####) inside the same transaction — the receiving
// unit acknowledges it at /dispatch/unit-transfer-ack (acknowledge_unit_transfer).

import { db } from '@/lib/db'
import { postLedger, docKeyViolation } from './ledger'
import type { DocPlanResult } from './types'
import type { TransferInput } from '../schemas/transfer'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }

/** GT-#### from StockLedger docNos (StockLedger.docNo is NOT unique — count, don't resolveDocNo). */
async function nextTransferNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'GT-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`GT-${String(n).padStart(4, '0')}`)) n++
  return `GT-${String(n).padStart(4, '0')}`
}

export async function planTransfer(args: TransferInput): Promise<DocPlanResult> {
  if (!ITEM_MODELS[args.itemType]) return { ok: false, error: `itemType must be yarn | fabric | accessory (got '${args.itemType}')` }
  const item = await (db as any)[ITEM_MODELS[args.itemType]].findUnique({ where: { code: args.itemCode } })
  if (!item) return { ok: false, error: `${args.itemType} ${args.itemCode} not found` }
  const fromGodown = await db.godown.findUnique({ where: { code: args.fromGodownCode } })
  if (!fromGodown) return { ok: false, error: `From-godown ${args.fromGodownCode} not found` }
  const toGodown = await db.godown.findUnique({ where: { code: args.toGodownCode } })
  if (!toGodown) return { ok: false, error: `To-godown ${args.toGodownCode} not found` }
  if (fromGodown.id === toGodown.id) return { ok: false, error: 'From- and to-godown must differ' }
  if (args.qty <= 0) return { ok: false, error: 'qty must be a positive number' }

  const uom = UOM[args.itemType]
  const docNo = args.docNo?.trim() || (await nextTransferNo())
  const docDate = dateOrIstToday(args.transferDate)
  const notes = args.notes ?? `Transfer ${args.itemCode} ${args.qty} ${uom} ${fromGodown.code} → ${toGodown.code}`

  return {
    ok: true,
    text: `Proposed transfer of ${args.qty} ${uom} of ${args.itemCode}: ${fromGodown.code} → ${toGodown.code}.`,
    summary: `Godown transfer ${docNo} | ${args.itemType} ${args.itemCode} | ${args.qty} ${uom} | ${fromGodown.code} → ${toGodown.code}`,
    creates: [
      { table: 'stockLedger', data: { txnType: 'godown_transfer_out', itemType: args.itemType, itemId: item.id, godownId: fromGodown.id, docNo, docKey: docNo, docDate, outKgs: uom === 'kgs' ? args.qty : 0, outPcs: uom === 'pcs' ? args.qty : 0, rate: item.rate, notes } },
      { table: 'stockLedger', data: { txnType: 'godown_transfer_in', itemType: args.itemType, itemId: item.id, godownId: toGodown.id, docNo, docDate, inKgs: uom === 'kgs' ? args.qty : 0, inPcs: uom === 'pcs' ? args.qty : 0, rate: item.rate, notes } },
      ...(args.requiresAck ? [{ table: 'approval', data: { entity: 'godown_transfer', entityId: docNo, step: 1, requestedBy: 'agent', status: 'pending' } }] : []),
    ],
    sideEffects: [
      `${fromGodown.code} current stock decreases by ${args.qty} ${uom}`,
      `${toGodown.code} current stock increases by ${args.qty} ${uom}`,
      'Total stock across godowns is unchanged (net zero)',
      ...(args.requiresAck ? [`Pending unit-transfer approval ${docNo} appears in /dispatch/unit-transfer-ack`] : []),
    ],
    async commit() {
      try {
        return await db.$transaction(async (tx) => {
          const outId = await postLedger(tx, {
            txnType: 'godown_transfer_out', itemType: args.itemType, itemId: item.id,
            godownId: fromGodown.id, docNo, docKey: docNo, docDate, rate: item.rate, notes,
            out: uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty },
          })
          const inId = await postLedger(tx, {
            txnType: 'godown_transfer_in', itemType: args.itemType, itemId: item.id,
            godownId: toGodown.id, docNo, docDate, rate: item.rate, notes,
            in: uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty },
          })
          // SPEC-M5 §6 Wave C — leave the pending ack row in the SAME transaction.
          if (args.requiresAck) {
            await tx.approval.create({
              data: { entity: 'godown_transfer', entityId: docNo, step: 1, requestedBy: 'agent', status: 'pending' },
            })
          }
          return { id: inId, outLedgerId: outId, docNo, fromGodown: fromGodown.code, toGodown: toGodown.code, ...(args.requiresAck ? { requiresAck: true } : {}) }
        })
      } catch (err) {
        throw docKeyViolation(err, docNo) ?? err
      }
    },
  }
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — transfer-family variants (§4 rule-2 siblings) ─────────

import type { PcsTransferInput, ReadyToCutInput } from '../schemas/transfer-variants'
import { bumpStock } from './ledger'
import { STAGE_DEPT } from '../legacy-enums'
import { dateOrIstToday } from '@/lib/erp/dates'

/** PT-#### from StockLedger docNos (docNo is NOT unique — count, don't resolveDocNo). */
async function nextPcsTransferNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'PT-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`PT-${String(n).padStart(4, '0')}`)) n++
  return `PT-${String(n).padStart(4, '0')}`
}

/** FrmPcsGodTransfer — Pcs Transfer (/pieces/transfer). Finished pieces move
 *  between godowns/units for ONE order (pcs buckets key itemId = the ORDER id
 *  — the base planTransfer takes item-master codes and rejects 'pcs'; this
 *  sibling posts the SAME godown_transfer_out/in pair via postLedger with a
 *  PT-#### docNo). Net effect across godowns: zero. */
export async function planPcsTransfer(args: PcsTransferInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const fromGodown = await db.godown.findUnique({ where: { code: args.fromGodownCode } })
  if (!fromGodown) return { ok: false, error: `From-godown ${args.fromGodownCode} not found` }
  const toGodown = await db.godown.findUnique({ where: { code: args.toGodownCode } })
  if (!toGodown) return { ok: false, error: `To-godown ${args.toGodownCode} not found` }
  if (fromGodown.id === toGodown.id) return { ok: false, error: 'From- and to-godown must differ' }
  if (args.qty <= 0) return { ok: false, error: 'qty must be a positive number' }

  const docNo = args.docNo?.trim() || (await nextPcsTransferNo())
  const docDate = dateOrIstToday(args.transferDate)
  const notes = args.notes ?? `Pcs transfer ${order.orderNo} ${args.qty} pcs ${fromGodown.code} → ${toGodown.code}`

  return {
    ok: true,
    text: `Proposed pcs transfer of ${args.qty} pcs of ${order.orderNo}: ${fromGodown.code} → ${toGodown.code}.`,
    summary: `Pcs transfer ${docNo} | order ${order.orderNo} | ${args.qty} pcs | ${fromGodown.code} → ${toGodown.code}`,
    creates: [
      { table: 'stockLedger', data: { txnType: 'godown_transfer_out', itemType: 'pcs', itemId: order.id, godownId: fromGodown.id, orderId: order.id, docNo, docKey: docNo, docDate, outPcs: args.qty, notes } },
      { table: 'stockLedger', data: { txnType: 'godown_transfer_in', itemType: 'pcs', itemId: order.id, godownId: toGodown.id, orderId: order.id, docNo, docDate, inPcs: args.qty, notes } },
    ],
    sideEffects: [
      `${fromGodown.code} pcs stock decreases by ${args.qty}`,
      `${toGodown.code} pcs stock increases by ${args.qty}`,
      'Total pcs across godowns is unchanged (net zero)',
    ],
    async commit() {
      try {
        return await db.$transaction(async (tx) => {
          const outId = await postLedger(tx, {
            txnType: 'godown_transfer_out', itemType: 'pcs', itemId: order.id,
            godownId: fromGodown.id, orderId: order.id, docNo, docKey: docNo, docDate,
            out: { pcs: args.qty }, notes,
          })
          const inId = await postLedger(tx, {
            txnType: 'godown_transfer_in', itemType: 'pcs', itemId: order.id,
            godownId: toGodown.id, orderId: order.id, docNo, docDate,
            in: { pcs: args.qty }, notes,
          })
          return { id: inId, outLedgerId: outId, docNo, fromGodown: fromGodown.code, toGodown: toGodown.code }
        })
      } catch (err) {
        throw docKeyViolation(err, docNo) ?? err
      }
    },
  }
}

/** RTC-#### from StockLedger docNos. */
async function nextReadyToCutNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'RTC-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`RTC-${String(n).padStart(4, '0')}`)) n++
  return `RTC-${String(n).padStart(4, '0')}`
}

/** frmReadytoCut — Ready to Cut (/cutting/ready-to-cut). Moves program stock
 *  into the virtual Cutting department (PITFALLS #12 legacy DeptID −7; our
 *  representation: a DEPT-KEYED CurrentStock bucket in the same godown — the
 *  planGrn dept-bucket precedent). Ledger pair sharing one RTC-#### docNo:
 *    ready_to_cut_out — null-dept bucket − kgs (the store pool; legacy TrType 20)
 *    ready_to_cut_in  — ledger row carries deptId = Cutting (D3), the IN leg
 *  bumps the D3-keyed bucket directly (postLedger forces null-dept buckets by
 *  the ADR-004 rule — the virtual dept is the sanctioned dept-bucket exception).
 *  Total godown stock unchanged; the cutting pool becomes visible as a dept row. */
export async function planReadyToCut(args: ReadyToCutInput): Promise<DocPlanResult> {
  const itemType = args.itemType ?? 'fabric'
  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric' }
  const item = await (db as any)[ITEM_MODELS[itemType]].findUnique({ where: { code: args.itemCode } })
  if (!item) return { ok: false, error: `${itemType} ${args.itemCode} not found` }
  const fromGodownCode = args.fromGodownCode?.trim() || 'G1'
  const fromGodown = await db.godown.findUnique({ where: { code: fromGodownCode } })
  if (!fromGodown) return { ok: false, error: `Godown ${fromGodownCode} not found` }
  const cutDept = await db.department.findUnique({ where: { code: STAGE_DEPT.cutting } })
  if (!cutDept) return { ok: false, error: `Cutting department ${STAGE_DEPT.cutting} not found` }
  if (args.qty <= 0) return { ok: false, error: 'qty must be a positive number' }

  let order: any = null
  if (args.orderNo) {
    order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
    if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  }

  const docNo = args.docNo?.trim() || (await nextReadyToCutNo())
  const docDate = dateOrIstToday(args.transferDate)
  const notes = args.notes ?? `Ready to cut ${args.qty} kgs of ${args.itemCode}${order ? ` (${order.orderNo})` : ''}`

  return {
    ok: true,
    text: `Proposed ready-to-cut ${docNo}: ${args.qty} kgs of ${args.itemCode} into the ${cutDept.name} pool.`,
    summary: `Ready to cut ${docNo} | ${itemType} ${args.itemCode} | ${args.qty} kgs | ${fromGodown.code} store → ${cutDept.code} pool${order ? ` | order ${order.orderNo}` : ''}`,
    creates: [
      { table: 'stockLedger', data: { txnType: 'ready_to_cut_out', itemType, itemId: item.id, godownId: fromGodown.id, orderId: order?.id ?? null, docNo, docKey: docNo, docDate, outKgs: args.qty, rate: item.rate, notes } },
      { table: 'stockLedger', data: { txnType: 'ready_to_cut_in', itemType, itemId: item.id, godownId: fromGodown.id, deptId: cutDept.id, orderId: order?.id ?? null, docNo, docDate, inKgs: args.qty, rate: item.rate, notes } },
    ],
    sideEffects: [
      `${fromGodown.code} store pool decreases by ${args.qty} kgs`,
      `${cutDept.code} (${cutDept.name}) ready-to-cut pool increases by ${args.qty} kgs — the virtual dept bucket`,
      `Total ${fromGodown.code} stock is unchanged (the move is between dept views)`,
    ],
    async commit() {
      try {
        return await db.$transaction(async (tx) => {
          // OUT leg — the null-dept store pool (postLedger: ADR-004 bucket rule)
          const outId = await postLedger(tx, {
            txnType: 'ready_to_cut_out', itemType, itemId: item.id,
            godownId: fromGodown.id, orderId: order?.id ?? null, docNo, docKey: docNo, docDate,
            out: { kgs: args.qty }, rate: item.rate, notes,
          })
          // IN leg — ledger row carries deptId D3; the bucket is dept-keyed
          // (bumpStock directly: postLedger would force a null-dept bucket)
          const inRow = await tx.stockLedger.create({
            data: {
              txnType: 'ready_to_cut_in', itemType, itemId: item.id,
              godownId: fromGodown.id, deptId: cutDept.id, orderId: order?.id ?? null,
              docNo, docDate, finYear: '26-27',
              inKgs: args.qty, rate: item.rate, notes,
            },
          })
          await bumpStock(tx, {
            itemType, itemId: item.id, godownId: fromGodown.id,
            deptId: cutDept.id, orderId: null,
          }, { kgs: args.qty })
          return { id: inRow.id, outLedgerId: outId, docNo, dept: cutDept.code }
        })
      } catch (err) {
        throw docKeyViolation(err, docNo) ?? err
      }
    },
  }
}
