/**
 * Closing stock as-of-date service — SPEC-M19 §4 Wave D (audit §3-C1-2, the
 * period-end statement). CUMULATIVE: every StockLedger row with docDate ≤ the
 * as-of date, grouped by (itemType, itemId, godown). Closing = Σin − Σout per
 * uom column SEPARATELY (never across uoms — SPEC-M4 gotcha §14). Valuation =
 * closing qty × the LATEST ledger rate for that (item, godown) — the operator
 * can audit the rate by opening the source ledger row (no hidden rates).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { buildItemCodeMaps } from './resolve'

interface Acc {
  itemType: string; itemId: string; godown: string; godownId: string
  bags: number; kgs: number; mtrs: number; pcs: number
  lastRate: number; lastDate: Date
}

export async function queryClosingStock(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.to) where.docDate = { lte: q.to }
  if (q.itemType) where.itemType = q.itemType
  if (q.godown) {
    const g = await db.godown.findUnique({ where: { code: q.godown } })
    if (!g) return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }
    where.godownId = g.id
  }

  // cumulative scan (take-guard: the ledger is append-only; 5000 rows covers
  // the dev-scale period-end with the same guard as itemwise-stock)
  const rows = await db.stockLedger.findMany({
    where: where as any,
    orderBy: { docDate: 'desc' },
    take: 5000,
    select: {
      itemType: true, itemId: true, godownId: true, docDate: true, rate: true,
      inBags: true, outBags: true, inKgs: true, outKgs: true,
      inMtrs: true, outMtrs: true, inPcs: true, outPcs: true,
    },
  })
  const ledger = rows.filter((r): r is typeof r & { godownId: string } => r.godownId !== null)

  const godowns = await db.godown.findMany({ select: { id: true, code: true } })
  const godownById = new Map(godowns.map((g) => [g.id, g.code]))
  if (q.godown) {
    const g = await db.godown.findUnique({ where: { code: q.godown } })
    if (g) godownById.set(g.id, g.code)
  }

  const byKey = new Map<string, Acc>()
  for (const r of ledger) {
    const key = `${r.itemType}|${r.itemId}|${r.godownId}`
    const existing = byKey.get(key)
    const acc: Acc = existing ?? {
      itemType: r.itemType, itemId: r.itemId, godown: godownById.get(r.godownId) ?? '—', godownId: r.godownId, bags: 0, kgs: 0, mtrs: 0, pcs: 0, lastRate: 0, lastDate: r.docDate,
    }
    byKey.set(key, acc)
    acc.bags += (r.inBags ?? 0) - (r.outBags ?? 0)
    acc.kgs += (r.inKgs ?? 0) - (r.outKgs ?? 0)
    acc.mtrs += (r.inMtrs ?? 0) - (r.outMtrs ?? 0)
    acc.pcs += (r.inPcs ?? 0) - (r.outPcs ?? 0)
    // rows are date-desc: the FIRST row seen for a key is the latest → keep its rate
    if (acc.lastRate === 0 && r.rate) acc.lastRate = r.rate
  }

  // item codes via the shared id-maps (PITFALLS #21; pcs → styleNo)
  const byType: Record<string, Set<string>> = {}
  for (const a of byKey.values()) {
    ;(byType[a.itemType] ??= new Set()).add(a.itemId)
  }
  const codeMaps = await buildItemCodeMaps(byType)

  let all = [...byKey.values()].map((a) => {
    const code = codeMaps[a.itemType]?.get(a.itemId) ?? a.itemId
    // valuation: only the uoms with a non-zero closing balance carry value
    const value =
      Math.max(0, a.bags) * (a.bags ? a.lastRate : 0) +
      Math.max(0, a.kgs) * (a.kgs ? a.lastRate : 0) +
      Math.max(0, a.mtrs) * (a.mtrs ? a.lastRate : 0) +
      Math.max(0, a.pcs) * (a.pcs ? a.lastRate : 0)
    return {
      id: `${a.itemType}|${a.itemId}|${a.godownId}`,
      href: null, // period-end statement row — the source is the ledger, not a doc view
      itemType: a.itemType,
      itemCode: code,
      godown: a.godown,
      bags: Math.max(0, a.bags),
      kgs: Math.max(0, a.kgs),
      mtrs: Math.max(0, a.mtrs),
      pcs: Math.max(0, a.pcs),
      rate: a.lastRate,
      value,
    }
  })

  // q searches by item code post-group (pcs-stock precedent)
  if (q.q) all = all.filter((r) => r.itemCode.toLowerCase().includes(q.q!.toLowerCase()))

  const count = all.length
  const sum = (k: 'bags' | 'kgs' | 'mtrs' | 'pcs' | 'value') => all.reduce((s, r) => s + r[k], 0)
  const asOf = q.to ? ` as of ${q.to.toISOString().slice(0, 10)}` : ' as of now'
  const pageRows: RegisterRow[] = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)

  return {
    rows: pageRows,
    totals: [
      { label: 'Items', value: count },
      { label: 'Kgs', value: Math.round(sum('kgs') * 100) / 100 },
      { label: 'Mtrs', value: Math.round(sum('mtrs') * 100) / 100 },
      { label: 'Pcs', value: sum('pcs') },
      { label: 'Value', value: Math.round(sum('value')) },
    ],
    summary: `${count} item-godown rows${asOf} · ₹${Math.round(sum('value')).toLocaleString('en-IN')}`,
    count,
  }
}
