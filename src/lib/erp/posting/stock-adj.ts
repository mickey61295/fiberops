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
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { StockAdjInput } from '../schemas/stock-adj'

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
  const docDate = args.adjDate ? new Date(args.adjDate) : new Date()
  const txnType = isAdd ? 'stock_adjustment_add' : 'stock_adjustment_less'
  const qtyIn = isAdd ? (uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty }) : {}
  const qtyOut = isAdd ? {} : (uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty })

  return {
    ok: true,
    text: `Proposed stock ${isAdd ? 'addition' : 'reduction'} of ${args.qty} ${uom} of ${args.itemCode} at ${args.godownCode}.`,
    summary: `${isAdd ? 'Add to' : 'Reduce from'} stock | ${args.itemType} ${args.itemCode} | ${args.qty} ${uom} | godown ${args.godownCode} | reason: ${args.reason}`,
    creates: [
      { table: 'stockLedger', data: { txnType, itemType: args.itemType, itemId: item.id, godownId: godown.id, docNo, docDate, inKgs: isAdd && uom === 'kgs' ? args.qty : 0, outKgs: !isAdd && uom === 'kgs' ? args.qty : 0, inPcs: isAdd && uom === 'pcs' ? args.qty : 0, outPcs: !isAdd && uom === 'pcs' ? args.qty : 0, rate: item.rate, notes: args.reason } },
    ],
    sideEffects: [`${args.godownCode} current stock ${isAdd ? 'increases' : 'decreases'} by ${args.qty} ${uom}`],
    async commit() {
      return await db.$transaction(async (tx) => {
        const ledgerId = await postLedger(tx, {
          txnType, itemType: args.itemType, itemId: item.id, godownId: godown.id,
          docNo, docDate, rate: item.rate, notes: args.reason,
          in: qtyIn, out: qtyOut,
        })
        return { id: ledgerId, docNo, txnType }
      })
    },
  }
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — opening-stock variant (§4 rule-2 wrapper) ─────────

import type { OpeningStockInput } from '../schemas/stock-adj'

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
