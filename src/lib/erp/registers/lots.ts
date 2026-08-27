/**
 * Lot Tracking register service — SPEC-M4 §5 row 7 (FrmLotRegister family).
 * Lot + Party + CurrentStock rollup (Σ kgs/mtrs/pcs + godown count per lot).
 * `list_lots` (agent tool) delegates here — json shape frozen ({ lotNo, party }
 * rows, additive stock keys).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryLots(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  }
  if (q.q) where.lotNo = { contains: q.q }

  const [lots, count] = await Promise.all([
    db.lot.findMany({
      where,
      include: { party: true },
      orderBy: { lotNo: 'asc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.lot.count({ where }),
  ])

  // CurrentStock rollup per lot (PITFALLS #21 — lotId is a plain column)
  const lotIds = lots.map((l) => l.id)
  const stocks = lotIds.length
    ? await db.currentStock.findMany({ where: { lotId: { in: lotIds } }, include: { godown: true } })
    : []
  const rollup = new Map<string, { kgs: number; mtrs: number; pcs: number; godowns: Set<string> }>()
  for (const s of stocks) {
    const acc = rollup.get(s.lotId!) ?? { kgs: 0, mtrs: 0, pcs: 0, godowns: new Set<string>() }
    acc.kgs += s.kgs
    acc.mtrs += s.mtrs
    acc.pcs += s.pcs
    if (s.godown?.code) acc.godowns.add(s.godown.code)
    rollup.set(s.lotId!, acc)
  }

  const rows: RegisterRow[] = lots.map((l) => {
    const r = rollup.get(l.id)
    return {
      id: l.id,
      lotNo: l.lotNo,
      party: l.party?.name ?? null,
      kgs: r?.kgs ?? 0,
      mtrs: r?.mtrs ?? 0,
      pcs: r?.pcs ?? 0,
      godowns: r?.godowns.size ?? 0,
    }
  })

  const sum = (k: 'kgs' | 'mtrs' | 'pcs') => rows.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Lots', value: count },
      { label: 'Kgs', value: sum('kgs') },
      { label: 'Mtrs', value: sum('mtrs') },
      { label: 'Pcs', value: sum('pcs') },
    ].filter((x) => x.label === 'Lots' || (x.value as number) !== 0),
    summary: `${count} lots · ${rollup.size} with stock (page)`,
    count,
  }
}
