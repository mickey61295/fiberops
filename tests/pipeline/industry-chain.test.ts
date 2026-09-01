/**
 * E2E: full Tirupur knitwear job-work chain — order → BOM → program → cut →
 * issue-to-line → production → rejection → rework → despatch → invoice →
 * cost sheet → payment. Exercises the plan/commit tools directly (no LLM) and
 * asserts stock-ledger effects at every hop.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'

const now = Date.now()
const ORDER_NO = `E2E-${now}`
const STYLE = 'S-1001'
const BUYER = 'B001'
const YARN = 'Y-30COT'
const PARTY = 'CUS001'
const OPERATOR = 'E001'

async function call(name: string, args: any) {
  const tool = getTool(name)
  if (!tool) throw new Error(`Tool ${name} not found`)
  const res = await tool.execute(args)
  if (!res.plan) throw new Error(`${name} returned no plan: ${res.text}`)
  const committed = await res.commit!()
  return { res, committed }
}

async function g1Pcs(orderId: string) {
  const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
  const row = await db.currentStock.findFirst({
    where: { itemType: 'pcs', itemId: orderId, godownId: g1!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
  })
  return row?.pcs || 0
}

async function g2Pcs(orderId: string) {
  const g2 = await db.godown.findUnique({ where: { code: 'G2' } })
  const row = await db.currentStock.findFirst({
    where: { itemType: 'pcs', itemId: orderId, godownId: g2!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
  })
  return row?.pcs || 0
}

describe('industry chain E2E', () => {
  let orderId = ''
  let lineIssueNo = ''
  let invoiceNo = ''

  beforeAll(async () => {
    // Ensure a sewing line exists (L1 @ D4).
    const existing = await db.line.findUnique({ where: { code: 'L1' } })
    if (!existing) {
      await call('create_line', { code: 'L1', name: 'Sewing Line 1', deptCode: 'D4', capacityPcsPerHour: 200 })
    }
  })

  it('1. creates a sales order', async () => {
    const { committed } = await call('create_order', {
      orderNo: ORDER_NO,
      buyerCode: BUYER,
      styleNo: STYLE,
      deliveryDate: '2026-10-31',
      lines: [
        { colourName: 'Black', sizeName: 'M', qty: 500, rate: 210 },
        { colourName: 'Black', sizeName: 'L', qty: 500, rate: 210 },
      ],
    })
    expect(committed).toBeTruthy()
    const order = await db.order.findUnique({ where: { orderNo: ORDER_NO } })
    expect(order).toBeTruthy()
    expect(order!.totalPcs).toBe(1000)
    orderId = order!.id
  })

  it('2. creates a BOM for the style', async () => {
    const { committed } = await call('create_bom', {
      styleNo: STYLE,
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 250, rate: 320 }],
    })
    expect(committed.lines).toBe(1)
  })

  it('3. creates a knitting PROGRAM (the order→program step)', async () => {
    const { res, committed } = await call('create_program', {
      orderNo: ORDER_NO,
      stage: 'knitting',
      yarnCode: YARN,
      requiredKgs: 250,
      targetDate: '2026-09-15',
      notes: 'E2E knitting program',
    })
    expect(committed.programNo).toMatch(/^PGM-/)
    // ProgBalanceYarn projector row must exist with reqKgs.
    const pb = await db.progBalanceYarn.findFirst({ where: { orderId, reqKgs: 250 } })
    expect(pb).toBeTruthy()
    expect(res.plan!.summary).toContain('knitting')
  })

  it('4. get_program_status shows required vs actual balance', async () => {
    const tool = getTool('get_program_status')!
    const res = await tool.execute({ orderNo: ORDER_NO })
    const json: any = res.json
    expect(json.programs).toHaveLength(1)
    expect(json.programs[0].requiredKgs).toBe(250)
    expect(json.programs[0].balanceKgs).toBe(250) // nothing consumed yet
  })

  it('5. suggest_next_step points at cut after BOM+program', async () => {
    const tool = getTool('suggest_next_step')!
    const res = await tool.execute({ orderNo: ORDER_NO })
    const json: any = res.json
    expect(json.nextStep.tool).toBe('create_cut_order')
    expect(json.skeleton.orderNo).toBe(ORDER_NO)
    expect(json.state.program).toBe(true)
  })

  it('6. cut order puts cut pcs INTO G1 (ready_to_cut_in)', async () => {
    const { committed } = await call('create_cut_order', {
      orderNo: ORDER_NO,
      fabricIssued: 250,
      totalPcs: 1000,
      markerLength: 1.8,
      noOfPlies: 80,
      efficiency: 92,
    })
    expect(committed.cutNo).toMatch(/^CUT-/)
    expect(await g1Pcs(orderId)).toBe(1000)
    const ledger = await db.stockLedger.findFirst({ where: { orderId, txnType: 'ready_to_cut_in' } })
    expect(ledger?.inPcs).toBe(1000)
  })

  it('7. issue_to_line moves pcs OUT of G1 to the sewing line', async () => {
    const { committed } = await call('issue_to_line', {
      orderNo: ORDER_NO,
      lineCode: 'L1',
      qty: 1000,
    })
    expect(committed.issueNo).toMatch(/^LI-/)
    lineIssueNo = committed.issueNo
    expect(await g1Pcs(orderId)).toBe(0)
    const ledger = await db.stockLedger.findFirst({ where: { orderId, txnType: 'ready_to_cut_out' } })
    expect(ledger?.outPcs).toBe(1000)
    const li = await db.lineIssue.findUnique({ where: { issueNo: lineIssueNo } })
    expect(li?.status).toBe('issued')
  })

  it('8. production entry puts good output INTO G2 (production_in)', async () => {
    const { committed } = await call('post_production_entry', {
      orderNo: ORDER_NO,
      deptCode: 'D4',
      prodDate: '2026-09-20',
      bundleNo: 'B1',
      operatorCode: OPERATOR,
      qty: 950,
      rate: 12,
    })
    expect(committed.id).toBeTruthy()
    expect(await g2Pcs(orderId)).toBe(950)
    const ledger = await db.stockLedger.findFirst({ where: { orderId, txnType: 'production_in' } })
    expect(ledger?.inPcs).toBe(950)
  })

  it('9. rejection (scrap) moves pcs OUT of G2', async () => {
    const { committed } = await call('post_rejection', {
      orderNo: ORDER_NO,
      qty: 20,
      rejType: 'stitch_fault',
      action: 'scrap',
      deptCode: 'D4',
    })
    expect(committed.rejNo).toMatch(/^REJ-/)
    expect(await g2Pcs(orderId)).toBe(930)
    const ledger = await db.stockLedger.findFirst({ where: { orderId, txnType: 'rejection_out' } })
    expect(ledger?.outPcs).toBe(20)
  })

  it('10. rework entry is document-only (no stock move)', async () => {
    const { committed } = await call('post_rework', {
      orderNo: ORDER_NO,
      deptCode: 'D4',
      qty: 10,
      bundleNo: 'RW1',
      operatorCode: OPERATOR,
      rate: 8,
    })
    expect(committed.id).toBeTruthy()
    expect(await g2Pcs(orderId)).toBe(930) // unchanged
    const rework = await db.productionEntry.findFirst({ where: { orderId, rework: true } })
    expect(rework?.qty).toBe(10)
  })

  it('11. pcs despatch moves pcs OUT of G2 (sales_delivery)', async () => {
    const { committed } = await call('create_pcs_despatch', {
      orderNo: ORDER_NO,
      totalPcs: 930,
      vehicleNo: 'TN33BX1234',
      lines: [{ styleNo: STYLE, qty: 930, rate: 210 }],
    })
    expect(committed.dcNo).toMatch(/^DC-/)
    expect(await g2Pcs(orderId)).toBe(0)
    const ledger = await db.stockLedger.findFirst({ where: { orderId, txnType: 'sales_delivery' } })
    expect(ledger?.outPcs).toBe(930)
  })

  it('12. sales invoice books the despatch', async () => {
    await call('create_sales_invoice', {
      orderNo: ORDER_NO,
      partyCode: PARTY,
      billType: 'sales',
      totalQty: 930,
      taxableValue: 195300,
      gstRate: 5,
      gstType: 'cgst_sgst',
    })
    const inv = await db.salesInvoice.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } })
    expect(inv).toBeTruthy()
    expect(inv!.billAmount).toBeCloseTo(195300 * 1.05, 2)
    invoiceNo = inv!.invoiceNo
  })

  it('13. cost sheet books budget vs actual', async () => {
    const { committed } = await call('create_cost_sheet', {
      orderNo: ORDER_NO,
      fabricCost: 80000,
      trimCost: 12000,
      cmCost: 11400,
      washingCost: 5000,
      packingCost: 4000,
      overheads: 6000,
      sellingPrice: 195300,
    })
    expect(committed).toBeTruthy()
  })

  it('14. record_payment collects and settles the invoice via allocations (M40 PAY-01)', async () => {
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo } })
    const { committed } = await call('record_payment', {
      partyCode: PARTY,
      amount: inv!.billAmount,
      direction: 'in',
      invoiceNo,
      orderNo: ORDER_NO,
      mode: 'bank',
      reference: 'UTR-E2E-001',
    })
    expect(committed.voucherNo).toMatch(/^RCP-/)
    expect(committed.allocated).toBe(inv!.billAmount)
    expect(committed.onAccount).toBe(0)
    const after = await db.salesInvoice.findUnique({ where: { invoiceNo } })
    expect(after!.status).toBe('paid')
    // the allocation row is the settlement truth
    const pay = await db.payment.findUnique({ where: { voucherNo: committed.voucherNo } })
    const alloc = await db.paymentAllocation.findFirst({ where: { paymentId: pay!.id, reversedAt: null } })
    expect(alloc?.invoiceId).toBe(inv!.id)
    expect(alloc?.amount).toBe(inv!.billAmount)
    // Journal voucher written
    const party = await db.party.findUnique({ where: { code: PARTY } })
    const jv = await db.journal.findFirst({ where: { partyId: party!.id, voucherType: 'receipt' } })
    expect(jv).toBeTruthy()
  })

  it('15. suggest_next_step reports the pipeline COMPLETE', async () => {
    const tool = getTool('suggest_next_step')!
    const res = await tool.execute({ orderNo: ORDER_NO })
    const json: any = res.json
    expect(json.pipelineComplete).toBe(true)
    expect(json.producedPct).toBe(95) // 950 good pcs of 1000 ordered
  })
})
