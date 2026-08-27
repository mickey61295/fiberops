/**
 * Report services (part 1) — SPEC-M6 §4 (Wave A). The RH archetype's read
 * layer. Reuses RegisterQuery/RegisterResult VERBATIM (zero new result
 * types): a report is a parameterized read over the SAME services the
 * registers use, plus NEW aggregate queries for MIS-type outputs.
 * Order-status/recon stay out of the service registry (M4 §10 rule) —
 * order-status-summary here is a flat RegisterResult view, NOT the board.
 */
import type { RegisterQuery, RegisterResult, RegisterRow } from '../registers/types'
import { db } from '@/lib/db'
import { fetchCurrentStock } from '../registers/stock-register'
import { buildItemCodeMaps } from '../registers/resolve'

const dateWhere = (q: RegisterQuery, field: string) => {
  const w: any = {}
  if (q.from || q.to) {
    w[field] = {}
    if (q.from) w[field].gte = q.from
    if (q.to) w[field].lte = q.to
  }
  return w
}

// ---------------------------------------------------------------------------
// 1. Current Stock — live CurrentStock buckets by item × godown (§7-A).
// ---------------------------------------------------------------------------
export async function queryCurrentStockReport(q: RegisterQuery): Promise<RegisterResult> {
  const stocks = await fetchCurrentStock({ itemType: q.itemType, godown: q.godown })
  if (stocks === null) return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }

  const byType: Record<string, Set<string>> = {}
  for (const s of stocks) (byType[s.itemType] ??= new Set()).add(s.itemId)
  const codeMaps = await buildItemCodeMaps(byType)

  const groups = new Map<string, RegisterRow & { _value: number }>()
  for (const s of stocks) {
    const qty = s.itemType === 'pcs' ? s.pcs : s.itemType === 'fabric' ? s.mtrs : s.kgs
    const value = qty * s.rate
    const key = `${s.itemType}:${s.itemId}:${s.godownId}`
    const acc = groups.get(key)
    if (acc) {
      acc.bags = (acc.bags as number) + s.bags
      acc.kgs = (acc.kgs as number) + s.kgs
      acc.mtrs = (acc.mtrs as number) + s.mtrs
      acc.pcs = (acc.pcs as number) + s.pcs
      acc._value += value
    } else {
      groups.set(key, {
        id: key,
        itemType: s.itemType,
        itemCode: codeMaps[s.itemType]?.get(s.itemId) ?? s.itemId,
        godown: s.godown?.code ?? '—',
        bags: s.bags, kgs: s.kgs, mtrs: s.mtrs, pcs: s.pcs,
        rate: s.rate,
        _value: value,
      })
    }
  }
  const all = [...groups.values()].map(({ _value, ...r }) => ({ ...r, value: _value }))
  all.sort((a, b) => (b.value as number) - (a.value as number))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Rows', value: all.length },
      { label: 'Kgs', value: Math.round(sum('kgs')) },
      { label: 'Mtrs', value: Math.round(sum('mtrs')) },
      { label: 'Pcs', value: sum('pcs') },
      { label: 'Value', value: Math.round(sum('value')) },
    ],
    summary: `${all.length} stock rows · value ₹${Math.round(sum('value')).toLocaleString('en-IN')}`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 2. Line WIP — issued vs produced vs pending per line (§7-C-4 read twin).
// ---------------------------------------------------------------------------
export async function queryLineWip(q: RegisterQuery): Promise<RegisterResult> {
  const issues = await db.lineIssue.findMany({
    where: { ...dateWhere(q, 'issueDate'), ...(q.order ? { order: { orderNo: q.order } } : {}) },
    include: { line: true },
  })
  const entries = await db.productionEntry.findMany({
    where: { ...dateWhere(q, 'prodDate') },
    select: { lineId: true, qty: true },
  })
  const producedByLine = new Map<string, number>()
  for (const e of entries) if (e.lineId) producedByLine.set(e.lineId, (producedByLine.get(e.lineId) ?? 0) + e.qty)

  const agg = new Map<string, RegisterRow>()
  for (const i of issues) {
    const acc = agg.get(i.lineId)
    if (acc) {
      acc.issued = (acc.issued as number) + i.qty
    } else {
      agg.set(i.lineId, {
        id: i.lineId,
        line: i.line?.code ?? '—',
        lineName: i.line?.name ?? null,
        issued: i.qty,
        produced: producedByLine.get(i.lineId) ?? 0,
        wip: i.qty - (producedByLine.get(i.lineId) ?? 0),
        issues: 1,
      })
    }
  }
  // lines with production but no issues (rare) still show
  const missing = [...producedByLine.keys()].filter((id) => !agg.has(id))
  const lines = missing.length ? await db.line.findMany({ where: { id: { in: missing } } }) : []
  for (const l of lines) {
    const produced = producedByLine.get(l.id) ?? 0
    agg.set(l.id, { id: l.id, line: l.code ?? '—', lineName: l.name ?? null, issued: 0, produced, wip: -produced, issues: 0 })
  }
  const all = [...agg.values()]
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Lines', value: all.length },
      { label: 'Issued', value: sum('issued') },
      { label: 'Produced', value: sum('produced') },
      { label: 'WIP', value: sum('wip') },
    ],
    summary: `${all.length} lines · issued ${sum('issued').toLocaleString('en-IN')} · produced ${sum('produced').toLocaleString('en-IN')} · WIP ${sum('wip').toLocaleString('en-IN')}`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 3. Rejection Summary — qty by dept × rejType with action breakdown.
// ---------------------------------------------------------------------------
export async function queryRejectionSummary(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { ...dateWhere(q, 'rejDate') }
  if (q.order) where.order = { orderNo: q.order }
  if (q.status) where.rejType = q.status // status key rides rejType (config comment)
  const rejs = await db.rejectionEntry.findMany({ where, include: { department: true }, take: 5000 })
  const agg = new Map<string, RegisterRow & { _scrap: number; _rework: number; _ret: number }>()
  for (const r of rejs) {
    const key = `${r.deptId}:${r.rejType}`
    const scrap = r.action === 'scrap' ? r.qty : 0
    const rework = r.action === 'rework' ? r.qty : 0
    const ret = r.action === 'return_to_party' ? r.qty : 0
    const acc = agg.get(key)
    if (acc) {
      acc.qty = (acc.qty as number) + r.qty
      acc.count = (acc.count as number) + 1
      acc._scrap += scrap; acc._rework += rework; acc._ret += ret
    } else {
      agg.set(key, {
        id: key,
        dept: r.department?.code ?? '—',
        rejType: r.rejType,
        qty: r.qty, count: 1,
        _scrap: scrap, _rework: rework, _ret: ret,
      })
    }
  }
  const all: RegisterRow[] = [...agg.values()].map(({ _scrap, _rework, _ret, ...r }) => ({ ...r, scrap: _scrap, rework: _rework, returned: _ret }))
  all.sort((a, b) => (b.qty as number) - (a.qty as number))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Entries', value: rejs.length },
      { label: 'Qty', value: sum('qty') },
      { label: 'Scrap', value: sum('scrap') },
      { label: 'Rework', value: sum('rework') },
      { label: 'Returned', value: sum('returned') },
    ],
    summary: `${rejs.length} rejection entries · ${sum('qty').toLocaleString('en-IN')} pcs`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 4. Operation Summary — production entries rolled up per department.
// ---------------------------------------------------------------------------
export async function queryOperationSummary(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { ...dateWhere(q, 'prodDate') }
  if (q.order) where.order = { orderNo: q.order }
  const entries = await db.productionEntry.findMany({ where, include: { department: true }, take: 5000 })
  const agg = new Map<string, RegisterRow>()
  for (const e of entries) {
    const acc = agg.get(e.deptId)
    if (acc) {
      acc.entries = (acc.entries as number) + 1
      acc.qty = (acc.qty as number) + e.qty
      acc.amount = (acc.amount as number) + e.amount
      acc.wages = (acc.wages as number) + e.shiftWages
      acc.rework = (acc.rework as number) + (e.rework ? e.qty : 0)
    } else {
      agg.set(e.deptId, {
        id: e.deptId,
        dept: e.department?.code ?? '—',
        entries: 1, qty: e.qty, amount: e.amount, wages: e.shiftWages, rework: e.rework ? e.qty : 0,
      })
    }
  }
  const all = [...agg.values()].sort((a, b) => (b.qty as number) - (a.qty as number))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Entries', value: entries.length },
      { label: 'Qty', value: sum('qty') },
      { label: 'Amount', value: Math.round(sum('amount')) },
      { label: 'Wages', value: Math.round(sum('wages')) },
    ],
    summary: `${entries.length} entries across ${all.length} departments · ${sum('qty').toLocaleString('en-IN')} pcs`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 5. Expenses Summary — expense book by category (§7-A; Expense has NO dept
// column — dept-level P&L rides daily-pnl instead; ERRATUM §13-1).
// ---------------------------------------------------------------------------
export async function queryExpensesSummary(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { ...dateWhere(q, 'expDate') }
  if (q.status) where.category = q.status // status key rides category (config comment)
  const [exps, count] = await Promise.all([
    db.expense.findMany({ where, orderBy: { expDate: 'desc' }, take: q.limit, skip: (q.page - 1) * q.limit }),
    db.expense.count({ where }),
  ])
  // orderId is a relation-less FK col (PITFALLS #21) — order no via id-map
  const orderIds = [...new Set(exps.map((e) => e.orderId).filter(Boolean) as string[])]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const orderMap = new Map(orders.map((o) => [o.id, o.orderNo]))
  if (q.order) {
    const wanted = orders.find((o) => o.orderNo === q.order)?.id
    const filtered = wanted ? exps.filter((e) => e.orderId === wanted) : []
    return {
      rows: filtered.map(mapExpense(orderMap)),
      totals: [
        { label: 'Entries', value: filtered.length },
        { label: 'Amount', value: Math.round(filtered.reduce((s, e) => s + e.amount, 0)) },
      ],
      summary: `${filtered.length} expenses for ${q.order} · ₹${Math.round(filtered.reduce((s, e) => s + e.amount, 0)).toLocaleString('en-IN')}`,
      count: filtered.length,
    }
  }
  const rows = exps.map(mapExpense(orderMap))
  const total = rows.reduce((s, r) => s + (r.amount as number), 0)
  return {
    rows,
    totals: [
      { label: 'Entries', value: count },
      { label: 'Amount', value: Math.round(total) },
    ],
    summary: `${count} expenses · ₹${Math.round(total).toLocaleString('en-IN')}`,
    count,
  }
}

const mapExpense = (orderMap: Map<string, string>) => (e: { id: string; expNo: string; expDate: Date; category: string; orderId: string | null; amount: number; status: string }) => ({
  id: e.id,
  expNo: e.expNo,
  date: e.expDate,
  category: e.category,
  order: e.orderId ? orderMap.get(e.orderId) ?? '—' : '—',
  amount: e.amount,
  status: e.status,
})

// ---------------------------------------------------------------------------
// 6. Sample Status — the sample development tracker as a flat report.
// ---------------------------------------------------------------------------
export async function querySampleStatus(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { ...dateWhere(q, 'sampledOn') }
  if (q.status) where.status = q.status
  const [samples, count] = await Promise.all([
    db.sample.findMany({ where, orderBy: { sampledOn: 'desc' }, take: q.limit, skip: (q.page - 1) * q.limit }),
    db.sample.count({ where }),
  ])
  // buyerId/styleId are relation-less FK cols (PITFALLS #21) — id-maps
  const buyerIds = [...new Set(samples.map((s) => s.buyerId).filter(Boolean) as string[])]
  const buyers = buyerIds.length ? await db.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : []
  const buyerMap = new Map(buyers.map((b) => [b.id, b.name]))
  const styleIds = [...new Set(samples.map((s) => s.styleId).filter(Boolean) as string[])]
  const styles = styleIds.length ? await db.style.findMany({ where: { id: { in: styleIds } }, select: { id: true, styleNo: true } }) : []
  const styleMap = new Map(styles.map((s) => [s.id, s.styleNo]))
  const rows = samples.map((s) => ({
    id: s.id,
    href: `/orders/samples/${s.id}`,
    sampleNo: s.sampleNo,
    buyer: s.buyerId ? buyerMap.get(s.buyerId) ?? '—' : '—',
    style: s.styleId ? styleMap.get(s.styleId) ?? '—' : '—',
    sampleType: s.sampleType,
    qty: s.qty,
    sampledOn: s.sampledOn,
    status: s.status,
    enquiryRef: s.enquiryRef ?? '—',
  }))
  return {
    rows,
    totals: [
      { label: 'Samples', value: count },
      { label: 'Approved', value: rows.filter((r) => r.status === 'approved').length },
      { label: 'Pending', value: rows.filter((r) => r.status === 'submitted').length },
    ],
    summary: `${count} samples · ${rows.filter((r) => r.status === 'approved').length} approved`,
    count,
  }
}

// ---------------------------------------------------------------------------
// 7. Lab Test Report — QCDATA log with result breakdown.
// ---------------------------------------------------------------------------
export async function queryLabTestsReport(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { ...dateWhere(q, 'testedOn') }
  if (q.itemType) where.itemType = q.itemType
  if (q.status) where.result = q.status // status key rides result (config comment)
  const [tests, count] = await Promise.all([
    db.labTest.findMany({ where, orderBy: { testedOn: 'desc' }, take: q.limit, skip: (q.page - 1) * q.limit }),
    db.labTest.count({ where }),
  ])
  const rows = tests.map((t) => ({
    id: t.id,
    href: `/quality/lab-tests/${t.id}`,
    testNo: t.testNo,
    itemType: t.itemType,
    testType: t.testType,
    result: t.result,
    testedOn: t.testedOn,
    testedBy: t.testedBy ?? '—',
  }))
  return {
    rows,
    totals: [
      { label: 'Tests', value: count },
      { label: 'Pass', value: rows.filter((r) => r.result === 'pass').length },
      { label: 'Fail', value: rows.filter((r) => r.result === 'fail').length },
    ],
    summary: `${count} tests · ${rows.filter((r) => r.result === 'pass').length} pass / ${rows.filter((r) => r.result === 'fail').length} fail`,
    count,
  }
}

// ---------------------------------------------------------------------------
// 8. Cost Sheet Summary — versions, total cost, margin per order.
// ---------------------------------------------------------------------------
export async function queryCostSheetSummary(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.order) where.order = { orderNo: q.order }
  const [sheets, count] = await Promise.all([
    db.costSheet.findMany({
      where,
      include: { order: { include: { buyer: true } } },
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.costSheet.count({ where }),
  ])
  const rows = sheets.map((c) => ({
    id: c.id,
    href: `/costing/cost-sheet/${c.id}`,
    orderNo: c.order?.orderNo ?? '—',
    buyer: c.order?.buyer?.name ?? '—',
    version: c.version,
    totalCost: c.totalCost,
    sellingPrice: c.sellingPrice,
    marginPct: c.marginPct,
  }))
  const sum = (k: 'totalCost' | 'sellingPrice') => rows.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Sheets', value: count },
      { label: 'Total Cost', value: Math.round(sum('totalCost')) },
      { label: 'Selling Price', value: Math.round(sum('sellingPrice')) },
    ],
    summary: `${count} cost sheets · cost ₹${Math.round(sum('totalCost')).toLocaleString('en-IN')}`,
    count,
  }
}
