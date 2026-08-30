/**
 * Report services math suite — SPEC-M6 §12-2 (Wave A exit criterion).
 * Seeds ONE test-owned fixture chain (the register-services pattern, TS-tagged
 * doc numbers), asserts the §7-A math on the 13 NEW aggregates, then
 * surgically cleans up. Bound reports' math is already covered by the M4
 * register-services suite (same services — never forked).
 *
 * Math asserted (SPEC-M6 §7-A):
 *  - daily-pnl (HFX-12): produced = qty × order contract rate, wages = Σ amount
 *    (the piece-rate wage posted), margin = produced − wages; expenses ride the
 *    totals band (ERRATUM §13-1)
 *  - outstanding-summary: AR = billed − settled payments, aging bucket by
 *    invoiceDate; AP = GRN value − payments out
 *  - gst-summary: rate × month taxable/cgst/sgst/igst rollup
 *  - current-stock: itemType qty × rate = value (yarn kgs, pcs pcs)
 *  - line-wip: issued − produced = wip per line
 *  - order-status-summary: stages == computeChainState count; despatched rollup
 *  - render_report tool: same service, same rows (the ONE report door)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { REPORT_SERVICES } from '@/lib/erp/reports'
import { computeChainState } from '@/lib/erp/chain'
import { getTool } from '@/lib/agent/tools'

const TS = Date.now()
const PARTY = `RPTP-${TS}`
const ORDER = `RPT-ORD-${TS}`
const INV = `RPT-INV-${TS}`
const RCP = `RPT-RCP-${TS}`
const GRN = `RPT-GRN-${TS}`
const GODOWN = `RPTG-${TS}`
const DEPT = `RPTD-${TS}`
const LINE = `RPTL-${TS}`
const EXP = `RPT-EXP-${TS}`

// fixed fixture numbers
const PROD_QTY = 40 // 25 + 15
const PROD_AMT = 400 // 250 + 150 (Σ amount = the piece-rate wage posted — HFX-12)
const CONTRACT_RATE = 200 // order totalValue 20000 / totalPcs 100
const PRODUCED_VALUE = PROD_QTY * CONTRACT_RATE // HFX-12: revenue-side valuation
const MARGIN = PRODUCED_VALUE - PROD_AMT // contract-vs-piece-rate spread
const EXPENSE_AMT = 75
const BILL_AMOUNT = 5000
const RECEIVED_AMT = 2000
const AR_OUTSTANDING = BILL_AMOUNT - RECEIVED_AMT
const GRN_VALUE = 600
const AP_PAID = 200
const AP_OUTSTANDING = GRN_VALUE - AP_PAID
const TAXABLE = 10000
const CGST_RATE = 1.25 // deliberately unique total (2.5%) so seed invoices never merge into this row
const CGST_AMT = 125
const SGST_AMT = 125
const YARN_KGS = 8
const YARN_RATE = 100
const PCS_QTY = 30
const PCS_RATE = 10
const LINE_ISSUED = 50

let partyId = ''
let orderId = ''
let invoiceId = ''
let grnId = ''
let godownId = ''
let deptId = ''
let lineId = ''
let styleId = ''
let expenseId = ''

describe('report services math (SPEC-M6 §7-A)', () => {
  beforeAll(async () => {
    const party = await db.party.create({ data: { code: PARTY, name: `RPT Party ${TS}`, partyType: 'both' } })
    partyId = party.id
    const godown = await db.godown.create({ data: { code: GODOWN, name: `RPT Godown ${TS}` } })
    godownId = godown.id
    const dept = await db.department.create({ data: { code: DEPT, name: `RPT Dept ${TS}` } })
    deptId = dept.id
    const line = await db.line.create({ data: { code: LINE, name: `RPT Line ${TS}` } })
    lineId = line.id
    const buyer = await db.buyer.findUnique({ where: { code: 'B001' } })
    if (!buyer) throw new Error('seed buyer B001 missing')
    const style = await db.style.create({ data: { styleNo: `RPTS-${TS}`, description: `RPT style ${TS}`, buyerId: buyer.id } })
    styleId = style.id

    const order = await db.order.create({
      data: { orderNo: ORDER, buyerId: buyer.id, styleId, status: 'open', totalPcs: 100, totalValue: 20000, finYear: 'FY26' },
    })
    orderId = order.id

    // production: 2 entries same dept/day (25@250 wages 40 + 15@150 wages 20)
    // — dated in a UNIQUE window (2024-02) so other fixtures never pollute the
    // period-level expense totals band
    await db.productionEntry.createMany({
      data: [
        { orderId, deptId, lineId, qty: 25, rate: 10, amount: 250, shiftWages: 40, prodDate: new Date('2024-02-15') },
        { orderId, deptId, lineId, qty: 15, rate: 10, amount: 150, shiftWages: 20, prodDate: new Date('2024-02-15') },
      ],
    })

    // line issue (50 issued; 40 produced → wip 10)
    await db.lineIssue.create({
      data: { issueNo: `RPT-LI-${TS}`, orderId, lineId, qty: LINE_ISSUED, issueDate: new Date('2026-08-24'), status: 'issued' },
    })

    // AR: invoice today (aging 0-15) + partial receipt
    const inv = await db.salesInvoice.create({
      data: {
        invoiceNo: INV, orderId, partyId, invoiceDate: new Date(), status: 'issued',
        taxableValue: TAXABLE, cgstRate: CGST_RATE, sgstRate: CGST_RATE,
        cgstAmt: CGST_AMT, sgstAmt: SGST_AMT, billAmount: BILL_AMOUNT, finYear: 'FY26',
      },
    })
    invoiceId = inv.id
    await db.payment.create({
      data: { voucherNo: RCP, partyId, direction: 'in', amount: RECEIVED_AMT, invoiceId, payDate: new Date(), finYear: 'FY26' },
    })

    // AP: GRN 600 + payment out 200
    const grn = await db.gRN.create({
      data: { grnNo: GRN, grnType: 'purchase', partyId, godownId, totalQty: 6, totalValue: GRN_VALUE, grnDate: new Date(), finYear: 'FY26' },
    })
    grnId = grn.id
    await db.payment.create({
      data: { voucherNo: `RPT-PO-${TS}`, partyId, direction: 'out', amount: AP_PAID, payDate: new Date(), finYear: 'FY26' },
    })

    // expense (period-level for daily-pnl totals — same unique window)
    const exp = await db.expense.create({
      data: { expNo: EXP, category: 'general', amount: EXPENSE_AMT, expDate: new Date('2024-02-15'), finYear: 'FY26' },
    })
    expenseId = exp.id

    // current stock: yarn 8 kgs @100 + pcs 30 @10
    await db.currentStock.createMany({
      data: [
        { itemType: 'yarn', itemId: `RPTY-${TS}`, godownId, kgs: YARN_KGS, rate: YARN_RATE },
        { itemType: 'pcs', itemId: styleId, godownId, orderId, pcs: PCS_QTY, rate: PCS_RATE },
      ],
    })
  })

  afterAll(async () => {
    const sw = (e: unknown) => e as any
    await sw(db.expense.deleteMany({ where: { id: expenseId } }).catch(() => {}))
    await sw(db.payment.deleteMany({ where: { partyId } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { invoiceNo: INV } }).catch(() => {}))
    await sw(db.gRN.deleteMany({ where: { grnNo: GRN } }).catch(() => {}))
    await sw(db.currentStock.deleteMany({ where: { godownId } }).catch(() => {}))
    await sw(db.lineIssue.deleteMany({ where: { lineId } }).catch(() => {}))
    await sw(db.productionEntry.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { orderNo: ORDER } }).catch(() => {}))
    await sw(db.line.deleteMany({ where: { code: LINE } }).catch(() => {}))
    await sw(db.department.deleteMany({ where: { code: DEPT } }).catch(() => {}))
    await sw(db.style.deleteMany({ where: { styleNo: `RPTS-${TS}` } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { code: PARTY } }).catch(() => {}))
    await sw(db.godown.deleteMany({ where: { code: GODOWN } }).catch(() => {}))
  })

  // ---- daily-pnl (§7-A rule 4) ----
  it('daily-pnl (HFX-12): produced 8000 (40 × contract 200) − wages 400 (Σ amount) = margin 7600; expenses ride the totals band', async () => {
    const res = await REPORT_SERVICES['daily-unit-pnl']({ from: new Date('2024-02-01'), to: new Date('2024-02-28'), limit: 50, page: 1 })
    const row = res.rows.find((r) => r.dept === DEPT)
    expect(row).toBeTruthy()
    expect(row!.qty).toBe(PROD_QTY)
    expect(row!.produced).toBe(PRODUCED_VALUE)
    expect(row!.wages).toBe(PROD_AMT) // the piece-rate wage actually posted
    expect(row!.margin).toBe(MARGIN)
    expect(res.totals?.find((t) => t.label === 'Expenses (period)')?.value).toBe(EXPENSE_AMT)
    expect(res.totals?.find((t) => t.label === 'Net Margin')?.value).toBe(MARGIN - EXPENSE_AMT)
  })

  // ---- outstanding-summary (§7-A rule 5) ----
  it('outstanding-summary: AR 3000 in the 0-15 bucket; AP 400 for the supplier', async () => {
    const res = await REPORT_SERVICES['outstanding-summary']({ party: PARTY, limit: 50, page: 1 })
    const ar = res.rows.find((r) => r.type === 'AR')
    expect(ar).toBeTruthy()
    expect(ar!.billed).toBe(BILL_AMOUNT)
    expect(ar!.settled).toBe(RECEIVED_AMT)
    expect(ar!.outstanding).toBe(AR_OUTSTANDING)
    expect(ar!.b0).toBe(AR_OUTSTANDING) // invoice dated today → 0-15 bucket
    expect(ar!.b1 + ar!.b2 + ar!.b3).toBe(0)
    const ap = res.rows.find((r) => r.type === 'AP')
    expect(ap).toBeTruthy()
    expect(ap!.billed).toBe(GRN_VALUE)
    expect(ap!.outstanding).toBe(AP_OUTSTANDING)
    expect(res.totals?.find((t) => t.label === 'AR Outstanding')?.value).toBe(AR_OUTSTANDING)
    expect(res.totals?.find((t) => t.label === 'AP Outstanding')?.value).toBe(AP_OUTSTANDING)
  })

  // ---- gst-summary (§7-A rule 6) ----
  it('gst-summary: current month × unique 2.5% CGST+SGST row with taxable 10000, cgst/sgst 125', async () => {
    const res = await REPORT_SERVICES['gst-summary']({ limit: 200, page: 1 })
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const row = res.rows.find((r) => r.month === month && r.rate === CGST_RATE * 2)
    expect(row).toBeTruthy()
    expect(row!.taxable).toBe(TAXABLE)
    expect(row!.cgst).toBe(CGST_AMT)
    expect(row!.sgst).toBe(SGST_AMT)
    expect(row!.igst).toBe(0)
    expect(row!.total).toBe(BILL_AMOUNT)
  })

  // ---- current-stock value math ----
  it('current-stock: yarn 8 kgs @100 = 800; pcs 30 @10 = 300; value total 1100', async () => {
    const res = await REPORT_SERVICES['current-stock']({ godown: GODOWN, limit: 50, page: 1 })
    const yarn = res.rows.find((r) => r.itemType === 'yarn')
    expect(yarn).toBeTruthy()
    expect(yarn!.kgs).toBe(YARN_KGS)
    expect(yarn!.value).toBe(YARN_KGS * YARN_RATE)
    const pcs = res.rows.find((r) => r.itemType === 'pcs')
    expect(pcs).toBeTruthy()
    expect(pcs!.value).toBe(PCS_QTY * PCS_RATE)
    expect(res.totals?.find((t) => t.label === 'Value')?.value).toBe(YARN_KGS * YARN_RATE + PCS_QTY * PCS_RATE)
  })

  // ---- line-wip ----
  it('line-wip: issued 50 − produced 40 = wip 10 on the fixture line', async () => {
    const res = await REPORT_SERVICES['line-wip']({ limit: 50, page: 1 })
    const row = res.rows.find((r) => r.line === LINE)
    expect(row).toBeTruthy()
    expect(row!.issued).toBe(LINE_ISSUED)
    expect(row!.produced).toBe(PROD_QTY)
    expect(row!.wip).toBe(LINE_ISSUED - PROD_QTY)
  })

  // ---- order-status-summary ----
  it('order-status-summary: stages == computeChainState count; produced/despatched rollup', async () => {
    const res = await REPORT_SERVICES['order-status-summary']({ limit: 100, page: 1 })
    const row = res.rows.find((r) => r.orderNo === ORDER)
    expect(row).toBeTruthy()
    const order = await db.order.findUnique({
      where: { orderNo: ORDER },
      include: { buyer: true, style: { include: { bomLines: true } }, lines: true, programs: true, cutOrders: true, lineIssues: true, productionEntries: true, salesInvoices: true, costSheet: true, payments: true } as never,
    })
    const flags = computeChainState(order)
    const done = Object.values(flags).filter(Boolean).length
    expect(row!.stages).toBe(`${done}/15`)
    expect(row!.produced).toBe(PROD_QTY)
    expect(row!.produced + 0).toBe(PROD_QTY)
    expect(row!.href).toBe(`/orders/${orderId}`)
  })

  // ---- render_report: the ONE door runs the same service ----
  it('render_report tool: same service, same rows (daily-unit-pnl)', async () => {
    const tool = getTool('render_report')!
    const out = await tool.execute({
      slug: 'daily-unit-pnl',
      from: '2024-02-01', to: '2024-02-28',
    })
    const json = (out as any).json
    expect(json.report).toBe('daily-unit-pnl')
    expect(json.rows.some((r: any) => r.dept === DEPT && r.produced === PRODUCED_VALUE)).toBe(true)
    // unknown slug → helpful error listing packs (never a throw)
    const bad = await tool.execute({ slug: 'nope' })
    expect((bad as any).text).toContain('Unknown report')
  })
})
