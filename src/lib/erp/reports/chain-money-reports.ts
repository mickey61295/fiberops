/**
 * Report services (part 2) — the money & chain aggregates (SPEC-M6 §4/§7-A).
 * order-status-summary flattens the board archetype into a RegisterResult
 * (chain.ts flags stay the single source — M4 §10 rule respected);
 * outstanding-summary is the AR/AP aging; gst-summary the rate×month tax
 * rollup; daily-pnl the per-dept/day production economics (the
 * /costing/daily-pnl menu item's service).
 */
import type { RegisterQuery, RegisterResult, RegisterRow } from '../registers/types'
import { db } from '@/lib/db'
import { CHAIN_ORDER_INCLUDE, computeChainState, nextStage } from '../chain'

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
// 9. Order Status Summary — flat order×chain-stage report (§7-A rule b).
// ---------------------------------------------------------------------------
export async function queryOrderStatusSummary(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { ...dateWhere(q, 'orderDate') }
  if (q.status) where.status = q.status
  if (q.q) {
    where.OR = [
      { orderNo: { contains: q.q } },
      { buyer: { name: { contains: q.q } } },
      { style: { styleNo: { contains: q.q } } },
    ]
  }
  const orders = await db.order.findMany({
    where,
    include: { ...CHAIN_ORDER_INCLUDE, buyer: true },
    orderBy: { orderDate: 'desc' },
    take: q.limit,
  })
  // PcsDespatch.orderId is a relation-less FK column (PITFALLS #21) — the
  // despatch rollup needs its own batched lookup + id-map.
  const despatches = orders.length
    ? await db.pcsDespatch.findMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
    : []
  const despatchedByOrder = new Map<string, number>()
  for (const d of despatches) if (d.orderId) despatchedByOrder.set(d.orderId, (despatchedByOrder.get(d.orderId) ?? 0) + d.totalPcs)
  const stageTotal = 15
  const all: RegisterRow[] = orders.map((o) => {
    const flags = computeChainState(o)
    const stagesDone = Object.values(flags).filter(Boolean).length
    const next = nextStage(flags)
    const despatched = despatchedByOrder.get(o.id) ?? 0
    const produced = (o as any).productionEntries?.reduce((s: number, p: any) => s + p.qty, 0) ?? 0
    return {
      id: o.id,
      href: `/orders/${o.id}`,
      orderNo: o.orderNo,
      buyer: o.buyer?.name ?? '—',
      status: o.status,
      stages: `${stagesDone}/${stageTotal}`,
      nextStage: next ? next.name : 'complete',
      ordered: o.totalPcs,
      produced,
      despatched,
      balance: o.totalPcs - despatched,
      deliveryDate: o.deliveryDate,
    }
  })
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows: all,
    totals: [
      { label: 'Orders', value: all.length },
      { label: 'Ordered', value: sum('ordered') },
      { label: 'Produced', value: sum('produced') },
      { label: 'Despatched', value: sum('despatched') },
      { label: 'Balance', value: sum('balance') },
    ],
    summary: `${all.length} orders · ${sum('balance').toLocaleString('en-IN')} pcs balance to despatch`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 10. Despatch & Packing Summary — despatch rollup per order + packing state.
// ---------------------------------------------------------------------------
export async function queryDespatchPackingSummary(q: RegisterQuery): Promise<RegisterResult> {
  const dWhere: any = { ...dateWhere(q, 'despatchDate') }
  if (q.order) dWhere.orderId = { not: null } // narrowed below via the order id-map
  const despatches = await db.pcsDespatch.findMany({ where: dWhere, include: { lines: true }, take: 5000 })
  const packs = await db.packingList.findMany({ where: { ...dateWhere(q, 'packDate') }, include: { lines: true }, take: 5000 })

  // relation-less FK columns (PITFALLS #21): buyer + order resolved via id-maps
  const buyerIds = [...new Set(despatches.map((d) => d.buyerId).filter(Boolean) as string[])]
  const buyers = buyerIds.length ? await db.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : []
  const buyerMap = new Map(buyers.map((b) => [b.id, b.name]))
  const orderIds = [...new Set(despatches.map((d) => d.orderId).filter(Boolean) as string[])]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const orderMap = new Map(orders.map((o) => [o.id, o.orderNo]))
  if (q.order) {
    const wanted = orders.find((o) => o.orderNo === q.order)?.id
    const filtered = wanted ? despatches.filter((d) => d.orderId === wanted) : []
    despatches.length = 0
    despatches.push(...filtered)
  }

  // pack rollup per despatchId (W6 Cartons↔Despatch recon twin, read side)
  const packsByDespatch = new Map<string, { cartons: number; pcs: number }>()
  for (const p of packs) {
    if (!p.despatchId) continue
    const acc = packsByDespatch.get(p.despatchId) ?? { cartons: 0, pcs: 0 }
    acc.cartons += p.totalCartons
    acc.pcs += p.totalPcs
    packsByDespatch.set(p.despatchId, acc)
  }

  const agg = new Map<string, RegisterRow>()
  for (const d of despatches) {
    const key = d.orderId ?? `dc:${d.id}`
    const value = d.lines.reduce((s, l) => s + l.qty * l.rate, 0)
    const acc = agg.get(key)
    if (acc) {
      acc.dcs = (acc.dcs as number) + 1
      acc.pcs = (acc.pcs as number) + d.totalPcs
      acc.value = (acc.value as number) + value
    } else {
      agg.set(key, {
        id: key,
        href: d.orderId ? `/orders/${d.orderId}` : null,
        orderNo: d.orderId ? orderMap.get(d.orderId) ?? '—' : '—',
        buyer: d.buyerId ? buyerMap.get(d.buyerId) ?? '—' : '—',
        dcs: 1,
        pcs: d.totalPcs,
        cartons: packsByDespatch.get(d.id)?.cartons ?? 0,
        value,
        lastDate: d.despatchDate,
      })
    }
  }

  // merge cartons for rows keyed by orderId (packs may reference the despatch)
  for (const [despatchId, pack] of packsByDespatch) {
    const d = despatches.find((x) => x.id === despatchId)
    if (!d?.orderId) continue
    const row = agg.get(d.orderId)
    if (row && !row.cartons) row.cartons = pack.cartons
  }

  const all = [...agg.values()].sort((a, b) => (b.value as number) - (a.value as number))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Orders', value: all.length },
      { label: 'DCs', value: sum('dcs') },
      { label: 'Pcs', value: sum('pcs') },
      { label: 'Cartons', value: sum('cartons') },
      { label: 'Value', value: Math.round(sum('value')) },
    ],
    summary: `${despatches.length} despatches · ${sum('pcs').toLocaleString('en-IN')} pcs · ₹${Math.round(sum('value')).toLocaleString('en-IN')}`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 11. Outstanding Summary — AR/AP aging per party (§7-A rule 5).
// SPEC-M40 (Batch 4, PAY-05/07): AR aging anchors on dueDate (fallback
// invoiceDate); settlement comes from ACTIVE PaymentAllocation rows; the
// on-account advance shows per party. AP derives from open SupplierBills −
// Σ active bill allocations (the iteration-order GRN-value guesswork RETIRED);
// received-not-billed shows as a separate MEMO (not owed until billed).
// Buckets 0-30 / 31-60 / 61-90 / 90+ (spec §7 PAY-07 widths).
// ---------------------------------------------------------------------------
const AGE_BUCKETS = [
  { label: '0-30', max: 30 },
  { label: '31-60', max: 60 },
  { label: '61-90', max: 90 },
  { label: '90+', max: Infinity },
]
const ageBucket = (d: Date, now = Date.now()): number => {
  const days = Math.floor((now - d.getTime()) / 86_400_000)
  return AGE_BUCKETS.findIndex((b) => days <= b.max)
}

export async function queryOutstandingSummary(q: RegisterQuery): Promise<RegisterResult> {
  const invWhere: any = { status: { not: 'cancelled' }, ...dateWhere(q, 'invoiceDate') }
  const grnWhere: any = { grnType: { in: ['purchase', 'direct_receipt'] }, ...dateWhere(q, 'grnDate') }
  const billsWhere: any = { status: { in: ['passed', 'partial', 'paid'] }, ...dateWhere(q, 'billDate') }
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    invWhere.partyId = p.id
    grnWhere.partyId = p.id
    billsWhere.partyId = p.id
  }
  const [invoices, payments, grns, bills] = await Promise.all([
    db.salesInvoice.findMany({ where: invWhere, include: { party: true }, take: 5000 }),
    db.payment.findMany({ where: { status: 'active', ...dateWhere(q, 'payDate') }, take: 5000 }),
    db.gRN.findMany({ where: grnWhere, include: { party: true }, take: 5000 }),
    // PAY-05 — open supplier bills (passed/partial = payable; draft is NOT
    // owed). partyId is a relation-less FK (PITFALLS #21) — resolved below.
    db.supplierBill.findMany({ where: billsWhere, take: 5000 }),
  ])
  const billPartyIds = [...new Set(bills.map((b) => b.partyId))]
  const billParties = billPartyIds.length ? await db.party.findMany({ where: { id: { in: billPartyIds } }, select: { id: true, name: true } }) : []
  const billPartyName = new Map(billParties.map((p) => [p.id, p.name]))

  // PAY-01 — settlement truth: ACTIVE allocation rows (direction-correct by
  // construction: in-payments allocate invoices, out-payments allocate bills).
  const payIds = payments.map((p) => p.id)
  const activeAllocs = payIds.length
    ? await db.paymentAllocation.findMany({ where: { paymentId: { in: payIds }, reversedAt: null }, take: 20000 })
    : []
  const settledByInvoice = new Map<string, number>()
  const settledByBill = new Map<string, number>()
  const allocByPayment = new Map<string, number>()
  for (const a of activeAllocs) {
    if (a.invoiceId) settledByInvoice.set(a.invoiceId, (settledByInvoice.get(a.invoiceId) ?? 0) + a.amount)
    if (a.billId) settledByBill.set(a.billId, (settledByBill.get(a.billId) ?? 0) + a.amount)
    allocByPayment.set(a.paymentId, (allocByPayment.get(a.paymentId) ?? 0) + a.amount)
  }

  type Acc = RegisterRow & { _type: string }
  const agg = new Map<string, Acc>()

  // AR side — PAY-07: anchor on dueDate (fallback invoiceDate)
  for (const i of invoices) {
    const key = `ar:${i.partyId}`
    const outstanding = Math.max(0, i.billAmount - (settledByInvoice.get(i.id) ?? 0))
    const bucket = ageBucket(i.dueDate ?? i.invoiceDate)
    let acc = agg.get(key)
    if (!acc) {
      acc = {
        id: key, party: i.party?.name ?? '—', _type: 'AR',
        billed: 0, settled: 0, outstanding: 0, onAccount: 0, receivedNotBilled: 0,
        b0: 0, b1: 0, b2: 0, b3: 0,
      }
      agg.set(key, acc)
    }
    acc.billed = (acc.billed as number) + i.billAmount
    acc.settled = (acc.settled as number) + (settledByInvoice.get(i.id) ?? 0)
    acc.outstanding = (acc.outstanding as number) + outstanding
    if (bucket === 0) acc.b0 = (acc.b0 as number) + outstanding
    else if (bucket === 1) acc.b1 = (acc.b1 as number) + outstanding
    else if (bucket === 2) acc.b2 = (acc.b2 as number) + outstanding
    else acc.b3 = (acc.b3 as number) + outstanding
  }

  // AR: on-account credit per party (PAY-01/07) — a receipt's unallocated
  // remainder. HFX-05's FIFO application stays (b3→b0 order); the advance
  // beyond outstanding is now its own labeled column, not just a ledger fact.
  const partyReceipts = new Map<string, number>()
  for (const p of payments) {
    if (p.direction !== 'in') continue
    const remainder = p.amount - (allocByPayment.get(p.id) ?? 0)
    if (remainder > 0.005) partyReceipts.set(p.partyId, (partyReceipts.get(p.partyId) ?? 0) + remainder)
  }
  for (const [partyId, receiptTotal] of partyReceipts) {
    const acc = agg.get(`ar:${partyId}`)
    if (!acc || receiptTotal <= 0) continue
    const outstanding = acc.outstanding as number
    acc.settled = (acc.settled as number) + Math.min(receiptTotal, Math.max(0, outstanding))
    let remaining = receiptTotal
    for (const bucket of ['b3', 'b2', 'b1', 'b0'] as const) {
      if (remaining <= 0) break
      const inBucket = acc[bucket] as number
      const take = Math.min(inBucket, remaining)
      acc[bucket] = inBucket - take
      remaining -= take
    }
    acc.outstanding = Math.max(0, outstanding - receiptTotal)
    acc.onAccount = Math.max(0, receiptTotal - Math.max(0, outstanding)) // the labeled advance (PAY-07)
  }

  // AP side — PAY-05: open SupplierBills (the honest payable). Billed =
  // Σ billAmount of passed/partial/paid bills; settled = Σ ACTIVE bill
  // allocations; aging anchors on dueDate (fallback billDate). The M3
  // iteration-order GRN-minus-paidOut guesswork is RETIRED.
  for (const b of bills) {
    const key = `ap:${b.partyId}`
    const outstanding = Math.max(0, b.billAmount - (settledByBill.get(b.id) ?? 0))
    const bucket = ageBucket(b.dueDate ?? b.billDate)
    let acc = agg.get(key)
    if (!acc) {
      acc = {
        id: key, party: billPartyName.get(b.partyId) ?? '—', _type: 'AP',
        billed: 0, settled: 0, outstanding: 0, onAccount: 0, receivedNotBilled: 0,
        b0: 0, b1: 0, b2: 0, b3: 0,
      }
      agg.set(key, acc)
    }
    acc.billed = (acc.billed as number) + b.billAmount
    acc.settled = (acc.settled as number) + (settledByBill.get(b.id) ?? 0)
    acc.outstanding = (acc.outstanding as number) + outstanding
    if (bucket === 0) acc.b0 = (acc.b0 as number) + outstanding
    else if (bucket === 1) acc.b1 = (acc.b1 as number) + outstanding
    else if (bucket === 2) acc.b2 = (acc.b2 as number) + outstanding
    else acc.b3 = (acc.b3 as number) + outstanding
  }

  // PAY-05 — received-not-billed MEMO: purchase GRN value with no open bill
  // (the gap between receipt and billing). Not owed until a bill is passed —
  // shown so the chase list is honest, never added to AP outstanding.
  const billedGrnIds = new Set(
    (await db.supplierBill.findMany({ where: { status: { not: 'cancelled' } }, select: { grnId: true } })).map((b) => b.grnId).filter(Boolean) as string[],
  )
  for (const g of grns) {
    if (billedGrnIds.has(g.id)) continue
    let acc = agg.get(`ap:${g.partyId}`)
    if (!acc) {
      acc = {
        id: `ap:${g.partyId}`, party: g.party?.name ?? '—', _type: 'AP',
        billed: 0, settled: 0, outstanding: 0, onAccount: 0, receivedNotBilled: 0,
        b0: 0, b1: 0, b2: 0, b3: 0,
      }
      agg.set(`ap:${g.partyId}`, acc)
    }
    acc.receivedNotBilled = (acc.receivedNotBilled as number) + g.totalValue
  }

  const all: (RegisterRow & { type: string })[] = [...agg.values()].map(({ _type, ...r }) => ({ ...r, type: _type }))
  all.sort((a, b) => ((b.outstanding as number) ?? 0) - ((a.outstanding as number) ?? 0))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const arRows = all.filter((r) => r.type === 'AR')
  const apRows = all.filter((r) => r.type === 'AP')
  const rnb = apRows.reduce((s, r) => s + (r.receivedNotBilled as number), 0)
  return {
    rows,
    totals: [
      { label: 'AR Outstanding', value: Math.round(arRows.reduce((s, r) => s + (r.outstanding as number), 0)) },
      { label: 'AP Outstanding', value: Math.round(apRows.reduce((s, r) => s + (r.outstanding as number), 0)) },
      { label: 'Received not billed (memo)', value: Math.round(rnb) },
    ],
    summary: `AR ₹${Math.round(arRows.reduce((s, r) => s + (r.outstanding as number), 0)).toLocaleString('en-IN')} across ${arRows.length} parties · AP ₹${Math.round(apRows.reduce((s, r) => s + (r.outstanding as number), 0)).toLocaleString('en-IN')} across ${apRows.length} suppliers${rnb > 0 ? ` · ₹${Math.round(rnb).toLocaleString('en-IN')} received-not-billed (memo)` : ''}`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 12. GST Summary — invoice tax rollup by month × rate (§7-A rule 6).
// ---------------------------------------------------------------------------
export async function queryGstSummary(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { status: { not: 'cancelled' }, ...dateWhere(q, 'invoiceDate') }
  const invoices = await db.salesInvoice.findMany({ where, include: { party: true }, take: 5000 })
  const agg = new Map<string, RegisterRow>()
  for (const i of invoices) {
    const month = `${i.invoiceDate.getFullYear()}-${String(i.invoiceDate.getMonth() + 1).padStart(2, '0')}`
    const isIgst = i.igstRate > 0
    const rate = isIgst ? i.igstRate : i.cgstRate + i.sgstRate
    const key = `${month}:${rate}:${isIgst ? 'igst' : 'gst'}`
    const acc = agg.get(key)
    if (acc) {
      acc.invoices = (acc.invoices as number) + 1
      acc.taxable = (acc.taxable as number) + i.taxableValue
      acc.cgst = (acc.cgst as number) + i.cgstAmt
      acc.sgst = (acc.sgst as number) + i.sgstAmt
      acc.igst = (acc.igst as number) + i.igstAmt
      acc.total = (acc.total as number) + i.billAmount
    } else {
      agg.set(key, {
        id: key,
        month,
        rate,
        taxType: isIgst ? 'IGST' : 'CGST+SGST',
        invoices: 1,
        taxable: i.taxableValue,
        cgst: i.cgstAmt, sgst: i.sgstAmt, igst: i.igstAmt,
        total: i.billAmount,
      })
    }
  }
  const all = [...agg.values()].sort((a, b) => String(b.month).localeCompare(String(a.month)))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Invoices', value: sum('invoices') },
      { label: 'Taxable', value: Math.round(sum('taxable')) },
      { label: 'CGST', value: Math.round(sum('cgst')) },
      { label: 'SGST', value: Math.round(sum('sgst')) },
      { label: 'IGST', value: Math.round(sum('igst')) },
    ],
    summary: `${sum('invoices')} invoices · taxable ₹${Math.round(sum('taxable')).toLocaleString('en-IN')} · tax ₹${Math.round(sum('cgst') + sum('sgst') + sum('igst')).toLocaleString('en-IN')}`,
    count: all.length,
  }
}

// ---------------------------------------------------------------------------
// 13. Daily Unit P&L — per dept × day production economics (§7-A rule 4).
// HFX-12 (Phase-6B Batch 0) — the wage columns finally carry the piece-rate
// wage ACTUALLY POSTED (Σ ProductionEntry.amount — qty × the operator's
// piece rate). The old reader summed `shiftWages`, a column NO door ever
// writes (grep-verified: read-side only), so Wages was structurally ₹0 and
// Margin ≡ produced. Produced value now values the day's output at the
// ORDER's contract rate (totalValue × fxRate / totalPcs — the revenue side),
// falling back to the piece-rate cost basis when the order carries no value;
// Margin = produced − wages is the contract-vs-piece-rate spread (non-zero
// for any day with production). L-06 later resolves the shiftWages column
// itself (writer or drop).
// Expenses are PERIOD-level (no dept column — ERRATUM §13-1): they ride the
// totals band, not the per-dept rows.
// ---------------------------------------------------------------------------
export async function queryDailyPnl(q: RegisterQuery): Promise<RegisterResult> {
  const pWhere: any = { ...dateWhere(q, 'prodDate') }
  if (q.order) pWhere.order = { orderNo: q.order }
  const [entries, expenses] = await Promise.all([
    db.productionEntry.findMany({
      where: pWhere,
      include: {
        department: true,
        order: { select: { totalPcs: true, totalValue: true, currency: true, fxRate: true } },
      },
      take: 10000,
    }),
    db.expense.findMany({ where: { ...dateWhere(q, 'expDate') }, take: 10000 }),
  ])

  /** Order contract rate (₹/pc, INR-adjusted) — null when the order carries
   *  no valueable contract (totalValue 0 / totalPcs 0) → caller falls back to
   *  the piece-rate cost basis for that entry. */
  const contractRateOf = (o: { totalPcs: number; totalValue: number; currency: string; fxRate: number } | null): number | null => {
    if (!o || !o.totalPcs || o.totalValue <= 0) return null
    const inrValue = o.currency === 'INR' ? o.totalValue : o.totalValue * (o.fxRate || 1)
    return inrValue / o.totalPcs
  }

  const day = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  const agg = new Map<string, RegisterRow>()
  for (const e of entries) {
    const key = `${e.deptId}:${day(e.prodDate)}`
    const sortKey = e.prodDate.getTime()
    // HFX-12 — produced: the entry's qty at the ORDER's contract rate
    // (revenue-side valuation), piece-rate amount as cost-basis fallback;
    // wages: the piece-rate wage actually posted (amount).
    const rate = contractRateOf((e as any).order ?? null)
    const producedValue = rate !== null ? e.qty * rate : e.amount
    const wageValue = e.amount
    const acc = agg.get(key)
    if (acc) {
      acc.qty = (acc.qty as number) + e.qty
      acc.produced = (acc.produced as number) + producedValue
      acc.wages = (acc.wages as number) + wageValue
      acc.margin = (acc.margin as number) + producedValue - wageValue
    } else {
      agg.set(key, {
        id: key,
        dept: e.department?.code ?? '—',
        date: e.prodDate,
        qty: e.qty,
        produced: producedValue,
        wages: wageValue,
        margin: producedValue - wageValue,
        _sort: sortKey,
      })
    }
  }
  const all = [...agg.values()].sort((a, b) => (b._sort as number) - (a._sort as number)).map(({ _sort, ...r }) => r)
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const producedTotal = sum('produced')
  const wagesTotal = sum('wages')
  return {
    rows,
    totals: [
      { label: 'Produced Value', value: Math.round(producedTotal) },
      { label: 'Wages', value: Math.round(wagesTotal) },
      { label: 'Expenses (period)', value: Math.round(expensesTotal) },
      { label: 'Net Margin', value: Math.round(producedTotal - wagesTotal - expensesTotal) },
    ],
    summary: `${all.length} dept-days · produced ₹${Math.round(producedTotal).toLocaleString('en-IN')} − wages ₹${Math.round(wagesTotal).toLocaleString('en-IN')} − expenses ₹${Math.round(expensesTotal).toLocaleString('en-IN')}`,
    count: all.length,
  }
}
