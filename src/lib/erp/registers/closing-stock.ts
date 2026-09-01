/**
 * Closing stock as-of-date service — SPEC-M19 §4 Wave D (audit §3-C1-2, the
 * period-end statement). CUMULATIVE: every StockLedger row with docDate ≤ the
 * as-of date, grouped by (itemType, itemId, godown). Closing = Σin − Σout per
 * uom column SEPARATELY (never across uoms — SPEC-M4 gotcha §14).
 *
 * SPEC-M42 INV-02/03 — REWRITTEN: the qty comes from a true groupBy aggregate
 * (complete at ANY row count — the old `orderBy docDate desc + take:5000` not
 * only truncated a period statement, it kept the NEWEST rows and silently
 * DROPPED the opening movements of a cumulative balance); the RATE is the
 * moving weighted average replayed from the same ledger rows (batched ordered
 * fetch, never capped) using the IDENTICAL wacStep recurrence bumpStock runs
 * at post time — so as-of-now this statement values every bucket exactly like
 * the current-stock register and the dashboard (the golden test pins the
 * bit-exact agreement; only back-dated documents posted out of ledger order
 * can split the two, and the INV-06 drift card surfaces exactly that).
 * Value = valueBucket (HFX-11's shared per-uom form) on the clamped row —
 * statement semantics: a period-end sheet can't own negative stock.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { buildItemCodeMaps } from './resolve'
import { valueBucket, wacStep, primaryQtyOf } from '../valuation'

/** WAC replay batch size — unbounded loop (a short batch ends it), memory
 * bounded per batch. 5000 keeps each fetch in the SQLite page-cache sweet
 * spot; the M14 perf gate re-runs at 10k rows with this exact loop. */
const REPLAY_BATCH = 5000

interface Acc {
  itemType: string; itemId: string; godown: string; godownId: string
  bags: number; kgs: number; mtrs: number; pcs: number
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

  // (1) qty — a true DB aggregate (INV-03: complete at any row count).
  const grouped = await db.stockLedger.groupBy({
    by: ['itemType', 'itemId', 'godownId'],
    where: where as any,
    _sum: {
      inBags: true, outBags: true, inKgs: true, outKgs: true,
      inMtrs: true, outMtrs: true, inPcs: true, outPcs: true,
    },
  })
  const ledger = grouped.filter((r): r is typeof r & { godownId: string } => r.godownId !== null)

  const godowns = await db.godown.findMany({ select: { id: true, code: true } })
  const godownById = new Map(godowns.map((g) => [g.id, g.code]))

  const byKey = new Map<string, Acc>()
  for (const r of ledger) {
    const s = r._sum
    byKey.set(`${r.itemType}|${r.itemId}|${r.godownId}`, {
      itemType: r.itemType, itemId: r.itemId,
      godown: godownById.get(r.godownId) ?? '—', godownId: r.godownId,
      bags: (s.inBags ?? 0) - (s.outBags ?? 0),
      kgs: (s.inKgs ?? 0) - (s.outKgs ?? 0),
      mtrs: (s.inMtrs ?? 0) - (s.outMtrs ?? 0),
      pcs: (s.inPcs ?? 0) - (s.outPcs ?? 0),
    })
  }

  // (2) rate — WAC replay over ALL the bucket's rows, batched and UNCAPPED
  // (INV-03): identical recurrence to bumpStock, same rows, (docDate, createdAt)
  // order. The replay tracks the NET primary-uom qty (in − out per row — out
  // legs weight the next in exactly like bumpStock's live bucket) and applies
  // wacStep only on priced in-rows. Same-timestamp same-key rows replay in
  // fetch order — WAC is order-independent across pure ins, and the drift
  // card (INV-06) covers the pathological interleave.
  const rateBy = new Map<string, number>()
  const qtyBy = new Map<string, { kgs: number; pcs: number; rate: number }>()
  for (let skip = 0; ; skip += REPLAY_BATCH) {
    const rows = await db.stockLedger.findMany({
      where: where as any,
      orderBy: [{ docDate: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: REPLAY_BATCH,
      select: {
        itemType: true, itemId: true, godownId: true, rate: true,
        inKgs: true, outKgs: true, inPcs: true, outPcs: true,
      },
    })
    for (const r of rows) {
      if (!r.godownId) continue
      const key = `${r.itemType}|${r.itemId}|${r.godownId}`
      // replay state = the bucket's net primary-uom qty + rate — the same
      // state bumpStock maintains live. ORDER MATTERS (the golden test pins
      // it): oldQty is the PRE-row on-hand (bumpStock reads `existing` before
      // incrementing), the movement's weight is the NET primary qty
      // (in − out, exactly bumpStock's delta), then the state advances.
      const st = qtyBy.get(key) ?? { kgs: 0, pcs: 0, rate: 0 }
      const netKgs = r.inKgs - r.outKgs
      const netPcs = r.inPcs - r.outPcs
      const inQty = primaryQtyOf(r.itemType, { kgs: netKgs, pcs: netPcs })
      const oldQty = primaryQtyOf(r.itemType, st)
      st.kgs += netKgs
      st.pcs += netPcs
      st.rate = wacStep(oldQty, st.rate, inQty, r.rate)
      qtyBy.set(key, st)
      rateBy.set(key, st.rate)
    }
    if (rows.length < REPLAY_BATCH) break
  }

  // item codes via the shared id-maps (PITFALLS #21; pcs → styleNo)
  const byType: Record<string, Set<string>> = {}
  for (const a of byKey.values()) {
    ;(byType[a.itemType] ??= new Set()).add(a.itemId)
  }
  const codeMaps = await buildItemCodeMaps(byType)

  let all = [...byKey.values()].map((a) => {
    const code = codeMaps[a.itemType]?.get(a.itemId) ?? a.itemId
    const clamped = {
      kgs: Math.max(0, a.kgs), mtrs: Math.max(0, a.mtrs),
      pcs: Math.max(0, a.pcs),
    }
    const rate = rateBy.get(`${a.itemType}|${a.itemId}|${a.godownId}`) ?? 0
    const value = valueBucket({ ...clamped, rate })
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
      rate,
      value,
    }
  })

  // q searches by item code post-group (pcs-stock precedent)
  if (q.q) all = all.filter((r) => r.itemCode.toLowerCase().includes(q.q!.toLowerCase()))

  const count = all.length
  const sum = (k: 'bags' | 'kgs' | 'mtrs' | 'pcs' | 'value') => all.reduce((s, r) => s + (r[k] as number), 0)
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
