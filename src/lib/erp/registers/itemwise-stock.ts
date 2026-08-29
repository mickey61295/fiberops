/**
 * Itemwise Stock register service — SPEC-M19 §1-B (legacy FrmItemwiseStockRegister).
 * Groups StockLedger movements by (itemType, itemId) for the period: Σ in/out per
 * uom — summed SEPARATELY, never across uom columns (SPEC-M4 gotcha §14) — plus a
 * txn count. Item codes via the shared id-map helper (PITFALLS #21 — itemId is a
 * plain column; pcs items live in the STYLE master with styleNo as the code).
 * Direct read (ADR-001): the get_stock_ledger tool stays the txn-level twin.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { buildItemCodeMaps } from './resolve'

export async function queryItemwiseStock(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.itemType) where.itemType = q.itemType
  if (q.godown) {
    const g = await db.godown.findUnique({ where: { code: q.godown } })
    if (!g) return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }
    where.godownId = g.id
  }
  if (q.from || q.to) {
    where.docDate = {}
    if (q.from) where.docDate.gte = q.from
    if (q.to) where.docDate.lte = q.to
  }

  const ledger = await db.stockLedger.findMany({
    where,
    select: {
      itemType: true, itemId: true, inBags: true, inKgs: true, inMtrs: true, inPcs: true,
      outBags: true, outKgs: true, outMtrs: true, outPcs: true,
    },
    take: 5000, // aggregation source — page cap applies to grouped rows below
  })

  const groups = new Map<string, {
    itemType: string; itemId: string; txns: number
    inBags: number; outBags: number; inKgs: number; outKgs: number
    inMtrs: number; outMtrs: number; inPcs: number; outPcs: number
  }>()
  for (const l of ledger) {
    const key = `${l.itemType}:${l.itemId}`
    const g = groups.get(key) ?? {
      itemType: l.itemType, itemId: l.itemId, txns: 0,
      inBags: 0, outBags: 0, inKgs: 0, outKgs: 0, inMtrs: 0, outMtrs: 0, inPcs: 0, outPcs: 0,
    }
    g.txns += 1
    g.inBags += l.inBags; g.outBags += l.outBags
    g.inKgs += l.inKgs; g.outKgs += l.outKgs
    g.inMtrs += l.inMtrs; g.outMtrs += l.outMtrs
    g.inPcs += l.inPcs; g.outPcs += l.outPcs
    groups.set(key, g)
  }

  // item codes per itemType (id-maps; pcs → styleNo)
  const byType: Record<string, Set<string>> = {}
  for (const g of groups.values()) (byType[g.itemType] ??= new Set()).add(g.itemId)
  const codeMaps = await buildItemCodeMaps(byType)

  const movement = (g: { inBags: number; outBags: number; inKgs: number; outKgs: number; inMtrs: number; outMtrs: number; inPcs: number; outPcs: number }) =>
    g.inBags + g.outBags + g.inKgs + g.outKgs + g.inMtrs + g.outMtrs + g.inPcs + g.outPcs

  let all: RegisterRow[] = [...groups.values()]
    .sort((a, b) => movement(b) - movement(a))
    .map((g) => ({
      id: g.itemId,
      href: null,
      itemType: g.itemType,
      itemCode: codeMaps[g.itemType]?.get(g.itemId) ?? g.itemId,
      txns: g.txns,
      inBags: g.inBags, outBags: g.outBags,
      inKgs: g.inKgs, outKgs: g.outKgs,
      inMtrs: g.inMtrs, outMtrs: g.outMtrs,
      inPcs: g.inPcs, outPcs: g.outPcs,
    }))
  if (q.q) {
    const needle = q.q.toLowerCase()
    all = all.filter((r) => String(r.itemCode ?? '').toLowerCase().includes(needle))
  }

  const count = all.length
  const start = (q.page - 1) * q.limit
  const rows = all.slice(start, start + q.limit)

  const inKgs = all.reduce((s, r) => s + Number(r.inKgs ?? 0), 0)
  const outKgs = all.reduce((s, r) => s + Number(r.outKgs ?? 0), 0)
  return {
    rows,
    totals: [
      { label: 'Items', value: count },
      { label: 'In kgs', value: Math.round(inKgs * 100) / 100 },
      { label: 'Out kgs', value: Math.round(outKgs * 100) / 100 },
    ],
    summary: `${count} items moved · in ${inKgs.toLocaleString('en-IN')} kgs · out ${outKgs.toLocaleString('en-IN')} kgs`,
    count,
  }
}
