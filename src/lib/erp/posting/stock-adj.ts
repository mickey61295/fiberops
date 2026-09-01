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
import { getFlag } from '@/lib/erp/flags'
import { dateOrIstToday } from '@/lib/erp/dates'

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

/** OPN-#### from StockLedger docNos (docNo is NOT unique — count, don't resolveDocNo). */
async function nextOpeningNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'OPN-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`OPN-${String(n).padStart(4, '0')}`)) n++
  return `OPN-${String(n).padStart(4, '0')}`
}

/** SPEC-M42 INV-07 — opening stock is postable only within the FY-start window
 *  when the opn_fy_gate flag arms it (default off = legacy). Reads the ACTIVE
 *  FinYear row (fallback: latest start — the numbering module's activeFinYear
 *  precedent). Ties into the Phase-6 FY-close discipline. */
async function assertOpeningWindow(): Promise<string | null> {
  const gate = await getFlag<boolean>('opn_fy_gate')
  if (!gate) return null
  const days = await getFlag<number>('opn_fy_window_days')
  const fy = (await db.finYear.findFirst({ where: { active: true } }))
    ?? (await db.finYear.findFirst({ orderBy: { start: 'desc' } }))
  if (!fy) {
    return 'opn_fy_gate is ON but no Fin Year exists — create one at Masters → Fin Year, or turn the flag off (admin flags) to allow OPN- entries anywhere.'
  }
  const start = fy.start instanceof Date ? fy.start : new Date(fy.start)
  const deadline = new Date(start.getTime() + days * 86_400_000)
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (today < start || today > deadline) {
    return `Opening stock (OPN-) is gated: FY ${fy.code} allows entries only ${fmt(start)} → ${fmt(deadline)} (${days}-day window from the FY start). Today (${fmt(today)}) is outside it — correct an ongoing year with ADJ- (Inventory → Adjustment), or turn off flag opn_fy_gate.`
  }
  return null
}

/** frmOpeningStock — Opening Stock (/inventory/opening-stock). The §4 recipe
 *  verbatim: wrap the EXISTING planStockAdjustment injecting the frozen
 *  defaults (action='add', reason='Opening stock') + the OPN-#### docNo space;
 *  the base service (and its post_stock_adjustment tool) stays byte-identical.
 *  SPEC-M42 INV-07: the FY-start window gate runs first (flag-gated, legacy
 *  default off). */
export async function planOpeningStock(args: OpeningStockInput): Promise<DocPlanResult> {
  const refusal = await assertOpeningWindow()
  if (refusal) return { ok: false, error: refusal }
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

/** SPEC-M42 INV-05 — waste is an IDENTITY now, not a good-stock restock.
 * REWRITTEN from the stock_adjustment wrapper: waste receipts post into the
 * WASTE godown (flag waste_godown_code — auto-vivified on first use, it's a
 * config row not business data) at the SCRAP rate (flag waste_scrap_rate,
 * ₹/kg — 0 means waste carries no value until the operator sets one), never
 * back into the good godown at the good item's rate. The WST- docNo family on
 * stock_adjustment_add remains the ledger identity (the report and the
 * waste-% KPI filter on it — decision §2-5: a distinct txnType would touch
 * enums + matrix + chain notes and buys nothing the family doesn't give). */
export async function planWasteReceipt(args: WasteReceiptInput): Promise<DocPlanResult> {
  const wasteClass = args.wasteClass?.trim() || ''
  if (!WASTE_CLASSES.includes(wasteClass)) {
    return { ok: false, error: `wasteClass must be one of ${WASTE_CLASSES.join(' | ')} (got '${args.wasteClass}')` }
  }
  if (!ITEM_MODELS[args.itemType]) return { ok: false, error: `itemType must be yarn | fabric | accessory (got '${args.itemType}')` }
  const item = await (db as any)[ITEM_MODELS[args.itemType]].findUnique({ where: { code: args.itemCode } })
  if (!item) return { ok: false, error: `${args.itemType} ${args.itemCode} not found` }
  if (args.qty <= 0) return { ok: false, error: 'qty must be a positive number' }

  // the SOURCE godown (where the waste came FROM — both doors collect it;
  // waste itself lands in the waste store): validated for existence, kept
  // out of the ledger notes (the M21 reason composition stays byte-identical)
  const srcCode = args.godownCode?.trim()
  if (srcCode) {
    const src = await db.godown.findUnique({ where: { code: srcCode } })
    if (!src) {
      return { ok: false, error: `Source godown ${srcCode} not found — this field records WHERE the waste came from; the waste itself posts into the waste store` }
    }
  }

  // the waste godown — auto-vivified (idempotent find-then-create; a godown
  // row is config, and the door stays zero-friction this way)
  const wasteCode = String(await getFlag('waste_godown_code')).trim() || 'WASTE'
  let wasteGodown = await db.godown.findUnique({ where: { code: wasteCode } })
  if (!wasteGodown) {
    wasteGodown = await db.godown.create({ data: { code: wasteCode, name: 'Waste store (scrap)' } })
  }
  const scrapRate = Number(await getFlag('waste_scrap_rate')) || 0

  const uom = UOM[args.itemType]
  const docNo = args.docNo?.trim() || (await nextWasteNo())
  const docDate = dateOrIstToday(args.adjDate)
  const qtyIn = uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty }
  const reason = `Waste — ${wasteClass}${args.notes?.trim() ? `: ${args.notes.trim()}` : ''}`

  return {
    ok: true,
    text: `Proposed waste receipt of ${args.qty} ${uom} of ${args.itemCode} (${wasteClass}${srcCode ? ` from ${srcCode}` : ''}) into godown ${wasteCode} at scrap rate ₹${scrapRate}/${uom}.`,
    summary: `Waste receipt | ${args.itemType} ${args.itemCode} | ${args.qty} ${uom} | waste godown ${wasteCode} | scrap rate ₹${scrapRate} | ${wasteClass}`,
    creates: [
      { table: 'stockLedger', data: { txnType: 'stock_adjustment_add', itemType: args.itemType, itemId: item.id, godownId: wasteGodown.id, docNo, docKey: docNo, docDate, inKgs: uom === 'kgs' ? args.qty : 0, inPcs: uom === 'pcs' ? args.qty : 0, rate: scrapRate, notes: reason } },
    ],
    sideEffects: [
      `Waste godown ${wasteCode} gains ${args.qty} ${uom} of ${args.itemCode} (valued at the scrap rate — good stock untouched)`,
      `The waste-% register (Inventory → Waste %) tracks it against production receipts`,
    ],
    async commit() {
      try {
        return await db.$transaction(async (tx) => {
          const ledgerId = await postLedger(tx, {
            txnType: 'stock_adjustment_add', itemType: args.itemType, itemId: item.id,
            godownId: wasteGodown.id, docNo, docKey: docNo, docDate,
            rate: scrapRate, notes: reason, in: qtyIn,
          })
          return { id: ledgerId, docNo, txnType: 'stock_adjustment_add' }
        })
      } catch (err) {
        throw docKeyViolation(err, docNo) ?? err
      }
    },
  }
}
