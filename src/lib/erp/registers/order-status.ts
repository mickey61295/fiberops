/**
 * Order Status service — SPEC-M4 §5 row 17 / §10. NOT in REGISTER_SERVICES
 * (the board is a DB archetype, not a RegisterScreen — Wave C renders it).
 * Every open/in_progress order with chain flags (computeChainState +
 * CHAIN_ORDER_INCLUDE — the Order Hub pattern), done-count n/15, next stage.
 * `get_order_status` (agent tool) delegates here. Sort: deliveryDate asc,
 * nulls last (soonest first).
 */
import { db } from '@/lib/db'
import { CHAIN_ORDER_INCLUDE, computeChainState, nextStage } from '@/lib/erp/chain'

export interface OrderStatusRow {
  id: string
  orderNo: string
  buyer: string | null
  deliveryDate: Date | null
  totalPcs: number
  stagesDone: number
  nextStage: string | null
  href: string
}

export interface OrderStatusResult {
  rows: OrderStatusRow[]
  summary: string
  totalOpenOrders: number
  totalOpenPcs: number
  avgStagesDone: number
}

export async function queryOrderStatus(opts?: { orderNo?: string }): Promise<OrderStatusResult> {
  if (opts?.orderNo) {
    const order = await db.order.findUnique({
      where: { orderNo: opts.orderNo },
      include: CHAIN_ORDER_INCLUDE,
    })
    if (!order) {
      return { rows: [], summary: `Order ${opts.orderNo} not found`, totalOpenOrders: 0, totalOpenPcs: 0, avgStagesDone: 0 }
    }
    const flags = computeChainState(order)
    const stagesDone = Object.values(flags).filter(Boolean).length
    const next = nextStage(flags)
    return {
      rows: [{
        id: order.id,
        orderNo: order.orderNo,
        buyer: order.buyer?.name ?? null,
        deliveryDate: order.deliveryDate,
        totalPcs: order.totalPcs,
        stagesDone,
        nextStage: next ? next.name : null,
        href: `/orders/${order.id}`,
      }],
      summary: `${order.orderNo}: ${stagesDone}/${Object.keys(flags).length} stages done${next ? ` · next: ${next.name}` : ' · chain complete'}`,
      totalOpenOrders: 1,
      totalOpenPcs: order.totalPcs,
      avgStagesDone: stagesDone,
    }
  }

  const orders = await db.order.findMany({
    where: { status: { in: ['open', 'in_progress'] } },
    include: CHAIN_ORDER_INCLUDE,
  })

  // deliveryDate asc, nulls last (soonest first)
  orders.sort((a, b) => {
    if (!a.deliveryDate && !b.deliveryDate) return 0
    if (!a.deliveryDate) return 1
    if (!b.deliveryDate) return -1
    return a.deliveryDate.getTime() - b.deliveryDate.getTime()
  })

  const rows: OrderStatusRow[] = orders.map((o) => {
    const flags = computeChainState(o)
    const stagesDone = Object.values(flags).filter(Boolean).length
    const next = nextStage(flags)
    return {
      id: o.id,
      orderNo: o.orderNo,
      buyer: o.buyer?.name ?? null,
      deliveryDate: o.deliveryDate,
      totalPcs: o.totalPcs,
      stagesDone,
      nextStage: next ? next.name : null,
      href: `/orders/${o.id}`,
    }
  })

  const totalOpenPcs = rows.reduce((s, r) => s + r.totalPcs, 0)
  const avgStagesDone = rows.length ? Math.round((rows.reduce((s, r) => s + r.stagesDone, 0) / rows.length) * 10) / 10 : 0

  return {
    rows,
    summary: `${rows.length} open orders · ${totalOpenPcs.toLocaleString('en-IN')} pcs · avg ${avgStagesDone} stages done`,
    totalOpenOrders: rows.length,
    totalOpenPcs,
    avgStagesDone,
  }
}
