/**
 * Production Status register service — SPEC-M4 §5 row 10 (FrmProductionStatusReg
 * family). Per order × department — Σ qty, rework flag split (Σ qty where
 * rework), Σ amount + wages; jobwork column = Σ JobworkOrder.totalQty for
 * the order (plain FK — id-map, PITFALLS #21). Rows drill into the Order Hub.
 *
 * HFX-12 (Phase-6B Batch 0) — the `shiftWages` field reads Σ amount (the
 * piece-rate wage actually posted): the shiftWages column has NO writer
 * (grep-verified), so the column was structurally ₹0. L-06 resolves the
 * column (writer or drop).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryProductionStatus(q: RegisterQuery): Promise<RegisterResult> {
  const entryWhere: any = {}
  if (q.from || q.to) {
    entryWhere.prodDate = {}
    if (q.from) entryWhere.prodDate.gte = q.from
    if (q.to) entryWhere.prodDate.lte = q.to
  }
  if (q.order) {
    const o = await db.order.findUnique({ where: { orderNo: q.order } })
    if (!o) return { rows: [], summary: `Order ${q.order} not found`, count: 0 }
    entryWhere.orderId = o.id
  }
  if (q.q) {
    const depts = await db.department.findMany({
      where: { OR: [{ code: { contains: q.q } }, { name: { contains: q.q } }] },
      select: { id: true },
    })
    if (depts.length === 0) return { rows: [], summary: `No department matches "${q.q}"`, count: 0 }
    entryWhere.deptId = { in: depts.map((d) => d.id) }
  }

  // group by order × dept (SQL groupBy — pagination over groups)
  const [grouped, allKeys] = await Promise.all([
    db.productionEntry.groupBy({
      by: ['orderId', 'deptId'],
      where: entryWhere,
      _sum: { qty: true, amount: true }, // HFX-12 — shiftWages dropped: dead column, no writer
      _count: { _all: true },
      orderBy: [{ orderId: 'asc' }],
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.productionEntry.groupBy({
      by: ['orderId', 'deptId'],
      where: entryWhere,
      _count: { _all: true },
      orderBy: [{ orderId: 'asc' }],
      take: 10000, // group-key guard for the count
    }),
  ])

  // rework split for the page's groups (second groupBy, rework=true only)
  const reworkSums = await db.productionEntry.groupBy({
    by: ['orderId', 'deptId'],
    where: { ...entryWhere, rework: true },
    _sum: { qty: true },
  })
  const reworkMap = new Map(reworkSums.map((r) => [`${r.orderId}:${r.deptId}`, r._sum.qty ?? 0]))

  const orderIds = [...new Set(grouped.map((g) => g.orderId))]
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds } }, include: { buyer: true } })
    : []
  const jobworks = orderIds.length
    ? await db.jobworkOrder.groupBy({ by: ['orderId'], where: { orderId: { in: orderIds } }, _sum: { totalQty: true } })
    : []
  const orderMap = new Map(orders.map((o) => [o.id, o]))
  const jobworkByOrder = new Map(jobworks.map((j) => [j.orderId!, j._sum.totalQty ?? 0]))

  const deptIds = [...new Set(grouped.map((g) => g.deptId))]
  const depts = deptIds.length
    ? await db.department.findMany({ where: { id: { in: deptIds } } })
    : []
  const deptMap = new Map(depts.map((d) => [d.id, d]))

  const rows: RegisterRow[] = grouped.map((g) => {
    const o = orderMap.get(g.orderId)
    return {
      id: `${g.orderId}:${g.deptId}`,
      href: `/orders/${g.orderId}`,
      orderNo: o?.orderNo ?? g.orderId,
      buyer: o?.buyer?.name ?? '—',
      dept: deptMap.get(g.deptId)?.code ?? g.deptId,
      qty: g._sum.qty ?? 0,
      reworkQty: reworkMap.get(`${g.orderId}:${g.deptId}`) ?? 0,
      jobworkQty: jobworkByOrder.get(g.orderId) ?? 0,
      amount: g._sum.amount ?? 0,
      shiftWages: g._sum.amount ?? 0, // HFX-12 — the wage actually posted (field name frozen: tool json)
    }
  })

  const count = allKeys.length
  const sum = (k: 'qty' | 'reworkQty' | 'jobworkQty' | 'amount' | 'shiftWages') =>
    rows.reduce((s, r) => s + (r[k] as number), 0)

  return {
    rows,
    totals: [
      { label: 'Order×dept rows', value: count },
      { label: 'Qty (page)', value: sum('qty') },
      { label: 'Rework (page)', value: sum('reworkQty') },
      { label: 'Amount (page)', value: Math.round(sum('amount')) },
    ],
    summary: `${count} order×department rows${q.order ? ` · order ${q.order}` : ''}${q.q ? ` · dept "${q.q}"` : ''}`,
    count,
  }
}
