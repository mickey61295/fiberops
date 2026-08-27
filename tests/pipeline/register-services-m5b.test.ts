/**
 * SPEC-M5 §12-5 — M5 Wave B register math (the M4 register-services suite
 * pattern): production-wages (Frm_ProductionWages family) —
 *   - group by OPERATOR across orders: Σ qty, Σ amount (qty × rate), avg
 *     effective rate, entry + order counts
 *   - filters: date range (prodDate), order, dept (q key)
 *   - W2: rows drill to the employee master (/masters/employee)
 *   - get_production_wages tool delegates to the same service (read twin)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { getTool } from '@/lib/agent/tools'

const TS = Date.now()
const BUYER = 'B001'
const OP1 = 'E001'
const OP2 = 'E002'

const ordNo = `M5W-O-${TS}`
const ordNo2 = `M5W-O2-${TS}`
const styNo = `M5W-S-${TS}`
const styNo2 = `M5W-S2-${TS}`
const deptCode = 'D4' // sewing
// fixture date isolation: a unique day so sibling suites sharing E001/E002
// can never leak into these assertions
const FIXTURE_DAY = '2027-06-15'
const fixtureDate = new Date(FIXTURE_DAY)
const dayStart = new Date(`${FIXTURE_DAY}T00:00:00`)
const dayEnd = new Date(`${FIXTURE_DAY}T23:59:59.999`)

describe('M5 Wave B register math (SPEC-M5 §12-5)', () => {
  let orderId = ''
  let orderId2 = ''
  const prodIds: string[] = []

  beforeAll(async () => {
    const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
    const styles = await Promise.all([
      db.style.create({ data: { styleNo: styNo, description: `M5W style ${TS}` } }),
      db.style.create({ data: { styleNo: styNo2, description: `M5W style2 ${TS}` } }),
    ])
    const orders = []
    for (let i = 0; i < 2; i++) {
      orders.push(await db.order.create({
        data: {
          orderNo: [ordNo, ordNo2][i], buyerId: buyer!.id, styleId: styles[i].id,
          orderDate: new Date(), deliveryDate: new Date('2027-03-31'),
          finYear: '26-27', status: 'open', totalPcs: 100, totalValue: 5000,
        },
      }))
    }
    orderId = orders[0].id
    orderId2 = orders[1].id
    const dept = await db.department.findUnique({ where: { code: deptCode } })
    const [op1, op2] = await Promise.all([
      db.employee.findUnique({ where: { code: OP1 } }),
      db.employee.findUnique({ where: { code: OP2 } }),
    ])
    // OP1: two entries on order 1 (100@3 + 50@3); OP2: one on order1 + one on order2
    const seeds: Array<{ orderId: string; operatorId: string; qty: number; rate: number }> = [
      { orderId, operatorId: op1!.id, qty: 100, rate: 3 },
      { orderId, operatorId: op1!.id, qty: 50, rate: 3 },
      { orderId, operatorId: op2!.id, qty: 80, rate: 5 },
      { orderId: orderId2, operatorId: op2!.id, qty: 20, rate: 5 },
    ]
    for (const [i, s] of seeds.entries()) {
      const e = await db.productionEntry.create({
        data: {
          orderId: s.orderId, deptId: dept!.id, prodDate: fixtureDate,
          bundleNo: `M5W-B-${TS}-${i}`, operatorId: s.operatorId,
          qty: s.qty, rate: s.rate, amount: s.qty * s.rate,
        },
      })
      prodIds.push(e.id)
    }
  })

  it('production-wages: groups by OPERATOR across orders (OP1 150/450, OP2 100/500)', async () => {
    const res = await REGISTER_SERVICES['production-wages']({ limit: 100, page: 1, from: dayStart, to: dayEnd })
    const r1 = res.rows.find((r) => r.code === OP1)
    const r2 = res.rows.find((r) => r.code === OP2)
    expect(r1).toBeTruthy()
    expect(r2).toBeTruthy()
    expect(r1!.qty).toBe(150)
    expect(r1!.amount).toBe(450)
    expect(r1!.rate).toBe(3) // avg effective rate
    expect(r1!.entries).toBe(2)
    expect(r1!.orders).toBe(1)
    expect(r2!.qty).toBe(100)
    expect(r2!.amount).toBe(500)
    expect(r2!.orders).toBe(2) // across BOTH orders — the payroll view
    expect(r2!.entries).toBe(2)
    // W2: rows drill to the employee master
    expect(r1!.href).toBe('/masters/employee')
  })

  it('production-wages: order filter narrows to that order only', async () => {
    const res = await REGISTER_SERVICES['production-wages']({ limit: 100, page: 1, order: ordNo2, from: dayStart, to: dayEnd })
    expect(res.count).toBe(1)
    expect(res.rows[0].code).toBe(OP2)
    expect(res.rows[0].qty).toBe(20)
    // unknown order degrades gracefully
    const none = await REGISTER_SERVICES['production-wages']({ limit: 10, page: 1, order: 'NOPE-XYZ' })
    expect(none.rows).toEqual([])
    expect(none.count).toBe(0)
  })

  it('production-wages: date range filter applies to prodDate', async () => {
    // Date objects (parseRegisterQuery contract — bare strings are PITFALLS #13)
    const res = await REGISTER_SERVICES['production-wages']({ limit: 100, page: 1, from: dayStart, to: dayEnd, q: deptCode })
    expect(res.rows.some((r) => r.code === OP1)).toBe(true)
    const none = await REGISTER_SERVICES['production-wages']({ limit: 10, page: 1, from: new Date('2020-01-01'), to: new Date('2020-01-02') })
    expect(none.rows).toEqual([])
  })

  it('get_production_wages tool delegates to the shared service (read twin)', async () => {
    const tool = getTool('get_production_wages')
    expect(tool).toBeTruthy()
    expect(tool!.isWrite).toBe(false)
    const res = await tool!.execute({ order: ordNo2 })
    const json = res.json as Array<Record<string, unknown>>
    expect(json).toHaveLength(1)
    expect(json[0].code).toBe(OP2)
    expect(json[0].amount).toBe(100)
    expect(json[0].qty).toBe(20)
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    await sw(db.productionEntry.deleteMany({ where: { id: { in: prodIds } } }))
    await sw(db.order.deleteMany({ where: { id: { in: [orderId, orderId2] } } }))
    await sw(db.style.deleteMany({ where: { styleNo: { in: [styNo, styNo2] } } }))
  })
})
