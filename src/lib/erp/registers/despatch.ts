/**
 * Despatch Register service — SPEC-M41 PRC-05 (the despatch day-book).
 * One row per PcsDespatch (DC- and LAD- families together — LADs show their
 * loading status honestly); age column = days since despatchDate (aging stops
 * at delivered — deliveredAt is the anchor then); the gatePass column joins
 * GateEntry rows (gateType out, refDocNo = dcNo — PRC-07's recon surface).
 * `list_despatches` (agent tool) delegates here.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryDespatchRegister(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.status) where.status = q.status
  if (q.from || q.to) {
    where.despatchDate = {}
    if (q.from) where.despatchDate.gte = q.from
    if (q.to) where.despatchDate.lte = q.to
  }
  if (q.q) {
    // PITFALLS #21 — orderId/buyerId are plain FK cols: search resolves ids
    // first (order no / buyer name), then ORs them with the plain columns.
    const [orders, buyers] = await Promise.all([
      db.order.findMany({ where: { orderNo: { contains: q.q } }, select: { id: true }, take: 50 }),
      db.buyer.findMany({ where: { name: { contains: q.q } }, select: { id: true }, take: 50 }),
    ])
    where.OR = [
      { dcNo: { contains: q.q } },
      { vehicleNo: { contains: q.q } },
      { courierName: { contains: q.q } },
      ...(orders.length ? [{ orderId: { in: orders.map((o) => o.id) } }] : []),
      ...(buyers.length ? [{ buyerId: { in: buyers.map((b) => b.id) } }] : []),
    ]
  }

  const [dcs, count] = await Promise.all([
    db.pcsDespatch.findMany({
      where,
      orderBy: { despatchDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.pcsDespatch.count({ where }),
  ])

  // PITFALLS #21 — PcsDespatch.orderId/buyerId are PLAIN FK cols (no
  // relations): resolve order numbers + buyer names via id-maps.
  const orderIds = [...new Set(dcs.map((d) => d.orderId).filter(Boolean) as string[])]
  const buyerIds = [...new Set(dcs.map((d) => d.buyerId).filter(Boolean) as string[])]
  const [orders, buyers] = await Promise.all([
    orderIds.length ? db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : Promise.resolve([] as Array<{ id: string; orderNo: string }>),
    buyerIds.length ? db.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : Promise.resolve([] as Array<{ id: string; name: string }>),
  ])
  const orderNoById = new Map(orders.map((o) => [o.id, o.orderNo]))
  const buyerById = new Map(buyers.map((b) => [b.id, b.name]))

  // PRC-07 — the gate-pass join: OUT-side gate rows referencing these DCs.
  const dcNos = dcs.map((d) => d.dcNo)
  const gateRows = dcNos.length
    ? await db.gateEntry.findMany({
        where: { gateType: 'out', refDocNo: { in: dcNos } },
        select: { refDocNo: true, entryNo: true, status: true },
      })
    : []
  const gateByDc = new Map<string, { entryNo: string; status: string }[]>()
  for (const g of gateRows) {
    const list = gateByDc.get(g.refDocNo!) ?? []
    list.push({ entryNo: g.entryNo, status: g.status })
    gateByDc.set(g.refDocNo!, list)
  }

  const now = Date.now()
  const rows: RegisterRow[] = dcs.map((d) => {
    const anchor = d.deliveredAt ?? d.despatchDate
    const ageDays = Math.max(0, Math.floor((now - anchor.getTime()) / 86400000))
    const gates = gateByDc.get(d.dcNo)
    return {
      id: d.id,
      href: `/pieces/despatch/${d.id}`,
      dcNo: d.dcNo,
      orderNo: d.orderId ? orderNoById.get(d.orderId) ?? '—' : '—',
      buyer: d.buyerId ? buyerById.get(d.buyerId) ?? '—' : '—',
      totalPcs: d.totalPcs,
      despatchDate: d.despatchDate,
      vehicleNo: d.vehicleNo ?? d.courierName ?? '—',
      status: d.status,
      ageDays,
      gatePass: gates ? gates.map((g) => g.entryNo).join(', ') : null,
    }
  })

  const totalPcs = dcs.reduce((s, d) => s + d.totalPcs, 0)
  const undelivered = dcs.filter((d) => d.status !== 'delivered').length
  const withoutGate = rows.filter((r) => !r.gatePass).length

  return {
    rows,
    totals: [
      { label: 'DCs', value: count },
      { label: 'Pcs (page)', value: totalPcs },
      { label: 'Not delivered (page)', value: undelivered },
      { label: 'Without gate pass (page)', value: withoutGate },
    ],
    summary: `${count} despatch docs${q.status ? ` · status ${q.status}` : ''}${q.q ? ` · matching "${q.q}"` : ''}`,
    count,
  }
}
