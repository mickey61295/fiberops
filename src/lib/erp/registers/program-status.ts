/**
 * Program Status register service — SPEC-M6 §7-C-2 (legacy ST_ProgBalance_*
 * family). The get_program_status tool body extracted VERBATIM into a table
 * service (the tool now delegates here; its json shape is frozen — asserted
 * in tests). Rows: one per program — required vs actual (ledger-derived) vs
 * balance, "the operator's compass".
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export interface ProgramStatusRow {
  programNo: string
  stage: string
  dept: string | null
  item: string | null
  requiredKgs: number
  actualKgs: number
  balanceKgs: number
  status: string
  targetDate: Date | null
}

/** The verbatim per-order aggregation (tool json shape — frozen). */
export async function programStatusForOrder(orderNo: string): Promise<{ orderNo: string; programs: ProgramStatusRow[] } | null> {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { programs: { include: { yarn: true, fabric: true, department: true } } },
  })
  if (!order) return null

  const ledger = await db.stockLedger.findMany({ where: { orderId: order.id } })
  const agg = new Map<string, { inKgs: number; outKgs: number; inMtrs: number; outMtrs: number; inPcs: number; outPcs: number }>()
  for (const r of ledger) {
    const key = `${r.itemType}:${r.itemId}`
    const a = agg.get(key) || { inKgs: 0, outKgs: 0, inMtrs: 0, outMtrs: 0, inPcs: 0, outPcs: 0 }
    a.inKgs += r.inKgs; a.outKgs += r.outKgs
    a.inMtrs += r.inMtrs; a.outMtrs += r.outMtrs
    a.inPcs += r.inPcs; a.outPcs += r.outPcs
    agg.set(key, a)
  }

  const programs: ProgramStatusRow[] = order.programs.map((p: any) => {
    const isYarn = !!p.yarnId
    const key = isYarn ? `yarn:${p.yarnId}` : `fabric:${p.fabricId}`
    const a = agg.get(key) || { inKgs: 0, outKgs: 0, inMtrs: 0, outMtrs: 0, inPcs: 0, outPcs: 0 }
    // Knitting program (yarn): actual = yarn consumed (out). Dyeing program (fabric): actual = fabric received in (in).
    const required = p.requiredKgs
    const actual = isYarn ? a.outKgs : a.inKgs
    return {
      programNo: p.programNo,
      stage: p.stage,
      dept: p.department?.code ?? null,
      item: isYarn ? p.yarn?.code : p.fabric?.code,
      requiredKgs: required,
      actualKgs: Math.round(actual * 100) / 100,
      balanceKgs: Math.round((required - actual) * 100) / 100,
      status: p.status,
      targetDate: p.targetDate ?? null,
    }
  })
  return { orderNo: order.orderNo, programs }
}

export async function queryProgramStatus(q: RegisterQuery): Promise<RegisterResult> {
  const orderWhere: any = {}
  if (q.order) orderWhere.orderNo = { contains: q.order }
  if (q.status) orderWhere.status = q.status
  const orders = await db.order.findMany({
    where: orderWhere,
    include: { programs: { include: { yarn: true, fabric: true, department: true } }, buyer: true },
    orderBy: { orderDate: 'desc' },
    take: 200,
  })

  // one ledger pass across the fetched orders
  const ledger = await db.stockLedger.findMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
  const agg = new Map<string, { inKgs: number; outKgs: number }>()
  for (const r of ledger) {
    const key = `${r.itemType}:${r.itemId}`
    const a = agg.get(key) || { inKgs: 0, outKgs: 0 }
    a.inKgs += r.inKgs; a.outKgs += r.outKgs
    agg.set(key, a)
  }

  const rows: RegisterRow[] = []
  for (const order of orders) {
    for (const p of order.programs as any[]) {
      const isYarn = !!p.yarnId
      const key = isYarn ? `yarn:${p.yarnId}` : `fabric:${p.fabricId}`
      const a = agg.get(key) || { inKgs: 0, outKgs: 0 }
      const required = p.requiredKgs
      const actual = isYarn ? a.outKgs : a.inKgs
      rows.push({
        id: p.id,
        href: `/orders/${order.id}`,
        programNo: p.programNo,
        orderNo: order.orderNo,
        buyer: order.buyer?.name ?? '—',
        stage: p.stage,
        dept: p.department?.code ?? '—',
        item: isYarn ? p.yarn?.code : p.fabric?.code,
        requiredKgs: required,
        actualKgs: Math.round(actual * 100) / 100,
        balanceKgs: Math.round((required - actual) * 100) / 100,
        status: p.status,
        targetDate: p.targetDate ?? null,
      })
    }
  }
  const count = rows.length
  const paged = rows.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: 'requiredKgs' | 'actualKgs' | 'balanceKgs') => Math.round(rows.reduce((s, r) => s + (r[k] as number), 0))
  return {
    rows: paged,
    totals: [
      { label: 'Programs', value: count },
      { label: 'Required Kgs', value: sum('requiredKgs') },
      { label: 'Actual Kgs', value: sum('actualKgs') },
      { label: 'Balance Kgs', value: sum('balanceKgs') },
    ],
    summary: `${count} programs across ${orders.length} orders · balance ${sum('balanceKgs').toLocaleString('en-IN')} kgs to produce`,
    count,
  }
}
