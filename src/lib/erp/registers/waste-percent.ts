/**
 * Waste-% register service — SPEC-M42 INV-05 (the knitting KPI, legacy had no
 * screen for it). Per item for the period:
 *   waste %  =  Σ WST- kgs  ÷  Σ process_receipt kgs  × 100
 * The numerator groups the WST- docNo family (the waste ledger identity); the
 * denominator groups process_receipt rows — what the chain books as production
 * INTO stock (in-house process GRNs + jobwork returns both land it); the
 * column is labeled 'receipts kgs' honestly. Rows list only items WITH waste
 * in the period (items with zero waste are not the KPI's signal); a
 * zero-receipt item with waste shows % = '—' (never a divide-by-zero).
 * Direct read (ADR-001): pure groupBy aggregates — INV-03's no-cap rule.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { buildItemCodeMaps } from './resolve'

export async function queryWastePercent(q: RegisterQuery): Promise<RegisterResult> {
  const base: any = {}
  if (q.itemType) base.itemType = q.itemType
  if (q.from || q.to) {
    base.docDate = {}
    if (q.from) base.docDate.gte = q.from
    if (q.to) base.docDate.lte = q.to
  }

  const [wasteRows, receiptRows] = await Promise.all([
    db.stockLedger.groupBy({
      by: ['itemType', 'itemId'],
      where: { ...base, docNo: { startsWith: 'WST-' } },
      _sum: { inKgs: true, inPcs: true },
    }),
    db.stockLedger.groupBy({
      by: ['itemType', 'itemId'],
      where: { ...base, txnType: 'process_receipt' },
      _sum: { inKgs: true, inPcs: true },
    }),
  ])

  const receiptsBy = new Map(receiptRows.map((r) => [`${r.itemType}:${r.itemId}`, r._sum]))

  const byType: Record<string, Set<string>> = {}
  for (const w of wasteRows) (byType[w.itemType] ??= new Set()).add(w.itemId)
  const codeMaps = await buildItemCodeMaps(byType)

  let all: RegisterRow[] = wasteRows.map((w) => {
    const sums = receiptsBy.get(`${w.itemType}:${w.itemId}`)
    const wasteKgs = w._sum.inKgs ?? 0
    const receiptsKgs = sums?.inKgs ?? 0
    const wastePct = receiptsKgs > 0 ? (wasteKgs / receiptsKgs) * 100 : null
    return {
      id: `${w.itemType}:${w.itemId}`,
      href: null,
      itemType: w.itemType,
      itemCode: codeMaps[w.itemType]?.get(w.itemId) ?? w.itemId,
      wasteKgs: Math.round(wasteKgs * 100) / 100,
      wastePcs: w._sum.inPcs ?? 0,
      receiptsKgs: Math.round(receiptsKgs * 100) / 100,
      wastePct: wastePct == null ? '—' : Math.round(wastePct * 10) / 10,
    }
  })
  all.sort((a, b) => (b.wasteKgs as number) - (a.wasteKgs as number))

  if (q.q) {
    const needle = q.q.toLowerCase()
    all = all.filter((r) => String(r.itemCode ?? '').toLowerCase().includes(needle))
  }

  const count = all.length
  const sumWaste = all.reduce((s, r) => s + (r.wasteKgs as number), 0)
  const sumReceipts = all.reduce((s, r) => s + (r.receiptsKgs as number), 0)
  const start = (q.page - 1) * q.limit
  const rows = all.slice(start, start + q.limit)
  const overall = sumReceipts > 0 ? Math.round((sumWaste / sumReceipts) * 1000) / 10 : '—'

  return {
    rows,
    totals: [
      { label: 'Items', value: count },
      { label: 'Waste kgs', value: Math.round(sumWaste * 100) / 100 },
      { label: 'Receipts kgs', value: Math.round(sumReceipts * 100) / 100 },
      { label: 'Waste %', value: overall },
    ],
    summary: `${count} items with waste · ${sumWaste.toLocaleString('en-IN')} kgs waste ÷ ${sumReceipts.toLocaleString('en-IN')} kgs receipts = ${overall}%`,
    count,
  }
}
