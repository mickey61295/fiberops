/**
 * SPEC-M19 §5 — material-wise stock day-books: the preset-filter contract
 * (§1-A) + the two NEW aggregation services' math (§1-B itemwise, §1-C
 * orderwise) with TS-tagged fixtures (children-first cleanup, PITFALLS #40).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { getRegisterConfig } from '../../src/lib/erp/register-configs'
import { REGISTER_SERVICES } from '../../src/lib/erp/registers'
import { parseRegisterQuery } from '../../src/lib/erp/registers/resolve'
import { queryItemwiseStock } from '../../src/lib/erp/registers/itemwise-stock'
import { queryOrderwisePcs } from '../../src/lib/erp/registers/orderwise-pcs'

const TS = Date.now()
const UOM = `RGT19-UOM-${TS}`
const YARN_CODE = `RGT19Y-${TS}`
const FABRIC_ID = `RGT19F-${TS}` // deliberately NO Fabric master → code falls back to the id
const STYLE1 = `RGT19S1-${TS}`
const STYLE2 = `RGT19S2-${TS}`
const BUYER = `RGT19B-${TS}`
const ORDER1 = `RGT19-O1-${TS}`
const ORDER2 = `RGT19-O2-${TS}`
const GODOWN_A = `RGT19GA-${TS}`
const GODOWN_B = `RGT19GB-${TS}`

// fixture numbers (assertions derive from these)
const YARN_IN = [10, 5] // kgs in
const YARN_OUT = 3 // kgs out
const FABRIC_IN_MTRS = 100
const PCS_OUT = 20
// orderwise current stock: order1 = 30@10 + 10@5 (styles 2, godown A),
// order2 = 20@10 (style1, godown B), unlinked = 5@1 (style1, godown A)
const O1_PCS = 40
const O1_VALUE = 350
const O2_PCS = 20
const UNLINKED_PCS = 5

let uomId = ''
let yarnId = ''
let style1Id = ''
let style2Id = ''
let buyerId = ''
let order1Id = ''
let order2Id = ''
let godownAId = ''
let godownBId = ''

describe('SPEC-M19 §1-A — preset-filter contract (pure parse)', () => {
  it('yarn-stock lands on its home itemType when the URL param is absent', () => {
    const config = getRegisterConfig('yarn-stock')!
    expect(config.filters.find((f) => f.key === 'itemType')?.preset).toBe('yarn')
    const q = parseRegisterQuery(config, {})
    expect(q.itemType).toBe('yarn')
  })

  it('an explicit URL param always beats the preset (shareable deep-links)', () => {
    const config = getRegisterConfig('yarn-stock')!
    const q = parseRegisterQuery(config, { itemType: 'fabric' })
    expect(q.itemType).toBe('fabric')
  })

  it('general-stock has no preset — absent param means all materials', () => {
    const config = getRegisterConfig('general-stock')!
    expect(config.filters.find((f) => f.key === 'itemType')?.preset).toBeUndefined()
    const q = parseRegisterQuery(config, {})
    expect(q.itemType).toBeUndefined()
  })

  it('the four day-books ride the EXISTING stock-ledger service (read-side reuse)', () => {
    expect(REGISTER_SERVICES['yarn-stock']).toBe(REGISTER_SERVICES['stock-ledger'])
    expect(REGISTER_SERVICES['fabric-stock']).toBe(REGISTER_SERVICES['stock-ledger'])
    expect(REGISTER_SERVICES['acc-stock']).toBe(REGISTER_SERVICES['stock-ledger'])
    expect(REGISTER_SERVICES['general-stock']).toBe(REGISTER_SERVICES['stock-ledger'])
  })

  it('fabric/acc presets bind their home types', () => {
    expect(parseRegisterQuery(getRegisterConfig('fabric-stock')!, {}).itemType).toBe('fabric')
    expect(parseRegisterQuery(getRegisterConfig('acc-stock')!, {}).itemType).toBe('accessory')
  })
})

describe('SPEC-M19 §1-B — queryItemwiseStock math (grouped per item, uom separate)', () => {
  beforeAll(async () => {
    const uom = await db.uOM.create({ data: { code: UOM, name: `RGT19 uom ${TS}` } })
    uomId = uom.id
    const yarn = await db.yarn.create({ data: { code: YARN_CODE, count: '30s', uomId } })
    yarnId = yarn.id
    const [s1, s2] = await Promise.all([
      db.style.create({ data: { styleNo: STYLE1 } }),
      db.style.create({ data: { styleNo: STYLE2 } }),
    ])
    style1Id = s1.id
    style2Id = s2.id
    const buyer = await db.buyer.create({ data: { code: BUYER, name: `RGT19 Buyer ${TS}` } })
    buyerId = buyer.id
    const [o1, o2] = await Promise.all([
      db.order.create({ data: { orderNo: ORDER1, buyerId, finYear: 'FY26' } }),
      db.order.create({ data: { orderNo: ORDER2, buyerId, finYear: 'FY26' } }),
    ])
    order1Id = o1.id
    order2Id = o2.id
    const [ga, gb] = await Promise.all([
      db.godown.create({ data: { code: GODOWN_A, name: `RGT19 GA ${TS}` } }),
      db.godown.create({ data: { code: GODOWN_B, name: `RGT19 GB ${TS}` } }),
    ])
    godownAId = ga.id
    godownBId = gb.id

    await db.stockLedger.createMany({
      data: [
        { txnType: 'opening', itemType: 'yarn', itemId: yarnId, godownId: godownAId, docNo: `RGT19-OP1-${TS}`, docDate: new Date('2026-08-01'), finYear: 'FY26', inKgs: YARN_IN[0], inBags: 2 },
        { txnType: 'purchase_grn', itemType: 'yarn', itemId: yarnId, godownId: godownAId, docNo: `RGT19-OP2-${TS}`, docDate: new Date('2026-08-02'), finYear: 'FY26', inKgs: YARN_IN[1] },
        { txnType: 'process_delivery', itemType: 'yarn', itemId: yarnId, godownId: godownAId, docNo: `RGT19-OP3-${TS}`, docDate: new Date('2026-08-03'), finYear: 'FY26', outKgs: YARN_OUT },
        { txnType: 'purchase_grn', itemType: 'fabric', itemId: FABRIC_ID, godownId: godownAId, docNo: `RGT19-OP4-${TS}`, docDate: new Date('2026-08-04'), finYear: 'FY26', inMtrs: FABRIC_IN_MTRS },
        { txnType: 'sales_delivery', itemType: 'pcs', itemId: style1Id, godownId: godownAId, docNo: `RGT19-OP5-${TS}`, docDate: new Date('2026-08-05'), finYear: 'FY26', outPcs: PCS_OUT },
      ],
    })

    await db.currentStock.createMany({
      data: [
        { itemType: 'pcs', itemId: style1Id, godownId: godownAId, orderId: order1Id, pcs: 30, rate: 10 },
        { itemType: 'pcs', itemId: style2Id, godownId: godownAId, orderId: order1Id, pcs: 10, rate: 5 },
        { itemType: 'pcs', itemId: style1Id, godownId: godownBId, orderId: order2Id, pcs: O2_PCS, rate: 10 },
        { itemType: 'pcs', itemId: style1Id, godownId: godownAId, pcs: UNLINKED_PCS, rate: 1 },
      ],
    })
  })

  afterAll(async () => {
    // children-first (PITFALLS #40): ledger + current-stock rows, then orders,
    // then masters. All TS-tagged so re-runs can never touch dev data.
    await db.stockLedger.deleteMany({ where: { godownId: { in: [godownAId, godownBId] } } })
    await db.currentStock.deleteMany({ where: { godownId: { in: [godownAId, godownBId] } } })
    await db.order.deleteMany({ where: { orderNo: { in: [ORDER1, ORDER2] } } })
    await db.style.deleteMany({ where: { id: { in: [style1Id, style2Id] } } })
    await db.buyer.deleteMany({ where: { id: buyerId } })
    await db.yarn.deleteMany({ where: { id: yarnId } })
    await db.godown.deleteMany({ where: { id: { in: [godownAId, godownBId] } } })
    await db.uOM.deleteMany({ where: { id: uomId } })
  })

  it('groups per item with per-uom sums and a txn count (never across uom columns)', async () => {
    const res = await queryItemwiseStock({ limit: 100, page: 1, godown: GODOWN_A })
    const yarnRow = res.rows.find((r) => r.itemType === 'yarn')
    expect(yarnRow).toBeTruthy()
    expect(yarnRow!.itemCode).toBe(YARN_CODE) // real Yarn master → code resolved
    expect(yarnRow!.txns).toBe(3)
    expect(yarnRow!.inKgs).toBeCloseTo(YARN_IN[0] + YARN_IN[1], 6)
    expect(yarnRow!.outKgs).toBeCloseTo(YARN_OUT, 6)
    expect(yarnRow!.inBags).toBeCloseTo(2, 6)
    expect(yarnRow!.inMtrs).toBe(0) // yarn never leaks into mtrs

    const fabricRow = res.rows.find((r) => r.itemType === 'fabric')
    expect(fabricRow).toBeTruthy()
    expect(fabricRow!.itemCode).toBe(FABRIC_ID) // no Fabric master → id fallback (PITFALLS #21 twin)
    expect(fabricRow!.inMtrs).toBeCloseTo(FABRIC_IN_MTRS, 6)

    const pcsRow = res.rows.find((r) => r.itemType === 'pcs')
    expect(pcsRow).toBeTruthy()
    expect(pcsRow!.itemCode).toBe(STYLE1) // pcs items live in the STYLE master
    expect(pcsRow!.outPcs).toBe(PCS_OUT)
  })

  it('itemType filter scopes the grouping', async () => {
    const res = await queryItemwiseStock({ limit: 100, page: 1, godown: GODOWN_A, itemType: 'yarn' })
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].itemType).toBe('yarn')
  })

  it('q filters by item code post-group; date range applies', async () => {
    const res = await queryItemwiseStock({ limit: 100, page: 1, godown: GODOWN_A, q: YARN_CODE.slice(0, 8) })
    expect(res.rows.length).toBe(1)
    expect(res.rows[0].itemCode).toBe(YARN_CODE)

    const early = await queryItemwiseStock({ limit: 100, page: 1, godown: GODOWN_A, from: new Date('2026-08-05') })
    expect(early.rows.every((r) => r.itemCode !== YARN_CODE)).toBe(true) // yarn rows all pre-cutoff
    expect(early.rows.find((r) => r.itemType === 'pcs')).toBeTruthy()
  })

  it('unknown godown is an empty result, never a 500', async () => {
    const res = await queryItemwiseStock({ limit: 100, page: 1, godown: 'NOPE-404' })
    expect(res.rows).toEqual([])
    expect(res.summary).toContain('not found')
  })

  it('orderwise groups by order: pcs/value/style counts, buyer, hrefs (godown-scoped isolation)', async () => {
    const res = await queryOrderwisePcs({ limit: 100, page: 1, godown: GODOWN_A })
    const o1 = res.rows.find((r) => r.orderNo === ORDER1)
    expect(o1).toBeTruthy()
    expect(o1!.buyer).toContain('RGT19 Buyer')
    expect(o1!.styles).toBe(2)
    expect(o1!.godowns).toBe(1)
    expect(o1!.pcs).toBe(O1_PCS)
    expect(o1!.value).toBeCloseTo(O1_VALUE, 6)
    expect(o1!.href).toBe(`/orders/${order1Id}`)

    const unlinked = res.rows.find((r) => r.orderNo === '—')
    expect(unlinked).toBeTruthy()
    expect(unlinked!.pcs).toBe(UNLINKED_PCS)
    expect(unlinked!.href).toBeNull() // no dead hrefs (SPEC-M4 acceptance #4)

    // sorted by pcs desc within scope: order1 (40) > unlinked (5)
    expect(res.rows[0].orderNo).toBe(ORDER1)

    const valueTotal = res.totals?.find((t) => t.label === 'Value')?.value
    expect(Number(valueTotal)).toBeCloseTo(O1_VALUE + UNLINKED_PCS, 0)
  })

  it('orderwise resolves the second order in its own godown', async () => {
    const res = await queryOrderwisePcs({ limit: 100, page: 1, godown: GODOWN_B })
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].orderNo).toBe(ORDER2)
    expect(res.rows[0].styles).toBe(1)
    expect(res.rows[0].pcs).toBe(O2_PCS)
    expect(res.rows[0].value).toBeCloseTo(O2_PCS * 10, 6)
    expect(res.rows[0].href).toBe(`/orders/${order2Id}`)
  })

  it('orderwise q filters by order no', async () => {
    const res = await queryOrderwisePcs({ limit: 100, page: 1, godown: GODOWN_A, q: ORDER1.slice(0, 10) })
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].orderNo).toBe(ORDER1)
  })
})
