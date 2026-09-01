/**
 * Register services math suite — SPEC-M4 §12 (Wave B exit criterion).
 * Seeds ONE test-owned fixture chain (party/style/order/PO/GRN/ledger/jobwork/
 * production/invoice/payment/cost-sheet — doc-parity pattern, TS-tagged doc
 * numbers), asserts the §5 math rows, then surgically cleans up.
 *
 * Math asserted (SPEC-M4 §5):
 *  - inhand: ordered − despatched = pending; invoiced Σ
 *  - daily-in-out totals == StockLedger sums for the filtered godown
 *  - party-balance: Σ POLine.qty − Σ GRN.totalQty = pending (value likewise)
 *  - bills: billed − deductions − collected = outstanding
 *  - party-ledger: opening + billed − debit − journals + received − paid
 *  - io-history: running balance per uom (in − out cumulative)
 *  - production-status: Σ qty, rework split, jobwork column
 *  - budget-vs-actual: budgeted (cost sheets) vs actual (PO + prod; wage rides in prodCost — HFX-12)
 *  - order-status: chain done-count + next stage
 *  - lots: CurrentStock rollup per lot
 *  - pcs-stock / stock-register pcs variant: pcs + value
 * Plus the delegated-tool regression pins (list_orders, get_stock_ledger,
 * list_jobworks, get_party_ledger poBalances, get_budget_vs_actual).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { queryOrderStatus } from '@/lib/erp/registers/order-status'
import { poRecon, invoiceRecon, jobworkRecon, despatchRecon } from '@/lib/erp/registers/recon'
import { getTool } from '@/lib/agent/tools'

const TS = Date.now()
const PARTY = `RGTP-${TS}`
const STYLE = `RGTS-${TS}`
const ORDER = `RGT-ORD-${TS}`
const PO = `RGT-PO-${TS}`
const GRN = `RGT-GRN-${TS}`
const SB = `RGT-SB-${TS}`
const DC = `RGT-DC-${TS}`
const JW = `RGT-JW-${TS}`
const INV = `RGT-INV-${TS}`
const RCP = `RGT-RCP-${TS}`
const GODOWN = `RGTG-${TS}`
const DEPT = `RGTD-${TS}`
const LOT = `RGT-LOT-${TS}`
const OP = `RGT-OP-${TS}`

// fixed fixture numbers (every assertion below is derived from these)
const OPENING = 100
const ORDERED_PCS = 100
const DESPATCHED_PCS = 30
const INVOICED_QTY = 50
const BILL_AMOUNT = 5000
const RECEIVED_AMT = 2000
const PO_QTY = 15 // 10 @100 + 5 @200
const PO_VALUE = 2000
const GRN_QTY = 6
const GRN_VALUE = 600
const BUDGET_PO_QTY = 4 // budget POLine: 4 @ 50 = 200
const PROD_QTY = 60 // 50 + 10 (rework)
const REWORK_QTY = 10
const PROD_AMT = 600 // 500 + 100
const SHIFT_WAGES = 50 // 30 + 20
const JW_QTY = 40
const COST = 2500
const PCS_STOCK = 40
const PCS_RATE = 10
const IN_KGS = 12 // 10 + 2
const OUT_KGS = 4
const LOT_KGS = 5

// ids captured at seed time
let partyId = ''
let styleId = ''
let orderId = ''
let poId = ''
let grnId = ''
let supplierBillId = ''
let deptId = ''
let godownId = ''
let agentTurnId = ''

describe('register services math (SPEC-M4 §5)', () => {
  beforeAll(async () => {
    // masters (test-owned)
    const party = await db.party.create({
      data: { code: PARTY, name: `RGT Party ${TS}`, partyType: 'both', openingBalance: OPENING },
    })
    partyId = party.id
    const godown = await db.godown.create({ data: { code: GODOWN, name: `RGT Godown ${TS}` } })
    godownId = godown.id
    const dept = await db.department.create({ data: { code: DEPT, name: `RGT Dept ${TS}` } })
    deptId = dept.id
    const buyer = await db.buyer.findUnique({ where: { code: 'B001' } })
    if (!buyer) throw new Error('seed buyer B001 missing')
    const style = await db.style.create({ data: { styleNo: STYLE, description: `RGT style ${TS}`, buyerId: buyer.id } })
    styleId = style.id

    // order + line
    const order = await db.order.create({
      data: {
        orderNo: ORDER, buyerId: buyer.id, styleId, status: 'open',
        totalPcs: ORDERED_PCS, totalValue: ORDERED_PCS * 200, finYear: 'FY26',
      },
    })
    orderId = order.id
    await db.orderLine.create({
      data: { orderId, styleId, qty: ORDERED_PCS, rate: 200 },
    })

    // PO (party-balance fixture) + budget-linked POLine
    const po = await db.purchaseOrder.create({
      data: { poNo: PO, poType: 'yarn', partyId, status: 'open', totalQty: PO_QTY, totalValue: PO_VALUE, finYear: 'FY26' },
    })
    poId = po.id
    await db.pOLine.createMany({
      data: [
        { poId, itemType: 'yarn', itemId: `RGTY-${TS}`, qty: 10, rate: 100, amount: 1000 },
        { poId, itemType: 'yarn', itemId: `RGTY-${TS}`, qty: 5, rate: 200, amount: 1000 },
        { poId, orderId, itemType: 'yarn', itemId: `RGTY-${TS}`, qty: BUDGET_PO_QTY, rate: 50, amount: 200 },
      ],
    })

    // GRN against the PO (received 6 / 600)
    const grn = await db.gRN.create({
      data: { grnNo: GRN, grnType: 'purchase', poId, partyId, godownId, totalQty: GRN_QTY, totalValue: GRN_VALUE, finYear: 'FY26' },
    })
    grnId = grn.id
    // SPEC-M40 PAY-03 — the supplier bill doc (the register lists SBs, not GRNs)
    const sb = await db.supplierBill.create({
      data: { billNo: SB, partyId, grnId, poId, taxableValue: GRN_VALUE, billAmount: GRN_VALUE, tdsPercent: 2, billDate: new Date('2026-08-21'), finYear: 'FY26', status: 'passed', matchStatus: 'matched' },
    })
    supplierBillId = sb.id

    // StockLedger legs (io-history running balance: +10, −4, +2 → 8)
    await db.stockLedger.createMany({
      data: [
        { txnType: 'purchase_grn', itemType: 'yarn', itemId: `RGTY-${TS}`, godownId, partyId, docNo: GRN, docDate: new Date('2026-08-20'), finYear: 'FY26', inKgs: 10, rate: 100, refId: grnId },
        { txnType: 'process_delivery', itemType: 'yarn', itemId: `RGTY-${TS}`, godownId, partyId, docNo: JW, docDate: new Date('2026-08-21'), finYear: 'FY26', outKgs: OUT_KGS },
        { txnType: 'opening', itemType: 'yarn', itemId: `RGTY-${TS}`, godownId, partyId, docNo: OP, docDate: new Date('2026-08-22'), finYear: 'FY26', inKgs: 2 },
      ],
    })

    // despatch (30 of 100) + invoice (5000, qty 50) + payment in (2000)
    await db.pcsDespatch.create({
      data: { dcNo: DC, orderId, buyerId: buyer.id, totalPcs: DESPATCHED_PCS, status: 'despatched', finYear: 'FY26' },
    })
    await db.salesInvoice.create({
      data: { invoiceNo: INV, orderId, partyId, billAmount: BILL_AMOUNT, totalQty: INVOICED_QTY, status: 'issued', finYear: 'FY26' },
    })
    const invRow = await db.salesInvoice.findUnique({ where: { invoiceNo: INV } })
    await db.payment.create({
      data: { voucherNo: RCP, partyId, direction: 'in', amount: RECEIVED_AMT, invoiceId: invRow!.id, finYear: 'FY26' },
    })

    // jobwork (40 at party) + production (60 qty, 10 rework)
    await db.jobworkOrder.create({
      data: { dcNo: JW, jobworkerId: partyId, orderId, processType: 'washing', totalQty: JW_QTY, totalValue: 400, status: 'sent' },
    })
    await db.productionEntry.createMany({
      data: [
        { orderId, deptId, qty: 50, rate: 10, amount: 500, shiftWages: 30 },
        { orderId, deptId, qty: REWORK_QTY, rework: true, rate: 10, amount: 100, shiftWages: SHIFT_WAGES - 30 },
      ],
    })

    // cost sheet (budgeted 2500)
    await db.costSheet.create({ data: { orderId, totalCost: COST, sellingPrice: 3000 } })

    // lot + current stock rollups (lot kgs 5; pcs stock 40 @10, order-linked)
    const lot = await db.lot.create({ data: { lotNo: LOT, partyId } })
    await db.currentStock.create({ data: { itemType: 'yarn', itemId: `RGTY-${TS}`, lotId: lot.id, godownId, kgs: LOT_KGS } })
    await db.currentStock.create({ data: { itemType: 'pcs', itemId: styleId, godownId, orderId, pcs: PCS_STOCK, rate: PCS_RATE } })

    // approvals (dated 2099 so date filters isolate them) + one agent turn
    await db.approval.createMany({
      data: [
        { entity: 'po', entityId: poId, requestedBy: 'rgt-suite', status: 'approved', approvedBy: 'rgt-qa', approvedAt: new Date('2099-01-01'), createdAt: new Date('2099-01-01') },
        { entity: 'po', entityId: poId, requestedBy: 'rgt-suite', status: 'pending', createdAt: new Date('2099-01-01') },
      ],
    })
    const turn = await db.agentTurn.create({ data: { prompt: `rgt audit ${TS}`, userId: 'rgt-suite' } })
    agentTurnId = turn.id
  })

  afterAll(async () => {
    const sw = (e: unknown) => e as any
    // FK-safe, best-effort, TS-tagged identifiers only (doc-parity pattern)
    await sw(db.agentTurn.deleteMany({ where: { id: agentTurnId } }).catch(() => {}))
    await sw(db.approval.deleteMany({ where: { entityId: poId } }).catch(() => {}))
    await sw(db.payment.deleteMany({ where: { voucherNo: RCP } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { invoiceNo: INV } }).catch(() => {}))
    await sw(db.costSheet.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.productionEntry.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.jobworkOrder.deleteMany({ where: { dcNo: JW } }).catch(() => {}))
    await sw(db.stockLedger.deleteMany({ where: { godownId } }).catch(() => {}))
    await sw(db.pcsDespatch.deleteMany({ where: { dcNo: DC } }).catch(() => {}))
    await sw(db.gRN.deleteMany({ where: { grnNo: GRN } }).catch(() => {}))
    await sw(db.supplierBill.deleteMany({ where: { id: supplierBillId } }).catch(() => {}))
    await sw(db.pOLine.deleteMany({ where: { poId } }).catch(() => {}))
    await sw(db.purchaseOrder.deleteMany({ where: { poNo: PO } }).catch(() => {}))
    await sw(db.currentStock.deleteMany({ where: { godownId } }).catch(() => {}))
    await sw(db.orderLine.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { orderNo: ORDER } }).catch(() => {}))
    await sw(db.lot.deleteMany({ where: { lotNo: LOT } }).catch(() => {}))
    await sw(db.department.deleteMany({ where: { code: DEPT } }).catch(() => {}))
    await sw(db.style.deleteMany({ where: { styleNo: STYLE } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { code: PARTY } }).catch(() => {}))
    await sw(db.godown.deleteMany({ where: { code: GODOWN } }).catch(() => {}))
  })

  // ---- §5 row 3: inhand ----
  it('inhand: ordered − despatched = pending; invoiced Σ (70 / 50)', async () => {
    const res = await REGISTER_SERVICES['inhand-orders']({ q: ORDER, limit: 10, page: 1 })
    const row = res.rows.find((r) => r.orderNo === ORDER)
    expect(row).toBeTruthy()
    expect(row!.totalPcs).toBe(ORDERED_PCS)
    expect(row!.despatchedPcs).toBe(DESPATCHED_PCS)
    expect(row!.pendingPcs).toBe(ORDERED_PCS - DESPATCHED_PCS)
    expect(row!.invoicedQty).toBe(INVOICED_QTY)
    expect(row!.href).toBe(`/orders/${orderId}`)
  })

  // ---- §5 rows 1/5: daily-in-out + stock-ledger totals == ledger sums ----
  it('daily-in-out totals equal the StockLedger sums for the godown (in 12 / out 4 kgs)', async () => {
    const res = await REGISTER_SERVICES['daily-in-out']({ godown: GODOWN, limit: 50, page: 1 })
    expect(res.count).toBe(3)
    const inKgs = res.totals?.find((t) => t.label === 'In kgs')?.value
    const outKgs = res.totals?.find((t) => t.label === 'Out kgs')?.value
    expect(inKgs).toBe(IN_KGS)
    expect(outKgs).toBe(OUT_KGS)
    // the source of truth itself, recomputed
    const ledger = await db.stockLedger.findMany({ where: { godownId } })
    expect(ledger.reduce((s, l) => s + l.inKgs, 0)).toBe(IN_KGS)
    expect(ledger.reduce((s, l) => s + l.outKgs, 0)).toBe(OUT_KGS)
  })

  it('stock-ledger (same godown) exposes rate + per-uom columns', async () => {
    const res = await REGISTER_SERVICES['stock-ledger']({ godown: GODOWN, limit: 50, page: 1 })
    expect(res.count).toBe(3)
    const grnRow = res.rows.find((r) => r.docNo === GRN)
    expect(grnRow?.href).toBe(`/procurement/grn/${grnId}`) // W2 txnType→family drill
  })

  // ---- §5 row 4: party-balance ----
  it('party-balance: Σ POLine.qty − Σ GRN.totalQty = pending (19 qty / 1600 value)', async () => {
    const res = await REGISTER_SERVICES['party-balance']({ party: PARTY, limit: 10, page: 1 })
    const row = res.rows.find((r) => r.code === PARTY)
    expect(row).toBeTruthy()
    expect(row!.poCount).toBe(1)
    expect(row!.orderedQty).toBe(PO_QTY + BUDGET_PO_QTY) // 15 + the budget line
    expect(row!.receivedQty).toBe(GRN_QTY)
    expect(row!.pendingQty).toBe(PO_QTY + BUDGET_PO_QTY - GRN_QTY)
    expect(row!.pendingValue).toBe(PO_VALUE + 200 - GRN_VALUE)
  })

  // ---- §5 row 7: lots ----
  it('lots: CurrentStock rollup per lot (5 kgs)', async () => {
    const res = await REGISTER_SERVICES['lot-tracking']({ q: LOT, limit: 10, page: 1 })
    const row = res.rows.find((r) => r.lotNo === LOT)
    expect(row).toBeTruthy()
    expect(row!.kgs).toBe(LOT_KGS)
    expect(row!.party).toBe(`RGT Party ${TS}`)
  })

  // ---- §5 row 8: io-history running balance ----
  it('io-history: running balance per uom (+10, −4, +2 → bal 8 kgs)', async () => {
    const res = await REGISTER_SERVICES['io-history']({ q: PARTY, limit: 50, page: 1 })
    expect(res.count).toBe(3)
    const bals = res.rows.map((r) => r.balKgs)
    expect(bals).toEqual([10, 10 - OUT_KGS, 10 - OUT_KGS + 2])
    // chronological order
    const dates = res.rows.map((r) => new Date(r.docDate as string).getTime())
    expect(dates).toEqual([...dates].sort((a, b) => a - b))
  })

  // ---- §5 rows 6/9: stock-register variants ----
  it('pcs-stock: style × godown pcs rows with value (40 @10 = 400)', async () => {
    const res = await REGISTER_SERVICES['pcs-stock']({ q: STYLE, limit: 50, page: 1 })
    expect(res.rows.length).toBe(1)
    expect(res.rows[0].pcs).toBe(PCS_STOCK)
    expect(res.rows[0].value).toBe(PCS_STOCK * PCS_RATE)
    expect(res.rows[0].href).toBe(`/orders/${orderId}`) // order drill
  })

  it('stock-register (general variant): item × godown grouping (yarn 5 kgs)', async () => {
    const res = await REGISTER_SERVICES['stock-register']({ variant: 'general', godown: GODOWN, limit: 50, page: 1 })
    const yarnRow = res.rows.find((r) => r.itemType === 'yarn')
    expect(yarnRow).toBeTruthy()
    expect(yarnRow!.kgs).toBe(LOT_KGS)
  })

  // ---- §5 row 10: production-status ----
  it('production-status: Σ qty 60, rework 10, jobwork col 40, wages 600 (HFX-12: Σ amount)', async () => {
    const res = await REGISTER_SERVICES['production-status']({ order: ORDER, limit: 50, page: 1 })
    const row = res.rows.find((r) => r.orderNo === ORDER)
    expect(row).toBeTruthy()
    expect(row!.qty).toBe(PROD_QTY)
    expect(row!.reworkQty).toBe(REWORK_QTY)
    expect(row!.jobworkQty).toBe(JW_QTY)
    expect(row!.amount).toBe(PROD_AMT)
    expect(row!.shiftWages).toBe(PROD_AMT) // HFX-12 — the wage actually posted (shiftWages column has no writer)
  })

  // ---- §5 row 11: jobwork register ----
  it('jobwork-register: DC row with at-party footer (sent 40)', async () => {
    const res = await REGISTER_SERVICES['jobwork-register']({ status: 'sent', limit: 50, page: 1 })
    const row = res.rows.find((r) => r.dcNo === JW)
    expect(row).toBeTruthy()
    expect(row!.totalQty).toBe(JW_QTY)
    expect(row!.status).toBe('sent')
    expect(row!.href).toMatch(/^\/jobwork\/order\//)
    const atParty = res.totals?.find((t) => t.label === 'At party (page)')?.value
    expect(Number(atParty)).toBeGreaterThanOrEqual(JW_QTY)
  })

  // ---- §5 row 12: bills register ----
  it('bills-register: billed − deductions − collected = outstanding (5000 − 0 − 2000)', async () => {
    const res = await REGISTER_SERVICES['bills-register']({ party: PARTY, limit: 50, page: 1 })
    expect(res.totals?.find((t) => t.label === 'Billed')?.value).toBe(BILL_AMOUNT)
    expect(res.totals?.find((t) => t.label === 'Deductions')?.value).toBe(0)
    expect(res.totals?.find((t) => t.label === 'Collected')?.value).toBe(RECEIVED_AMT)
    expect(res.totals?.find((t) => t.label === 'Outstanding')?.value).toBe(BILL_AMOUNT - RECEIVED_AMT)
    const inv = res.rows.find((r) => r.docNo === INV)
    expect(inv?.href).toBe(`/accounts/invoice/${inv?.id?.replace('inv:', '')}`)
  })

  // ---- §5 row 13: supplier bills (M40 PAY-03 — SB rows, not GRN rows) ----
  it('supplier-bills: SB row with GRN + PO linkage (6 / 600)', async () => {
    const res = await REGISTER_SERVICES['supplier-bills']({ party: PARTY, limit: 50, page: 1 })
    const row = res.rows.find((r) => r.billNo === SB)
    expect(row).toBeTruthy()
    expect(row!.grnNo).toBe(GRN)
    expect(row!.poNo).toBe(PO)
    expect(row!.billAmount).toBe(GRN_VALUE)
    expect(row!.status).toBe('passed')
    expect(row!.matchStatus).toBe('matched')
    expect(row!.href).toBe(`/accounts/bill/${supplierBillId}`)
  })

  // ---- §5 row 14: party ledger ----
  it('party-ledger: opening + billed − received = balance (100 + 5000 − 2000)', async () => {
    const res = await REGISTER_SERVICES['party-ledger']({ party: PARTY, limit: 50, page: 1 })
    const row = res.rows.find((r) => r.code === PARTY)
    expect(row).toBeTruthy()
    expect(row!.opening).toBe(OPENING)
    expect(row!.billed).toBe(BILL_AMOUNT)
    expect(row!.received).toBe(RECEIVED_AMT)
    expect(row!.balance).toBe(OPENING + BILL_AMOUNT - RECEIVED_AMT)
  })

  // ---- §5 row 15: budget vs actual ----
  it('budget-vs-actual: budgeted 2500 vs actual 800 (PO 200 + prod 600 — the wage rides inside prodCost, HFX-12)', async () => {
    const res = await REGISTER_SERVICES['budget-vs-actual']({ order: ORDER, limit: 10, page: 1 })
    const row = res.rows.find((r) => r.orderNo === ORDER)
    expect(row).toBeTruthy()
    expect(row!.budgeted).toBe(COST)
    expect(row!.poValue).toBe(BUDGET_PO_QTY * 50)
    expect(row!.prodCost).toBe(PROD_AMT)
    expect(row!.actual).toBe(BUDGET_PO_QTY * 50 + PROD_AMT) // HFX-12 — no + shiftWages addend (double-count)
    expect(row!.variance).toBe(COST - (BUDGET_PO_QTY * 50 + PROD_AMT))
  })

  // ---- §5 row 16: approval audit ----
  it('approval-audit: 2099-dated approvals isolated by date filter; approved row drills to the PO', async () => {
    const res = await REGISTER_SERVICES['approval-audit']({
      status: 'approved', from: new Date('2098-12-31'), limit: 50, page: 1,
    })
    expect(res.count).toBe(1)
    expect(res.rows[0].entity).toBe('po')
    expect(res.rows[0].approvedBy).toBe('rgt-qa')
    expect(res.rows[0].href).toBe(`/procurement/po/${poId}`)
  })

  // ---- §5 row 17: order-status (tool door; board UI is Wave C) ----
  it('order-status: done-count from chain flags + next stage', async () => {
    const res = await queryOrderStatus({ orderNo: ORDER })
    expect(res.rows).toHaveLength(1)
    const row = res.rows[0]
    // order + production + invoice + cost flags are true in this fixture
    expect(row.stagesDone).toBe(4)
    expect(row.nextStage).toContain('Bill of Materials')
    expect(row.href).toBe(`/orders/${orderId}`)
  })

  // ---- §9 W6: recon cards (Wave C) ----
  it('poRecon: ordered − received = balance (19 − 6 = 13), GRN rows link their views', async () => {
    const r = await poRecon(poId)!
    expect(r).toBeTruthy()
    expect(r!.mathLine).toContain('ordered 19')
    expect(r!.mathLine).toContain('received 6')
    expect(r!.balance).toBe(PO_QTY + BUDGET_PO_QTY - GRN_QTY)
    expect(r!.rows).toHaveLength(1)
    expect(r!.rows[0].href).toBe(`/procurement/grn/${grnId}`)
  })

  it('invoiceRecon: billed − collected = outstanding (5000 − 2000 = 3000)', async () => {
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: INV } })
    const r = await invoiceRecon(inv!.id)!
    expect(r).toBeTruthy()
    expect(r!.balance).toBe(BILL_AMOUNT - RECEIVED_AMT)
    expect(r!.rows).toHaveLength(1)
    expect(r!.rows[0].label).toContain(RCP)
  })

  it('jobworkRecon: sent 40 at party, siblings listed', async () => {
    const jw = await db.jobworkOrder.findUnique({ where: { dcNo: JW } })
    const r = await jobworkRecon(jw!.id)!
    expect(r).toBeTruthy()
    expect(r!.balance).toBe(JW_QTY) // sent → all at party
    expect(r!.mathLine).toContain('at party (all DCs) 40')
    expect(r!.rows.some((x) => x.label.includes(JW))).toBe(true)
  })

  it('despatchRecon (order scope): despatched 30 − invoiced 50 = −20 (over-invoiced)', async () => {
    const r = await despatchRecon(orderId)!
    expect(r).toBeTruthy()
    expect(r!.balance).toBe(DESPATCHED_PCS - INVOICED_QTY)
    expect(r!.rows.some((x) => x.label.includes(DC))).toBe(true)
  })

  // ---- delegated-tool regression pins (§12: catch delegation drift) ----
  it('list_orders pin: the fixture order appears with its totals', async () => {
    const tool = getTool('list_orders')!
    const res = await tool.execute({ limit: 100 } as any)
    const row = (res.json as Record<string, unknown>[]).find((r) => r.orderNo === ORDER)
    expect(row).toBeTruthy()
    expect(row!.totalPcs).toBe(ORDERED_PCS)
  })

  it('get_stock_ledger pin: the fixture GRN ledger row appears (godown filter)', async () => {
    const tool = getTool('get_stock_ledger')!
    const res = await tool.execute({ godownCode: GODOWN, limit: 50 } as any)
    const rows = res.json as Record<string, unknown>[]
    expect(rows.length).toBe(3)
    expect(rows.some((r) => r.docNo === GRN)).toBe(true)
  })

  it('list_jobworks pin: the fixture DC appears with jobworker + order', async () => {
    const tool = getTool('list_jobworks')!
    const res = await tool.execute({ status: 'sent' } as any)
    const row = (res.json as Record<string, unknown>[]).find((r) => r.dcNo === JW)
    expect(row).toBeTruthy()
    expect(row!.jobworker).toBe(`RGT Party ${TS}`)
    expect(row!.orderNo).toBe(ORDER)
  })

  it('get_party_ledger pin: frozen shape + poBalances[] pending math', async () => {
    const tool = getTool('get_party_ledger')!
    const res = await tool.execute({ partyCode: PARTY } as any)
    const json = res.json as any
    expect(json.party.code).toBe(PARTY)
    expect(json.party.opening).toBe(OPENING)
    expect(json.totalBilled).toBe(BILL_AMOUNT)
    expect(json.totalReceived).toBe(RECEIVED_AMT)
    expect(json.poBalances).toHaveLength(1)
    expect(json.poBalances[0].pendingQty).toBe(PO_QTY + BUDGET_PO_QTY - GRN_QTY)
    expect(json.poBalances[0].pendingValue).toBe(PO_VALUE + 200 - GRN_VALUE)
  })

  it('get_budget_vs_actual pin: same numbers the register computed', async () => {
    const tool = getTool('get_budget_vs_actual')!
    const res = await tool.execute({ orderNo: ORDER } as any)
    const json = res.json as any
    expect(json.budget.total).toBe(COST)
    expect(json.actual.total).toBe(BUDGET_PO_QTY * 50 + PROD_AMT) // HFX-12
    expect(json.variance).toBe(COST - (BUDGET_PO_QTY * 50 + PROD_AMT))
  })

  it('new tool pins: inhand / production / bills / order-status shapes', async () => {
    const inhand = await getTool('list_inhand_orders')!.execute({} as any)
    const irow = (inhand.json as Record<string, unknown>[]).find((r) => r.orderNo === ORDER)
    expect(irow!.pendingPcs).toBe(ORDERED_PCS - DESPATCHED_PCS)

    const prod = await getTool('get_production_status')!.execute({ orderNo: ORDER } as any)
    const prow = (prod.json as Record<string, unknown>[]).find((r) => r.orderNo === ORDER)
    expect(prow!.qty).toBe(PROD_QTY)
    expect(prow!.reworkQty).toBe(REWORK_QTY)

    const bills = await getTool('get_bills_register')!.execute({ partyCode: PARTY } as any)
    expect(bills.text).toContain('Outstanding 3,000')

    const status = await getTool('get_order_status')!.execute({ orderNo: ORDER } as any)
    const srow = (status.json as Record<string, unknown>[])[0]
    expect(srow!.stagesDone).toBe(4)
    expect(String(srow!.nextStage)).toContain('Bill of Materials')
  })
})
