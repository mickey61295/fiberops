/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §11 — post_stock_adjustment service (NEW tool, Wave D).
// godown + itemType/item + add/less qty (+ reason). Ledger: stock_adjustment_add
// / stock_adjustment_less via postLedger — the ADR-004 bucket rule applies
// (null dims on the CurrentStock bucket). Semantics mirror the legacy inline
// adjust_stock tool (kgs for yarn/fabric, pcs for accessory; rate carried from
// the item master) except the doc number is a monotonic ADJ-#### instead of
// ADJ-<timestamp> and the write goes through the shared ledger helper inside
// one transaction. The inline adjust_stock tool stays as-is (legacy door).

import { db } from '@/lib/db'
import { postLedger, docKeyViolation } from './ledger'
import type { DocPlanResult } from './types'
import type { StockAdjInput, WasteReceiptInput } from '../schemas/stock-adj'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }

/** ADJ-#### from StockLedger docNos (StockLedger.docNo is NOT unique — count, don't resolveDocNo). */
async function nextAdjNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'ADJ-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`ADJ-${String(n).padStart(4, '0')}`)) n++
  return `ADJ-${String(n).padStart(4, '0')}`
}

export async function planStockAdjustment(args: StockAdjInput): Promise<DocPlanResult> {
  const godown = await db.godown.findUnique({ where: { code: args.godownCode } })
  if (!godown) return { ok: false, error: `Godown ${args.godownCode} not found` }
  if (!ITEM_MODELS[args.itemType]) return { ok: false, error: `itemType must be yarn | fabric | accessory (got '${args.itemType}')` }
  const item = await (db as any)[ITEM_MODELS[args.itemType]].findUnique({ where: { code: args.itemCode } })
  if (!item) return { ok: false, error: `${args.itemType} ${args.itemCode} not found` }
  if (args.action !== 'add' && args.action !== 'less') return { ok: false, error: `action must be add | less (got '${args.action}')` }
  if (args.qty <= 0) return { ok: false, error: 'qty must be a positive number' }

  const uom = UOM[args.itemType]
  const isAdd = args.action === 'add'
  const docNo = args.docNo?.trim() || (await nextAdjNo())
  const docDate = dateOrIstToday(args.adjDate)
  const txnType = isAdd ? 'stock_adjustment_add' : 'stock_adjustment_less'
  const qtyIn = isAdd ? (uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty }) : {}
  const qtyOut = isAdd ? {} : (uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty })

  return {
    ok: true,
    text: `Proposed stock ${isAdd ? 'addition' : 'reduction'} of ${args.qty} ${uom} of ${args.itemCode} at ${args.godownCode}.`,
    summary: `${isAdd ? 'Add to' : 'Reduce from'} stock | ${args.itemType} ${args.itemCode} | ${args.qty} ${uom} | godown ${args.godownCode} | reason: ${args.reason}`,
    creates: [
      { table: 'stockLedger', data: { txnType, itemType: args.itemType, itemId: item.id, godownId: godown.id, docNo, docKey: docNo, docDate, inKgs: isAdd && uom === 'kgs' ? args.qty : 0, outKgs: !isAdd && uom === 'kgs' ? args.qty : 0, inPcs: isAdd && uom === 'pcs' ? args.qty : 0, outPcs: !isAdd && uom === 'pcs' ? args.qty : 0, rate: item.rate, notes: args.reason } },
    ],
    sideEffects: [`${args.godownCode} current stock ${isAdd ? 'increases' : 'decreases'} by ${args.qty} ${uom}`],
    async commit() {
      try {
        return await db.$transaction(async (tx) => {
          const ledgerId = await postLedger(tx, {
            txnType, itemType: args.itemType, itemId: item.id, godownId: godown.id,
            docNo, docKey: docNo, docDate, rate: item.rate, notes: args.reason,
            in: qtyIn, out: qtyOut,
          })
          return { id: ledgerId, docNo, txnType }
        })
      } catch (err) {
        throw docKeyViolation(err, docNo) ?? err
      }
    },
  }
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — opening-stock variant (§4 rule-2 wrapper) ─────────

import type { OpeningStockInput } from '../schemas/stock-adj'
import { dateOrIstToday } from '@/lib/erp/dates'

/** OPN-#### from StockLedger docNos (docNo is NOT unique — count, don't resolveDocNo). */
async function nextOpeningNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'OPN-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`OPN-${String(n).padStart(4, '0')}`)) n++
  return `OPN-${String(n).padStart(4, '0')}`
}

/** frmOpeningStock — Opening Stock (/inventory/opening-stock). The §4 recipe
 *  verbatim: wrap the EXISTING planStockAdjustment injecting the frozen
 *  defaults (action='add', reason='Opening stock') + the OPN-#### docNo space;
 *  the base service (and its post_stock_adjustment tool) stays byte-identical. */
export async function planOpeningStock(args: OpeningStockInput): Promise<DocPlanResult> {
  const docNo = args.docNo?.trim() || (await nextOpeningNo())
  return planStockAdjustment({
    ...args,
    docNo,
    action: 'add',
    reason: 'Opening stock',
  } as Parameters<typeof planStockAdjustment>[0])
}

/** WST-#### from StockLedger docNos (SPEC-M21; docNo is NOT unique — count, don't resolveDocNo). */
async function nextWasteNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'WST-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`WST-${String(n).padStart(4, '0')}`)) n++
  return `WST-${String(n).padStart(4, '0')}`
}

const WASTE_CLASSES = ['knitting', 'dyeing', 'cutting', 'packing', 'general']

/** FrmWasteReceiptEntry — Waste Receipt (/inventory/waste-receipt, SPEC-M21).
 *  The opening-stock recipe: wrapper fixes action='add', composes the reason
 *  from the wasteClass (`Waste — <class>[ : notes]`), resolves WST-####, and
 *  delegates to planStockAdjustment VERBATIM (the base service and its
 *  post_stock_adjustment tool stay byte-identical). Waste rides the
 *  stock_adjustment_add txnType — the WST- docNo + notes distinguish it (a
 *  distinct txnType would need a chain.ts note + ADR and buys nothing today). */
export async function planWasteReceipt(args: WasteReceiptInput): Promise<DocPlanResult> {
  const wasteClass = args.wasteClass?.trim() || ''
  if (!WASTE_CLASSES.includes(wasteClass)) {
    return { ok: false, error: `wasteClass must be one of ${WASTE_CLASSES.join(' | ')} (got '${args.wasteClass}')` }
  }
  const docNo = args.docNo?.trim() || (await nextWasteNo())
  const reason = `Waste — ${wasteClass}${args.notes?.trim() ? `: ${args.notes.trim()}` : ''}`
  return planStockAdjustment({
    ...args,
    docNo,
    action: 'add',
    reason,
  } as Parameters<typeof planStockAdjustment>[0])
}
