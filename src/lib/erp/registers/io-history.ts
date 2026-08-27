/**
 * IO History register service — SPEC-M4 §5 row 8 (FrmIoHistoryReg family).
 * Chronological StockLedger rows for an item or party with a RUNNING BALANCE
 * column per uom (in − out cumulative, gotcha §14: never across uom columns).
 * q matches item code (any type) OR party name/code. Doc drill-down via the
 * shared TXN_DOC_FAMILY map (W2).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { TXN_DOC_FAMILY, resolveDocRef, buildItemCodeMaps } from './resolve'

export async function queryIoHistory(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.itemType) where.itemType = q.itemType
  if (q.from || q.to) {
    where.docDate = {}
    if (q.from) where.docDate.gte = q.from
    if (q.to) where.docDate.lte = q.to
  }
  if (q.q) {
    // pcs items live in the style master (PITFALLS #21 note — no `pcs` model)
    const modelFor = (t: string) => (t === 'pcs' ? 'style' : t)
    const [parties, itemIds] = await Promise.all([
      db.party.findMany({ where: { OR: [{ code: { contains: q.q } }, { name: { contains: q.q } }] }, select: { id: true } }),
      q.itemType
        ? (db as any)[modelFor(q.itemType)].findMany({
            where: { [q.itemType === 'pcs' ? 'styleNo' : 'code']: { contains: q.q } },
            select: { id: true },
          })
        : Promise.all(
            (
              [
                ['yarn', 'code'],
                ['fabric', 'code'],
                ['accessory', 'code'],
                ['style', 'styleNo'],
              ] as const
            ).map(async ([t, field]) => {
              const items = await (db as any)[t].findMany({ where: { [field]: { contains: q.q } }, select: { id: true } })
              return items.map((i: { id: string }) => i.id)
            }),
          ).then((xs) => xs.flat()),
    ])
    const partyIds = parties.map((p) => p.id)
    const ids: string[] = itemIds
    where.OR = [
      ...(partyIds.length ? [{ partyId: { in: partyIds } }] : []),
      ...(ids.length ? [{ itemId: { in: ids } }] : []),
    ]
    if (where.OR.length === 0) return { rows: [], summary: `No item/party matches "${q.q}"`, count: 0 }
  }

  const [ledger, count] = await Promise.all([
    db.stockLedger.findMany({
      where,
      orderBy: [{ docDate: 'asc' }, { createdAt: 'asc' }],
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { godown: true, party: true },
    }),
    db.stockLedger.count({ where }),
  ])

  // item code id-maps (PITFALLS #21; pcs → style master, shared helper)
  const byType: Record<string, Set<string>> = {}
  for (const l of ledger) (byType[l.itemType] ??= new Set()).add(l.itemId)
  const codeMaps = await buildItemCodeMaps(byType)

  // W2 drill-down (batched per family, same as stock-ledger)
  const families = new Set(ledger.map((l) => TXN_DOC_FAMILY[l.txnType]).filter(Boolean) as string[])
  const hrefByFamilyRef = new Map<string, string | null>()
  for (const family of families) {
    const refs = [...new Set(ledger.filter((l) => TXN_DOC_FAMILY[l.txnType] === family).map((l) => l.docNo).filter(Boolean) as string[])]
    const hrefs = await Promise.all(refs.map((r) => resolveDocRef(family as any, r)))
    refs.forEach((r, i) => hrefByFamilyRef.set(`${family}:${r}`, hrefs[i]))
  }

  // running balance per uom (page-scope cumulative)
  let balKgs = 0, balMtrs = 0, balPcs = 0
  const rows: RegisterRow[] = ledger.map((l) => {
    balKgs += l.inKgs - l.outKgs
    balMtrs += l.inMtrs - l.outMtrs
    balPcs += l.inPcs - l.outPcs
    const family = TXN_DOC_FAMILY[l.txnType]
    const href = family && l.docNo ? hrefByFamilyRef.get(`${family}:${l.docNo}`) ?? null : null
    return {
      id: l.id,
      href,
      docDate: l.docDate,
      txnType: l.txnType,
      docNo: l.docNo ?? '—',
      itemCode: codeMaps[l.itemType]?.get(l.itemId) ?? l.itemId,
      godown: l.godown?.code ?? '—',
      party: l.party?.name ?? null,
      inKgs: l.inKgs, outKgs: l.outKgs, balKgs,
      inMtrs: l.inMtrs, outMtrs: l.outMtrs, balMtrs,
      inPcs: l.inPcs, outPcs: l.outPcs, balPcs,
    }
  })

  return {
    rows,
    totals: [
      { label: 'Rows', value: count },
      { label: 'Bal kgs', value: Math.round(balKgs * 100) / 100 },
      { label: 'Bal mtrs', value: Math.round(balMtrs * 100) / 100 },
      { label: 'Bal pcs', value: balPcs },
    ].filter((x) => x.label === 'Rows' || (x.value as number) !== 0),
    summary: `${count} movements (chronological) · running balance per uom${q.q ? ` · "${q.q}"` : ''}`,
    count,
  }
}
