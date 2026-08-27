/**
 * Jobwork register service — SPEC-M4 §5 row 11 (FrmJobOrderList).
 * Per DC — totalQty (sent), status, receivedDate; per-party footer — at-party =
 * Σ sent-status rows. Jobworker + order resolved via id-maps (plain FKs,
 * PITFALLS #21). Rows drill into /jobwork/order/[id] (W2).
 * `list_jobworks` (agent tool) delegates here — json shape frozen.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryJobwork(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.status) where.status = q.status
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.jobworkerId = p.id
  }

  const [jws, count] = await Promise.all([
    db.jobworkOrder.findMany({
      where,
      orderBy: { outDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.jobworkOrder.count({ where }),
  ])

  const partyIds = [...new Set(jws.map((j) => j.jobworkerId))]
  const orderIds = [...new Set(jws.map((j) => j.orderId).filter(Boolean) as string[])]
  const [parties, orders] = await Promise.all([
    partyIds.length ? db.party.findMany({ where: { id: { in: partyIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.party.findMany>>),
    orderIds.length ? db.order.findMany({ where: { id: { in: orderIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.order.findMany>>),
  ])
  const partyMap = new Map(parties.map((p) => [p.id, p]))
  const orderMap = new Map(orders.map((o) => [o.id, o]))

  const rows: RegisterRow[] = jws.map((j) => ({
    id: j.id,
    href: `/jobwork/order/${j.id}`,
    dcNo: j.dcNo,
    jobworker: partyMap.get(j.jobworkerId)?.name ?? '—',
    processType: j.processType,
    orderNo: j.orderId ? orderMap.get(j.orderId)?.orderNo ?? null : null,
    outDate: j.outDate,
    expectedInDate: j.expectedInDate,
    receivedDate: j.receivedDate,
    totalQty: j.totalQty,
    totalValue: j.totalValue,
    status: j.status,
  }))

  // at-party footer: Σ sent-status qty per jobworker (the page's rows)
  const atParty = new Map<string, number>()
  for (const r of rows) {
    if (r.status === 'sent') atParty.set(r.jobworker as string, (atParty.get(r.jobworker as string) ?? 0) + (r.totalQty as number))
  }
  const atPartyTotal = [...atParty.values()].reduce((s, v) => s + v, 0)
  const topParty = [...atParty.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    rows,
    totals: [
      { label: 'DCs', value: count },
      { label: 'Qty (page)', value: Math.round(rows.reduce((s, r) => s + (r.totalQty as number), 0) * 100) / 100 },
      { label: 'At party (page)', value: Math.round(atPartyTotal * 100) / 100 },
      ...(topParty ? [{ label: `Top: ${topParty[0]}`, value: Math.round(topParty[1] * 100) / 100 }] : []),
    ],
    summary: `${count} jobwork DCs${q.status ? ` · status ${q.status}` : ''} · ${atParty.size} parties holding stock`,
    count,
  }
}
