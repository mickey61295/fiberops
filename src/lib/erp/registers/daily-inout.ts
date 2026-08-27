/**
 * Daily In/Out register service — SPEC-M4 §5 row 1 (legacy frmDailyinout).
 * Day-book of every stock movement: one row per StockLedger entry (day ×
 * godown × doc), footer totals per uom column. Acceptance #5: totals must
 * equal the StockLedger sums for the filtered day range — they are computed
 * FROM the ledger, so they cannot lie.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { TXN_DOC_FAMILY, resolveDocRef } from './resolve'

export async function queryDailyInOut(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.godown) {
    const g = await db.godown.findUnique({ where: { code: q.godown } })
    if (g) where.godownId = g.id
    else return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }
  }
  if (q.itemType) where.itemType = q.itemType
  if (q.from || q.to) {
    where.docDate = {}
    if (q.from) where.docDate.gte = q.from
    if (q.to) where.docDate.lte = q.to
  }

  const [ledger, count] = await Promise.all([
    db.stockLedger.findMany({
      where,
      orderBy: [{ docDate: 'desc' }, { createdAt: 'desc' }],
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { godown: true, party: true },
    }),
    db.stockLedger.count({ where }),
  ])

  const byType: Record<string, Set<string>> = {}
  for (const l of ledger) (byType[l.itemType] ??= new Set()).add(l.itemId)
  const codeMaps: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    const model = (db as any)[t]
    if (model && ids.size) {
      const items = await model.findMany({ where: { id: { in: [...ids] } }, select: { id: true, code: true } })
      codeMaps[t] = new Map(items.map((i: { id: string; code: string }) => [i.id, i.code]))
    }
  }

  const families = new Set(ledger.map((l) => TXN_DOC_FAMILY[l.txnType]).filter(Boolean) as string[])
  const hrefByFamilyRef = new Map<string, string | null>()
  for (const family of families) {
    const refs = [...new Set(ledger.filter((l) => TXN_DOC_FAMILY[l.txnType] === family).map((l) => l.docNo).filter(Boolean) as string[])]
    const hrefs = await Promise.all(refs.map((r) => resolveDocRef(family as any, r)))
    refs.forEach((r, i) => hrefByFamilyRef.set(`${family}:${r}`, hrefs[i]))
  }

  const rows: RegisterRow[] = ledger.map((l) => {
    const family = TXN_DOC_FAMILY[l.txnType]
    const href = family && l.docNo ? hrefByFamilyRef.get(`${family}:${l.docNo}`) ?? null : null
    return {
      id: l.id,
      href,
      docDate: l.docDate,
      godown: l.godown?.code ?? '—',
      txnType: l.txnType,
      docNo: l.docNo ?? '—',
      itemCode: codeMaps[l.itemType]?.get(l.itemId) ?? l.itemId,
      party: l.party?.name ?? null,
      inKgs: l.inKgs,
      outKgs: l.outKgs,
      inMtrs: l.inMtrs,
      outMtrs: l.outMtrs,
      inPcs: l.inPcs,
      outPcs: l.outPcs,
    }
  })

  const days = new Set(rows.map((r) => new Date(r.docDate as Date).toDateString())).size
  const t = (f: (l: (typeof ledger)[number]) => number) => ledger.reduce((s, l) => s + f(l), 0)
  const totals = [
    { label: 'Movements', value: count },
    { label: 'Days (page)', value: days },
    { label: 'In kgs', value: t((l) => l.inKgs) },
    { label: 'Out kgs', value: t((l) => l.outKgs) },
    { label: 'In mtrs', value: t((l) => l.inMtrs) },
    { label: 'Out mtrs', value: t((l) => l.outMtrs) },
    { label: 'In pcs', value: t((l) => l.inPcs) },
    { label: 'Out pcs', value: t((l) => l.outPcs) },
  ].filter((x) => typeof x.value === 'number' ? x.value !== 0 || x.label === 'Movements' || x.label === 'Days (page)' : true)

  return {
    rows,
    totals,
    summary: `${count} movements across ${days} day${days === 1 ? '' : 's'} (showing ${rows.length})`,
    count,
  }
}
