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

/** Increment/decrement a CurrentStock bucket (negative deltas allowed — the ERP
 *  warns on negative stock but never blocks, matching legacy Fiberpro). */
export async function bumpStock(tx: any, k: StockKey, delta: { pcs?: number; kgs?: number; mtrs?: number; bags?: number; rate?: number }) {
  const key = normalizedStockKey(k)
  const existing = await tx.currentStock.findFirst({ where: key })
  if (existing) {
    await tx.currentStock.update({
      where: { id: existing.id },
      data: {
        pcs: { increment: delta.pcs || 0 },
        kgs: { increment: delta.kgs || 0 },
        mtrs: { increment: delta.mtrs || 0 },
        bags: { increment: delta.bags || 0 },
      },
    })
    return existing.id
  }
  const created = await tx.currentStock.create({
    data: { ...key, pcs: delta.pcs || 0, kgs: delta.kgs || 0, mtrs: delta.mtrs || 0, bags: delta.bags || 0, rate: delta.rate || 0 },
  })
  return created.id
}

/** Write one StockLedger movement row + bump CurrentStock, inside a transaction.
 * OPS-05 — `docKey` is the doc-level uniqueness anchor: set it on exactly ONE
 * row per document (the out leg of transfer pairs, the single row of
 * ADJ/OPN/WST). Leave it undefined for multi-line docs (GRN/cut/despatch lines
 * legitimately share a docNo). */
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
  const finYear = '26-27'
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
