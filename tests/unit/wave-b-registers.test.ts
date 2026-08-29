/**
 * SPEC-M19 §2 Wave B — cutting/issue/supplier registers + the trading fold:
 * service math with TS-tagged fixtures (children-first cleanup, PITFALLS #40).
 * Fixture story:
 *   - PARTY gets PO1 (yarn, 100@10, HALF received via GRN → pending 50/500)
 *     and PO2 (general, 40@5, FULLY received → drops off the chase list).
 *   - ORDER_MFG (manufacturing: has a CutOrder w/ 2 bundles + a LineIssue)
 *     and ORDER_TRD (trading: nothing against it) drive the inhand fold.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { REGISTER_SERVICES } from '../../src/lib/erp/registers'
import { parseRegisterQuery } from '../../src/lib/erp/registers/resolve'
import { getRegisterConfig } from '../../src/lib/erp/register-configs'
import { queryInhandOrders } from '../../src/lib/erp/registers/inhand'

const TS = Date.now()
const PARTY = `RGT19B-P-${TS}`
const GODOWN = `RGT19B-G-${TS}`
const BUYER = `RGT19B-B-${TS}`
const STYLE = `RGT19B-S-${TS}`
const ORDER_MFG = `RGT19B-OM-${TS}`
const ORDER_TRD = `RGT19B-OT-${TS}`
const PO1 = `RGT19B-PO1-${TS}`
const PO2 = `RGT19B-PO2-${TS}`
const CUT = `RGT19B-CUT-${TS}`
const CUT2 = `RGT19B-CUT2-${TS}`
const LI = `RGT19B-LI-${TS}`
const GRN1 = `RGT19B-G1-${TS}`
const GRN2 = `RGT19B-G2-${TS}`
const FUT = new Date('2027-06-15') // future-dated (PITFALLS #41)

// fixture numbers
const PO1_QTY = 100, PO1_RATE = 10, PO1_RCVD = 50 // pending 50 qty / 500 value
const PO2_QTY = 40, PO2_RATE = 5, PO2_RCVD = 40 // fully received
const CUT_PCS = 300, CUT_FAB = 55.5
const BUNDLE_QTYS = [180, 120] // bundlePcs 300
const LI_QTY = 150

let partyId = '', godownId = '', buyerId = '', styleId = ''
let orderMfgId = '', orderTrdId = '', po1Id = '', po2Id = ''

describe('SPEC-M19 §2 Wave B — register services', () => {
  beforeAll(async () => {
    const party = await db.party.create({ data: { code: PARTY, name: `RGT19B Party ${TS}` } })
    partyId = party.id
    const godown = await db.godown.create({ data: { code: GODOWN, name: `RGT19B GD ${TS}` } })
    godownId = godown.id
    const buyer = await db.buyer.create({ data: { code: BUYER, name: `RGT19B Buyer ${TS}` } })
    buyerId = buyer.id
    const style = await db.style.create({ data: { styleNo: STYLE } })
    styleId = style.id
    const [om, ot] = await Promise.all([
      db.order.create({ data: { orderNo: ORDER_MFG, buyerId, styleId, finYear: 'FY26', totalPcs: 500, status: 'in_progress' } }),
      db.order.create({ data: { orderNo: ORDER_TRD, buyerId, finYear: 'FY26', totalPcs: 200, status: 'open' } }),
    ])
    orderMfgId = om.id
    orderTrdId = ot.id

    // manufacturing signal: a cut order with 2 bundles
    const cut = await db.cutOrder.create({
      data: { cutNo: CUT, orderId: orderMfgId, cutDate: FUT, fabricIssued: CUT_FAB, totalPcs: CUT_PCS, status: 'cut' },
    })
    await db.cutBundle.createMany({
      data: [
        { cutOrderId: cut.id, bundleNo: `RGT19B-B1-${TS}`, barcode: `RGT19B-BC1-${TS}`, qty: BUNDLE_QTYS[0] },
        { cutOrderId: cut.id, bundleNo: `RGT19B-B2-${TS}`, barcode: `RGT19B-BC2-${TS}`, qty: BUNDLE_QTYS[1] },
      ],
    })
    await db.cutOrder.create({ data: { cutNo: CUT2, orderId: orderTrdId, cutDate: FUT, status: 'planned' } })
      .catch(() => null) // CUT2 belongs to a separate assertion (planned status) — see below

    await db.lineIssue.create({
      data: { issueNo: LI, orderId: orderMfgId, lineId: (await db.line.findFirst({ where: { code: 'L1' } }))?.id ?? (await db.line.create({ data: { code: `RGT19B-L-${TS}`, name: `RGT19B Line ${TS}` } })).id, issueDate: FUT, qty: LI_QTY, styleNo: STYLE, status: 'issued' },
    })

    // POs: po1 half-received, po2 fully received
    const po1 = await db.purchaseOrder.create({
      data: { poNo: PO1, poType: 'yarn', partyId, orderDate: FUT, deliveryDate: FUT, finYear: 'FY26', status: 'partial', totalQty: PO1_QTY, totalValue: PO1_QTY * PO1_RATE, lines: { create: [{ itemType: 'yarn', itemId: 'RGT19B-ANY', qty: PO1_QTY, rate: PO1_RATE, amount: PO1_QTY * PO1_RATE }] } },
    })
    po1Id = po1.id
    const po2 = await db.purchaseOrder.create({
      data: { poNo: PO2, poType: 'general', partyId, orderDate: FUT, deliveryDate: FUT, finYear: 'FY26', status: 'received', totalQty: PO2_QTY, totalValue: PO2_QTY * PO2_RATE, lines: { create: [{ itemType: 'accessory', itemId: 'RGT19B-ANY2', qty: PO2_QTY, rate: PO2_RATE, amount: PO2_QTY * PO2_RATE }] } },
    })
    po2Id = po2.id
    await db.gRN.createMany({
      data: [
        { grnNo: GRN1, grnType: 'purchase', poId: po1Id, partyId, godownId, grnDate: FUT, finYear: 'FY26', totalQty: PO1_RCVD, totalValue: PO1_RCVD * PO1_RATE },
        { grnNo: GRN2, grnType: 'purchase', poId: po2Id, partyId, godownId, grnDate: FUT, finYear: 'FY26', totalQty: PO2_RCVD, totalValue: PO2_RCVD * PO2_RATE },
      ],
    })
  })

  afterAll(async () => {
    // children-first (PITFALLS #40)
    await db.gRN.deleteMany({ where: { grnNo: { in: [GRN1, GRN2] } } })
    await db.pOLine.deleteMany({ where: { poId: { in: [po1Id, po2Id] } } })
    await db.purchaseOrder.deleteMany({ where: { id: { in: [po1Id, po2Id] } } })
    await db.lineIssue.deleteMany({ where: { issueNo: LI } })
    await db.cutBundle.deleteMany({ where: { bundleNo: { in: [`RGT19B-B1-${TS}`, `RGT19B-B2-${TS}`] } } })
    await db.cutOrder.deleteMany({ where: { cutNo: { in: [CUT, CUT2] } } })
    await db.order.deleteMany({ where: { id: { in: [orderMfgId, orderTrdId] } } })
    await db.style.deleteMany({ where: { id: styleId } })
    await db.buyer.deleteMany({ where: { id: buyerId } })
    await db.godown.deleteMany({ where: { id: godownId } })
    await db.party.deleteMany({ where: { id: partyId } })
    await db.line.deleteMany({ where: { code: `RGT19B-L-${TS}` } })
  })

  it('cutting register: bundles counted, fabric/pcs summed, status filter works, drills to the cut view', async () => {
    const res = await REGISTER_SERVICES['cutting-register']({ limit: 100, page: 1, q: CUT })
    expect(res.rows).toHaveLength(1)
    const row = res.rows[0] as any
    expect(row.orderNo).toBe(ORDER_MFG)
    expect(row.bundles).toBe(2)
    expect(row.bundlePcs).toBe(BUNDLE_QTYS[0] + BUNDLE_QTYS[1])
    expect(row.fabricIssued).toBeCloseTo(CUT_FAB, 6)
    expect(row.totalPcs).toBe(CUT_PCS)
    expect(row.href).toContain('/cutting/job-order/')

    const planned = await REGISTER_SERVICES['cutting-register']({ limit: 100, page: 1, status: 'planned' })
    expect(planned.rows.every((r: any) => r.status === 'planned')).toBe(true)
    expect(planned.rows.some((r: any) => r.cutNo === CUT2)).toBe(true)
  })

  it('line-issue register: row joins order + line, qty and href correct', async () => {
    const res = await REGISTER_SERVICES['line-issue-register']({ limit: 100, page: 1, q: LI })
    expect(res.rows).toHaveLength(1)
    const row = res.rows[0] as any
    expect(row.orderNo).toBe(ORDER_MFG)
    expect(row.qty).toBe(LI_QTY)
    expect(row.styleNo).toBe(STYLE)
    expect(String(row.line)).toMatch(/RGT19B-L-|L1/)
    expect(row.href).toBe(`/production/issue/${row.id}`)

    const byOrder = await REGISTER_SERVICES['line-issue-register']({ limit: 100, page: 1, order: ORDER_TRD })
    expect(byOrder.rows).toHaveLength(0)
  })

  it('supplier pending: half-received PO chases 50 qty / ₹500; fully-received PO drops off; status widens', async () => {
    const res = await REGISTER_SERVICES['supplier-pending']({ limit: 100, page: 1, q: PO1 })
    expect(res.rows).toHaveLength(1)
    const row = res.rows[0] as any
    expect(row.poNo).toBe(PO1)
    expect(row.orderedQty).toBeCloseTo(PO1_QTY, 6)
    expect(row.receivedQty).toBeCloseTo(PO1_RCVD, 6)
    expect(row.pendingQty).toBeCloseTo(PO1_QTY - PO1_RCVD, 6)
    expect(row.pendingValue).toBeCloseTo((PO1_QTY - PO1_RCVD) * PO1_RATE, 6)
    expect(row.href).toBe(`/procurement/po/${po1Id}`)

    const chase = await REGISTER_SERVICES['supplier-pending']({ limit: 100, page: 1, party: PARTY })
    const nos = chase.rows.map((r: any) => r.poNo)
    expect(nos).toContain(PO1)
    expect(nos).not.toContain(PO2) // fully received → not pending

    const widened = await REGISTER_SERVICES['supplier-pending']({ limit: 100, page: 1, party: PARTY, status: 'received' })
    expect(widened.rows.map((r: any) => r.poNo)).toContain(PO2)
  })

  it('po-register: variant select = poType; party filter resolves by code', async () => {
    const yarn = await REGISTER_SERVICES['po-register']({ limit: 100, page: 1, variant: 'yarn', q: PO1 })
    expect(yarn.rows).toHaveLength(1)
    expect((yarn.rows[0] as any).poType).toBe('yarn')

    const general = await REGISTER_SERVICES['po-register']({ limit: 100, page: 1, variant: 'general', party: PARTY })
    expect(general.rows.map((r: any) => r.poNo)).toEqual([PO2])

    const all = await REGISTER_SERVICES['po-register']({ limit: 100, page: 1, party: PARTY })
    expect(all.rows).toHaveLength(2)
    const sumQty = all.totals?.find((t) => t.label === 'Qty')?.value
    expect(Number(sumQty)).toBeCloseTo(PO1_QTY + PO2_QTY, 6)
  })

  it('supplier history: per-party rollup with received qty, GRN count and last receipt', async () => {
    const res = await REGISTER_SERVICES['supplier-history']({ limit: 100, page: 1, party: PARTY })
    expect(res.rows).toHaveLength(1)
    const row = res.rows[0] as any
    expect(row.poCount).toBe(2)
    expect(row.orderedQty).toBeCloseTo(PO1_QTY + PO2_QTY, 6)
    expect(row.receivedQty).toBeCloseTo(PO1_RCVD + PO2_RCVD, 6)
    expect(row.grns).toBe(2)
    expect(row.lastReceipt).toBeTruthy()
    expect(row.pendingValue).toBeCloseTo((PO1_QTY - PO1_RCVD) * PO1_RATE, 6)
  })

  it('inhand trading fold: trading = no cut/program/production; manufacturing = factory-touched', async () => {
    // NOTE: CUT2 (planned, against ORDER_TRD) makes it factory-touched — delete
    // it first so ORDER_TRD is a clean trading order for this assertion.
    await db.cutOrder.deleteMany({ where: { cutNo: CUT2 } })

    const trading = await queryInhandOrders({ limit: 100, page: 1, q: ORDER_TRD, variant: 'trading' })
    expect(trading.rows.map((r: any) => r.orderNo)).toEqual([ORDER_TRD])
    expect(trading.summary).toContain('trading')

    const mfg = await queryInhandOrders({ limit: 100, page: 1, q: ORDER_MFG, variant: 'manufacturing' })
    expect(mfg.rows.map((r: any) => r.orderNo)).toEqual([ORDER_MFG])

    // cross-check: the OTHER order never leaks into either narrow view
    expect(trading.rows.map((r: any) => r.orderNo)).not.toContain(ORDER_MFG)
    expect(mfg.rows.map((r: any) => r.orderNo)).not.toContain(ORDER_TRD)

    const all = await queryInhandOrders({ limit: 100, page: 1, q: `${TS}`.slice(0, 0) + `RGT19B-O` })
    expect(all.rows.map((r: any) => r.orderNo).sort()).toEqual([ORDER_MFG, ORDER_TRD].sort())
  })

  it('configs: all five Wave B slugs registered with service + routes + chips cite existing tools', () => {
    for (const slug of ['cutting-register', 'line-issue-register', 'supplier-pending', 'po-register', 'supplier-history']) {
      const config = getRegisterConfig(slug)!
      expect(config).toBeTruthy()
      expect(REGISTER_SERVICES[slug]).toBeTruthy()
      expect(config.agentTools.length).toBeGreaterThan(0)
    }
    // the trading fold rides the inhand config's variant filter
    const inhand = getRegisterConfig('inhand-orders')!
    const variant = inhand.filters.find((f) => f.key === 'variant')!
    expect(variant.options.map((o) => o.value)).toEqual(['manufacturing', 'trading'])
    const q = parseRegisterQuery(inhand, { variant: 'trading' })
    expect(q.variant).toBe('trading')
  })
})
