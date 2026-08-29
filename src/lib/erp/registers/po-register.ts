/**
 * PO register service — SPEC-M19 §2 Wave B (legacy FrmSupplierOrderRegister).
 * The supplier PO day-book: one row per PurchaseOrder (any poType — the
 * variant select narrows; poType='general' is the app's "supplier order"
 * family, one option among four, no preset: an all-PO register is home).
 * Rows drill into the PO view (W2).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryPoRegister(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.variant) where.poType = q.variant // variant select = poType (spec §2)
  if (q.from || q.to) {
    where.orderDate = {}
    if (q.from) where.orderDate.gte = q.from
    if (q.to) where.orderDate.lte = q.to
  }
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  } else if (q.q) {
    where.OR = [{ poNo: { contains: q.q } }, { party: { name: { contains: q.q } } }]
  }
  if (q.status) where.status = q.status

  const [pos, count] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { party: true },
    }),
    db.purchaseOrder.count({ where }),
  ])

  const rows: RegisterRow[] = pos.map((po) => ({
    id: po.id,
    href: `/procurement/po/${po.id}`,
    poNo: po.poNo,
    poType: po.poType,
    party: po.party.name,
    orderDate: po.orderDate,
    deliveryDate: po.deliveryDate,
    totalQty: po.totalQty,
    totalValue: po.totalValue,
    status: po.status,
  }))

  const qty = rows.reduce((s, r) => s + (r.totalQty as number), 0)
  const value = rows.reduce((s, r) => s + (r.totalValue as number), 0)
  return {
    rows,
    totals: [
      { label: 'POs', value: count },
      { label: 'Qty', value: qty },
      { label: 'Value', value: Math.round(value) },
    ],
    summary: `${count} POs${q.variant ? ` · type ${q.variant}` : ''} · ₹${Math.round(value).toLocaleString('en-IN')}`,
    count,
  }
}
