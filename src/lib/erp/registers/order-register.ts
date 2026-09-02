/**
 * Order Register service — SPEC-M4 §5 row 2.
 * Day-book over Order + Buyer + Style. Every row drills into the Order Hub
 * (W2). `list_orders` (agent tool) delegates here — its json shape stays
 * field-compatible (the tool maps its own subset).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryOrderRegister(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.status) where.status = q.status
  // SPEC-M43 PRG-01 — orderType select filter (export | domestic | trading).
  if ((q as any).orderType) where.orderType = (q as any).orderType
  // CHAT-12 (Phase-6B Batch 2) — buyer scope (list_orders buyerId filter;
  // '__none__' = a buyer filter that matched no buyer → no rows, honestly).
  if (q.buyerId) where.buyerId = q.buyerId
  if (q.from || q.to) {
    where.orderDate = {}
    if (q.from) where.orderDate.gte = q.from
    if (q.to) where.orderDate.lte = q.to
  }
  if (q.q) {
    where.OR = [
      { orderNo: { contains: q.q } },
      { buyer: { name: { contains: q.q } } },
      { style: { styleNo: { contains: q.q } } },
      // PRG-01 — buyer PoRef is first-class: search finds it
      { buyerPoRef: { contains: q.q } },
    ]
  }

  const [orders, count] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { buyer: true, style: true },
    }),
    db.order.count({ where }),
  ])

  const rows: RegisterRow[] = orders.map((o) => ({
    id: o.id,
    href: `/orders/${o.id}`,
    orderNo: o.orderNo,
    buyer: o.buyer?.name ?? '—',
    style: o.style?.styleNo ?? '—',
    buyerPoRef: o.buyerPoRef ?? '—',
    orderType: o.orderType ?? 'export',
    orderDate: o.orderDate,
    deliveryDate: o.deliveryDate,
    totalPcs: o.totalPcs,
    totalValue: o.totalValue,
    status: o.status,
  }))

  const totalPcs = orders.reduce((s, o) => s + o.totalPcs, 0)
  const totalValue = orders.reduce((s, o) => s + (o.currency === 'INR' ? o.totalValue : o.totalValue * (o.fxRate || 1)), 0)

  return {
    rows,
    totals: [
      { label: 'Orders', value: count },
      { label: 'Pcs (page)', value: totalPcs },
      { label: 'Value INR (page)', value: Math.round(totalValue) },
    ],
    summary: `${count} orders${q.status ? ` · status ${q.status}` : ''}${q.q ? ` · matching "${q.q}"` : ''}`,
    count,
  }
}
