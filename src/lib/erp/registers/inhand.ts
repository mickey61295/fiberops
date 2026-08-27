/**
 * In-Hand Orders register service — SPEC-M4 §5 row 3 (legacy ST_Ord_inHand).
 * Per order — totalPcs (ordered) − Σ PcsDespatch.totalPcs (despatched, orderId
 * id-map — PITFALLS #21 plain FK) = pending; invoiced = Σ SalesInvoice.totalQty.
 * Open/in_progress orders only (status filter narrows to one status).
 * Every row drills into the Order Hub (W2).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryInhandOrders(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {
    status: q.status ? q.status : { in: ['open', 'in_progress'] },
  }
  if (q.q) {
    where.OR = [
      { orderNo: { contains: q.q } },
      { buyer: { name: { contains: q.q } } },
      { style: { styleNo: { contains: q.q } } },
    ]
  }

  const [orders, count] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { deliveryDate: 'asc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { buyer: true, style: true },
    }),
    db.order.count({ where }),
  ])

  // despatched + invoiced via id-maps (plain FKs — PITFALLS #21)
  const orderIds = orders.map((o) => o.id)
  const [despatches, invoices] = orderIds.length
    ? await Promise.all([
        db.pcsDespatch.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, totalPcs: true } }),
        db.salesInvoice.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, totalQty: true } }),
      ])
    : [[], []]
  const despatchedByOrder = new Map<string, number>()
  for (const d of despatches) despatchedByOrder.set(d.orderId!, (despatchedByOrder.get(d.orderId!) ?? 0) + d.totalPcs)
  const invoicedByOrder = new Map<string, number>()
  for (const i of invoices) invoicedByOrder.set(i.orderId!, (invoicedByOrder.get(i.orderId!) ?? 0) + i.totalQty)

  const rows: RegisterRow[] = orders.map((o) => {
    const despatchedPcs = despatchedByOrder.get(o.id) ?? 0
    return {
      id: o.id,
      href: `/orders/${o.id}`,
      orderNo: o.orderNo,
      buyer: o.buyer?.name ?? '—',
      style: o.style?.styleNo ?? '—',
      orderDate: o.orderDate,
      deliveryDate: o.deliveryDate,
      totalPcs: o.totalPcs,
      despatchedPcs,
      pendingPcs: Math.max(0, o.totalPcs - despatchedPcs),
      invoicedQty: invoicedByOrder.get(o.id) ?? 0,
      status: o.status,
    }
  })

  const pendingPcs = rows.reduce((s, r) => s + (r.pendingPcs as number), 0)
  const totalPcs = rows.reduce((s, r) => s + (r.totalPcs as number), 0)
  const despatched = rows.reduce((s, r) => s + (r.despatchedPcs as number), 0)

  return {
    rows,
    totals: [
      { label: 'Orders', value: count },
      { label: 'Ordered pcs', value: totalPcs },
      { label: 'Despatched', value: despatched },
      { label: 'Pending pcs', value: pendingPcs },
    ],
    summary: `${count} orders in hand · ${pendingPcs.toLocaleString('en-IN')} pcs pending${q.status ? ` · status ${q.status}` : ''}`,
    count,
  }
}
