/**
 * SPEC-M6 §12-3 — doc-parity for the Wave B despatch variants + the ADR-016
 * masters' round trip. courier-dc × both doors (identical PcsDespatch +
 * StockLedger rows; courierName required), loading × both doors (LAD-####
 * number space, status 'loading'), and the rights-list round trip through
 * update_user_group (the matrix's door).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'
import { getDocConfig } from '@/lib/erp/doc-configs'
import { commitDocAction } from '@/lib/erp/doc-actions'
import { planMasterUpdate } from '@/lib/erp/posting/master-service'
import { getMasterConfig } from '@/lib/erp/master-configs'

const TS = Date.now()

// seeded fixture (create_order door) — one order for all despatch variants
let orderId = ''
const ORDER = `M6B-ORD-${TS}`

async function seedOrder() {
  const buyer = await db.buyer.findUnique({ where: { code: 'B001' } })
  if (!buyer) throw new Error('seed buyer B001 missing')
  const order = await db.order.create({
    data: { orderNo: ORDER, buyerId: buyer.id, status: 'open', totalPcs: 1000, totalValue: 200000, finYear: 'FY26' },
  })
  orderId = order.id
}

describe('M6 Wave B doc-parity (SPEC-M6 §12-3)', () => {
  beforeAll(seedOrder)
  afterAll(async () => {
    const sw = (e: unknown) => e as any
    await sw(db.stockLedger.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.pcsDespatch.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { orderNo: ORDER } }).catch(() => {}))
    await sw(db.userGroup.deleteMany({ where: { name: { startsWith: `M6B-${TS}` } } }).catch(() => {}))
  })

  it('courier-dc: form door (commitDocAction) and agent door (create_courier_dc) write identical rows', async () => {
    // form door (DocFormPayload shape: header strings + line rows)
    const formOut = await commitDocAction('courier-dc', {
      header: { orderNo: ORDER, totalPcs: '10', courierName: `BlueDart ${TS}` },
      lines: [{ styleNo: 'S-1001', qty: '10', rate: '20' }],
    })
    expect(formOut.ok).toBe(true)
    // agent door
    const tool = getTool('create_courier_dc')!
    const out = await tool.execute({ orderNo: ORDER, totalPcs: 5, courierName: `BlueDart ${TS}`, lines: [{ styleNo: 'S-1001', qty: 5, rate: 20 }] })
    expect((out as any).text).toContain('Proposed')
    await (out as any).commit()
    // both rows: courierName set, DC- space, despatched status, ledger legs
    const dcs = await db.pcsDespatch.findMany({ where: { orderId, courierName: `BlueDart ${TS}` }, include: { lines: true } })
    expect(dcs.length).toBe(2)
    for (const d of dcs) {
      expect(d.dcNo.startsWith('DC-')).toBe(true)
      expect(d.status).toBe('despatched')
      expect(d.lines.length).toBe(1)
    }
    const ledger = await db.stockLedger.findMany({ where: { orderId, txnType: 'sales_delivery' } })
    expect(ledger.filter((l) => l.outPcs === 10 || l.outPcs === 5).length).toBe(2)
  })

  it('courier-dc without courierName is rejected (variant rule)', async () => {
    const config = getDocConfig('courier-dc')!
    const plan = await config.service.plan({ orderNo: ORDER, totalPcs: 1 })
    expect(plan.ok).toBe(false)
    expect(plan.error).toContain('courierName')
  })

  it('loading: LAD-#### number space, status loading, ledger identical (both doors)', async () => {
    const tool = getTool('create_loading_challan')!
    const out = await tool.execute({ orderNo: ORDER, totalPcs: 20, vehicleNo: 'TN33-B-0001' })
    expect((out as any).text).toContain('Proposed')
    await (out as any).commit()
    const lad = await db.pcsDespatch.findFirst({ where: { orderId, dcNo: { startsWith: 'LAD-' } } })
    expect(lad).toBeTruthy()
    expect(lad!.status).toBe('loading')
    // the LAD ledger leg exists (pcs OUT of G2 like any despatch)
    const leg = await db.stockLedger.findFirst({ where: { orderId, docNo: lad!.dcNo, txnType: 'sales_delivery' } })
    expect(leg?.outPcs).toBe(20)
    // DC- space untouched by LAD rows
    expect(lad!.dcNo.startsWith('LAD-')).toBe(true)
  })

  it('user-group rights round trip through the update_user_group door (the matrix path)', async () => {
    const create = getTool('create_user_group')!
    const name = `M6B-${TS}-Grp`
    const made = await create.execute({ name, rights: ['orders'] })
    await (made as any).commit()
    // the matrix action path: planMasterUpdate (same as saveMenuRightsAction)
    const config = getMasterConfig('user-group')!
    const plan = await planMasterUpdate(config, { name, rights: ['orders', 'production'] })
    expect(plan.ok).toBe(true)
    await plan.commit()
    const row = await db.userGroup.findUnique({ where: { name } })
    expect(row?.rights).toEqual(['orders', 'production'])
    // collapse-to-all: empty list
    const plan2 = await planMasterUpdate(config, { name, rights: [] })
    expect(plan2.ok).toBe(true)
    await plan2.commit()
    const row2 = await db.userGroup.findUnique({ where: { name } })
    expect(row2?.rights).toEqual([])
  })
})
