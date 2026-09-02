/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 — stock posting helpers, extracted VERBATIM from tools.ts (Wave A).
// ADR-004 bucket rule travels with the code: the CurrentStock bucket key is
// (itemType, itemId, godownId) with all other dims NULL — deptId/orderId live
// on the LEDGER row for reporting but must NOT fragment the stock bucket,
// otherwise the cut-in (dept null) and line-out (dept D4) legs land in different
// buckets and never net out (PITFALLS #4).
// Consumers: posting/cut.ts, production.ts, line-issue.ts, rejection.ts,
// despatch.ts (+ Wave D: stock-adj.ts, transfer.ts).

import { db } from '@/lib/db'
import { activeFinYear } from '../numbering'
import { wacStep, primaryQtyOf } from '@/lib/erp/valuation'
import { getFlag } from '@/lib/erp/flags'

// ───────────── Stock posting helpers (industry chain) ─────────────
// SQLite gotcha (learned the hard way): NULL ≠ '' inside composite unique keys,
// so CurrentStock buckets MUST be matched with explicit nulls, never loose
// equality. findFirst with a fully-normalized key, then update by row id.

export type StockKey = {
  itemType: string
  itemId: string
  godownId: string
  lotId?: string | null
  colourId?: string | null
  sizeId?: string | null
  deptId?: string | null
  orderId?: string | null
}

function normalizedStockKey(k: StockKey) {
  return {
    itemType: k.itemType,
    itemId: k.itemId,
    godownId: k.godownId,
    lotId: k.lotId ?? null,
    colourId: k.colourId ?? null,
    sizeId: k.sizeId ?? null,
    deptId: k.deptId ?? null,
    orderId: k.orderId ?? null,
  }
}

/** Increment/decrement a CurrentStock bucket. Negative deltas allowed unless
 * the block_negative_stock flag arms the postLedger guard (INV-04) — legacy
 * Fiberpro warns but never blocks, and the flag default preserves that.
 *
 * SPEC-M42 INV-02 — the bucket's `rate` is now a MOVING WEIGHTED AVERAGE: an
 * in-leg carrying rate > 0 blends into it (weighted by the bucket's PRIMARY
 * uom qty — kgs for yarn/fabric, pcs for accessory/pcs) via the shared wacStep;
 * outs and unpriced ins never reprice (WAC convention). The closing-stock
 * replay (registers/closing-stock.ts) runs the identical arithmetic over the
 * same rows so the two agree bit-exactly — pinned by the golden test. */
export async function bumpStock(tx: any, k: StockKey, delta: { pcs?: number; kgs?: number; mtrs?: number; bags?: number; rate?: number }) {
  const key = normalizedStockKey(k)
  const existing = await tx.currentStock.findFirst({ where: key })
  if (existing) {
    const data: any = {
      pcs: { increment: delta.pcs || 0 },
      kgs: { increment: delta.kgs || 0 },
      mtrs: { increment: delta.mtrs || 0 },
      bags: { increment: delta.bags || 0 },
    }
    // INV-02: in-branches with a rate maintain the moving weighted average.
    const inQty = primaryQtyOf(k.itemType, { kgs: delta.kgs, pcs: delta.pcs })
    if (inQty > 0 && (delta.rate ?? 0) > 0) {
      const oldQty = primaryQtyOf(k.itemType, existing)
      data.rate = wacStep(oldQty, existing.rate ?? 0, inQty, delta.rate ?? 0)
    }
    await tx.currentStock.update({ where: { id: existing.id }, data })
    return existing.id
  }
  const created = await tx.currentStock.create({
    data: { ...key, pcs: delta.pcs || 0, kgs: delta.kgs || 0, mtrs: delta.mtrs || 0, bags: delta.bags || 0, rate: delta.rate || 0 },
  })
  return created.id
}

/** SPEC-M42 INV-04 — negative-stock guard. Runs BEFORE the ledger row is
 * written (inside the caller's transaction): if the flag is armed and any uom
 * the movement touches would land the bucket below −1e-9, throws an
 * actionable error naming item / godown / on-hand / movement. Flag off = the
 * legacy warn-only behavior (the flag read rides WAL — a concurrent flip can
 * race at most one document, loudly, the same class of race the docKey unique
 * anchor tolerates). Item/godown codes resolve best-effort on the FAILURE path
 * only (the hot path pays nothing). */
async function assertNoOverdraft(tx: any, m: {
  txnType: string; itemType: string; itemId: string; godownId?: string;
  in?: { pcs?: number; kgs?: number; mtrs?: number; bags?: number };
  out?: { pcs?: number; kgs?: number; mtrs?: number; bags?: number };
  docNo?: string;
}): Promise<void> {
  if (!m.godownId || !m.out) return
  const armed = await getFlag<boolean>('block_negative_stock')
  if (!armed) return
  const key = { itemType: m.itemType, itemId: m.itemId, godownId: m.godownId, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null }
  const bucket = await tx.currentStock.findFirst({ where: key })
  const EPS = 1e-9
  const uoms: Array<[string, number, number]> = [
    ['kgs', bucket?.kgs ?? 0, m.out.kgs ?? 0],
    ['mtrs', bucket?.mtrs ?? 0, m.out.mtrs ?? 0],
    ['pcs', bucket?.pcs ?? 0, m.out.pcs ?? 0],
    ['bags', bucket?.bags ?? 0, m.out.bags ?? 0],
  ]
  const hit = uoms.find(([, onHand, out]) => out > 0 && onHand - out < -EPS)
  if (!hit) return
  const [uom, onHand, out] = hit
  // best-effort code resolution (failure path only)
  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style' }
  let itemLabel = `${m.itemType} ${m.itemId}`
  try {
    const model = (tx as any)[ITEM_MODELS[m.itemType] ?? '']
    const item = model ? await model.findUnique({ where: { id: m.itemId } }) : null
    if (item) itemLabel = `${m.itemType} ${item.code ?? item.styleNo ?? m.itemId}`
  } catch { /* ids are enough */ }
  let godownLabel = m.godownId
  try {
    const g = await tx.godown.findUnique({ where: { id: m.godownId } })
    if (g) godownLabel = g.code
  } catch { /* ids are enough */ }
  throw new Error(
    `Blocked: ${m.txnType}${m.docNo ? ` (${m.docNo})` : ''} would take ${itemLabel} at godown ${godownLabel} to ` +
    `${(onHand - out).toFixed(2)} ${uom} (on hand ${onHand.toFixed(2)}, moving ${out.toFixed(2)}). ` +
    `Reduce the quantity, receive stock first, or turn OFF flag block_negative_stock to allow the overdraft (legacy behavior).`
  )
}

/** Write one StockLedger movement row + bump CurrentStock, inside a transaction.
 * OPS-05 — `docKey` is the doc-level uniqueness anchor: set it on exactly ONE
 * row per document (the out leg of transfer pairs, the single row of
 * ADJ/OPN/WST). Leave it undefined for multi-line docs (GRN/cut/despatch lines
 * legitimately share a docNo). INV-02 — m.rate now rides into the bucket WAC;
 * INV-04 — the negative-stock guard runs first when the flag is armed. */
export async function postLedger(tx: any, m: {
  txnType: string
  itemType: string
  itemId: string
  godownId?: string
  deptId?: string | null
  orderId?: string | null
  docNo?: string
  docKey?: string
  docDate?: Date
  partyId?: string | null
  in?: { pcs?: number; kgs?: number; mtrs?: number; bags?: number }
  out?: { pcs?: number; kgs?: number; mtrs?: number; bags?: number }
  rate?: number
  notes?: string
}) {
  await assertNoOverdraft(tx, m)
  const finYear = await activeFinYear()
  const row = await tx.stockLedger.create({
    data: {
      txnType: m.txnType,
      itemType: m.itemType,
      itemId: m.itemId,
      godownId: m.godownId ?? null,
      deptId: m.deptId ?? null,
      orderId: m.orderId ?? null,
      docNo: m.docNo ?? null,
      docKey: m.docKey ?? null,
      docDate: m.docDate ?? new Date(),
      finYear,
      partyId: m.partyId ?? null,
      inPcs: m.in?.pcs || 0, inKgs: m.in?.kgs || 0, inMtrs: m.in?.mtrs || 0, inBags: m.in?.bags || 0,
      outPcs: m.out?.pcs || 0, outKgs: m.out?.kgs || 0, outMtrs: m.out?.mtrs || 0, outBags: m.out?.bags || 0,
      rate: m.rate || 0,
      notes: m.notes ?? null,
    },
  })
  if (m.godownId) {
    // NOTE: the CurrentStock bucket key is (itemType, itemId, godownId) with
    // all other dims NULL. deptId/orderId live on the LEDGER row for reporting,
    // but must NOT fragment the stock bucket — otherwise the cut-in (dept null)
    // and line-out (dept D4) legs land in different buckets and never net out.
    await bumpStock(tx, {
      itemType: m.itemType, itemId: m.itemId, godownId: m.godownId,
      deptId: null, orderId: null,
    }, {
      pcs: (m.in?.pcs || 0) - (m.out?.pcs || 0),
      kgs: (m.in?.kgs || 0) - (m.out?.kgs || 0),
      mtrs: (m.in?.mtrs || 0) - (m.out?.mtrs || 0),
      bags: (m.in?.bags || 0) - (m.out?.bags || 0),
      rate: m.rate || 0,
    })
  }
  return row.id
}

/** OPS-05 — translate a docKey unique violation (P2002) into an actionable
 * error naming the document number; null when the error is something else.
 * A racing plan that minted the same ADJ-/GT-/… number loses its transaction
 * here and fails LOUDLY instead of silently double-posting. */
export function docKeyViolation(err: unknown, docNo: string): Error | null {
  const e = err as { code?: string; meta?: { target?: unknown } }
  if (e?.code !== 'P2002') return null
  const target = Array.isArray(e.meta?.target) ? (e.meta.target as string[]).join(',') : String(e.meta?.target ?? '')
  if (!target.includes('docKey')) return null
  return new Error(`Document number ${docNo} was just taken by another user — retry to get the next number`)
}

// re-export for service files that need db directly (no logic lives here)
export { db }
