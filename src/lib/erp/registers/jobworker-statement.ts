/**
 * Jobworker Material Statement — SPEC-M39 §1 JWL-07 (Phase-6B Batch 3).
 * Per jobworker × item, from the StockLedger party rows on the process txn
 * types (process_delivery / process_receipt — every process door's rows carry
 * partyId): kgs out, kgs in, loss %, WIP + aging. The G3 'Jobworker Yard'
 * godown (JWL-08) makes the WIP queryable stock for the JW door; this register
 * covers ALL process doors via the ledger, so WIP visibility never depends on
 * which door issued the DC.
 * `list_jobworker_statement` (agent tool) delegates here — json shape frozen.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

const PROCESS_TXNS = ['process_delivery', 'process_receipt']

export async function queryJobworkerStatement(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { txnType: { in: PROCESS_TXNS }, partyId: { not: null } }
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  }

  // JWL-08: G3 'Jobworker Yard' rows are the INTERNAL WIP mirror of the same
  // movement (parked on out, cleared on return/GAN) — counting them would
  // double every leg and zero the WIP. The statement counts material that
  // left/entered a COMPANY godown (the G1/G2/… legs), which is the truth the
  // working-capital question asks for.
  const g3 = await db.godown.findUnique({ where: { code: 'G3' } })
  if (g3) where.godownId = { not: g3.id }

  // bounded by recency: the statement is a working-capital view, not a
  // day-book (last 10k ledger rows of these txn types).
  const ledger = await db.stockLedger.findMany({ where, orderBy: { docDate: 'desc' }, take: 10_000 })

  type Acc = {
    partyId: string; itemId: string; itemType: string
    outKgs: number; inKgs: number; outPcs: number; inPcs: number
    oldestOut: Date | null
  }
  const acc = new Map<string, Acc>()
  for (const r of ledger) {
    if (!r.partyId) continue
    const key = `${r.partyId}|${r.itemType}|${r.itemId}`
    let a = acc.get(key)
    if (!a) {
      a = { partyId: r.partyId, itemId: r.itemId, itemType: r.itemType, outKgs: 0, inKgs: 0, outPcs: 0, inPcs: 0, oldestOut: null }
      acc.set(key, a)
    }
    a.outKgs += r.outKgs ?? 0
    a.inKgs += r.inKgs ?? 0
    a.outPcs += r.outPcs ?? 0
    a.inPcs += r.inPcs ?? 0
    // WIP aging anchor: the OLDEST outbound row (rows arrive newest-first, so
    // a later row in the loop is older)
    if ((r.outKgs ?? 0) + (r.outPcs ?? 0) > 0) a.oldestOut = r.docDate
  }

  const partyIds = [...new Set([...acc.values()].map((a) => a.partyId))]
  const itemIds = [...new Set([...acc.values()].map((a) => `${a.itemType}|${a.itemId}`))]
  const [parties, yarns, fabrics, accs] = await Promise.all([
    partyIds.length ? db.party.findMany({ where: { id: { in: partyIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.party.findMany>>),
    itemIds.length ? db.yarn.findMany({ where: { id: { in: itemIds.filter((k) => k.startsWith('yarn|')).map((k) => k.slice(5)) } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.yarn.findMany>>),
    itemIds.length ? db.fabric.findMany({ where: { id: { in: itemIds.filter((k) => k.startsWith('fabric|')).map((k) => k.slice(7)) } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.fabric.findMany>>),
    itemIds.length ? db.accessory.findMany({ where: { id: { in: itemIds.filter((k) => k.startsWith('accessory|')).map((k) => k.slice(10)) } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.accessory.findMany>>),
  ])
  const partyMap = new Map(parties.map((p) => [p.id, p]))
  const itemCode = new Map<string, string>()
  for (const y of yarns) itemCode.set(`yarn|${y.id}`, y.code)
  for (const f of fabrics) itemCode.set(`fabric|${f.id}`, f.code)
  for (const a of accs) itemCode.set(`accessory|${a.id}`, a.code)

  const now = Date.now()
  const rows: RegisterRow[] = [...acc.values()].map((a) => {
    const isPcs = a.itemType === 'accessory'
    const out = isPcs ? a.outPcs : a.outKgs
    const inn = isPcs ? a.inPcs : a.inKgs
    const wip = Math.round((out - inn) * 100) / 100
    const lossPct = out > 0 ? Math.round(((out - inn) / out) * 10000) / 100 : 0
    const agingDays = wip > 0 && a.oldestOut ? Math.max(0, Math.floor((now - new Date(a.oldestOut).getTime()) / 86_400_000)) : 0
    return {
      id: `${a.partyId}|${a.itemId}`,
      party: partyMap.get(a.partyId)?.name ?? '—',
      partyCode: partyMap.get(a.partyId)?.code ?? '',
      item: itemCode.get(`${a.itemType}|${a.itemId}`) ?? a.itemId,
      itemType: a.itemType,
      uom: isPcs ? 'pcs' : 'kgs',
      outQty: Math.round(out * 100) / 100,
      inQty: Math.round(inn * 100) / 100,
      wip: Math.round(wip * 100) / 100,
      lossPct,
      agingDays,
    }
  })
  // WIP first (the working-capital question), then by party
  rows.sort((x, y) => (y.wip as number) - (x.wip as number) || String(x.party).localeCompare(String(y.party)))
  const paged = rows.slice((q.page - 1) * q.limit, q.page * q.limit)

  const totalWip = Math.round(rows.reduce((s, r) => s + (r.wip as number), 0) * 100) / 100
  const totalOut = Math.round(rows.reduce((s, r) => s + (r.outQty as number), 0) * 100) / 100
  const totalIn = Math.round(rows.reduce((s, r) => s + (r.inQty as number), 0) * 100) / 100
  const partyCount = new Set(rows.map((r) => r.party)).size

  return {
    rows: paged,
    totals: [
      { label: 'Parties', value: partyCount },
      { label: 'Kgs/pcs out', value: totalOut },
      { label: 'Kgs/pcs in', value: totalIn },
      { label: 'WIP at jobworkers', value: totalWip },
    ],
    summary: `${rows.length} party × item lines${q.party ? ` · party ${q.party}` : ''} · WIP ${totalWip} · ${partyCount} jobworker(s)`,
    count: rows.length,
  }
}
