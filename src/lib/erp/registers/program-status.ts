/**
 * Program Status register service — SPEC-M6 §7-C-2 (legacy ST_ProgBalance_*
 * family). The get_program_status tool body extracted VERBATIM into a table
 * service (the tool now delegates here; its json shape is frozen — asserted
 * in tests). Rows: one per program — required vs actual (ledger-derived) vs
 * balance, "the operator's compass".
 *
 * SPEC-M43 PRG-04 — the NINE-COLUMN WATERFALL, read model only (ADR-002: no
 * trigger writes): the register row gains PO'd / DC'd / GRN'd / Finished —
 * poKgs from POLine (order-linked sums), dcKgs from StockLedger
 * process_delivery OUT, grnKgs from process_receipt + purchase_grn IN,
 * finishedKgs from process_receipt IN only (material that came back
 * PRODUCED — bought material is GRN'd, not finished). This read service is
 * the honest successor of the deleted projector trio (SPEC-M43 §2-5).
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

/** PRG-04 — waterfall legs per (orderId, itemId), derived not stored. */
interface WaterfallLegs { poKgs: number; dcKgs: number; grnKgs: number; finishedKgs: number }

function computeWaterfall(
  orderIds: string[],
  ledgerRows: { orderId: string; itemType: string; itemId: string; txnType: string; inKgs: number; outKgs: number }[],
  poLines: { orderId: string; itemId: string; qty: number }[],
): Map<string, WaterfallLegs> {
  const wf = new Map<string, WaterfallLegs>()
  const get = (orderId: string, itemId: string) => {
    const key = `${orderId}|${itemId}`
    let w = wf.get(key)
    if (!w) { w = { poKgs: 0, dcKgs: 0, grnKgs: 0, finishedKgs: 0 }; wf.set(key, w) }
    return w
  }
  for (const pl of poLines) get(pl.orderId, pl.itemId).poKgs += pl.qty
  for (const r of ledgerRows) {
    const w = get(r.orderId, r.itemId)
    if (r.txnType === 'process_delivery') w.dcKgs += r.outKgs
    if (r.txnType === 'process_receipt' || r.txnType === 'purchase_grn') w.grnKgs += r.inKgs
    if (r.txnType === 'process_receipt') w.finishedKgs += r.inKgs
  }
  return wf
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

  // PRG-04 — one POLine pass (order-scoped), then the derived waterfall legs
  const poLines = (await db.pOLine.findMany({
    where: { orderId: { in: orders.map((o) => o.id) } },
    select: { orderId: true, itemId: true, qty: true },
  })).filter((pl): pl is { orderId: string; itemId: string; qty: number } => !!pl.orderId)
  const wf = computeWaterfall(
    orders.map((o) => o.id),
    ledger.map((r) => ({ orderId: r.orderId as string, itemType: r.itemType, itemId: r.itemId, txnType: r.txnType, inKgs: r.inKgs, outKgs: r.outKgs })),
    poLines,
  )

  const rows: RegisterRow[] = []
  for (const order of orders) {
    for (const p of order.programs as any[]) {
      const isYarn = !!p.yarnId
      const itemId = (p.yarnId ?? p.fabricId) as string
      const key = isYarn ? `yarn:${itemId}` : `fabric:${itemId}`
      const a = agg.get(key) || { inKgs: 0, outKgs: 0 }
      const w = wf.get(`${order.id}|${itemId}`) || { poKgs: 0, dcKgs: 0, grnKgs: 0, finishedKgs: 0 }
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
        poKgs: Math.round(w.poKgs * 100) / 100,
        dcKgs: Math.round(w.dcKgs * 100) / 100,
        grnKgs: Math.round(w.grnKgs * 100) / 100,
        finishedKgs: Math.round(w.finishedKgs * 100) / 100,
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
