/**
 * SPEC-M5 §12-5 — M5 Wave A register math + budgeted-preference, seeded
 * fixture style (the M4 register-services suite pattern):
 *   - rate-confirmation: rows = POLines; Σ amount = Σ qty×rate; drill href → PO view
 *   - piece-rate-confirmation: groups = operator×order; earned = Σ amount;
 *     qty = Σ entry qty; avg rate = mean of non-zero rates
 *   - budget-vs-actual: explicit Budget rows now WIN over the CostSheet
 *     fallback (M5 Wave A §7-A-1) — with and without an explicit budget
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { REGISTER_SERVICES } from '@/lib/erp/registers'

const TS = Date.now()
const BUYER = 'B001'
const YARN = 'Y-30COT'
const SUPPLIER = 'SUP001'
const OPERATOR = 'E001'

const ordNo = `M5R-O-${TS}`
const styNo = `M5R-S-${TS}`
const poNo = `M5R-PO-${TS}`
const deptCode = 'STG' // sewing? — resolved at runtime; created if missing

describe('M5 Wave A register math (SPEC-M5 §12-5)', () => {
  let orderId = ''
  let poId = ''
  let deptId = ''
  let budgetId = ''
  const prodIds: string[] = []

  beforeAll(async () => {
    const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
    const style = await db.style.create({ data: { styleNo: styNo, description: `M5R style ${TS}` } })
    const order = await db.order.create({
      data: {
        orderNo: ordNo, buyerId: buyer!.id, styleId: style.id,
        orderDate: new Date(), deliveryDate: new Date('2027-03-31'),
        finYear: '26-27', status: 'open', totalPcs: 10, totalValue: 1000,
      },
    })
    orderId = order.id
    const supplier = await db.party.findUnique({ where: { code: SUPPLIER } })
    const yarn = await db.yarn.findUnique({ where: { code: YARN } })
    const po = await db.purchaseOrder.create({
      data: {
        poNo, poType: 'yarn', partyId: supplier!.id, orderDate: new Date(),
        deliveryDate: new Date('2027-04-30'), finYear: '26-27', status: 'open',
        totalQty: 15, totalValue: 4900,
        lines: {
          create: [
            { itemType: 'yarn', itemId: yarn!.id, qty: 10, rate: 320, amount: 3200, orderId },
            { itemType: 'yarn', itemId: yarn!.id, qty: 5, rate: 340, amount: 1700, orderId },
          ],
        },
      },
    })
    poId = po.id
    // dept for production entries
    let dept = await db.department.findFirst({ where: { code: deptCode } })
    if (!dept) dept = await db.department.create({ data: { code: deptCode, name: `M5R dept ${TS}` } })
    deptId = dept.id
    const operator = await db.employee.findUnique({ where: { code: OPERATOR } })
    for (const [qty, rate] of [[100, 3], [50, 3]] as Array<[number, number]>) {
      const e = await db.productionEntry.create({
        data: {
          orderId, deptId, prodDate: new Date(), bundleNo: `M5R-B-${TS}-${qty}`,
          operatorId: operator!.id, qty, rate, amount: qty * rate,
        },
      })
      prodIds.push(e.id)
    }
  })

  it('rate-confirmation: 2 rows, Σ qty 15, Σ amount 4900, drill href → PO view', async () => {
    const res = await REGISTER_SERVICES['rate-confirmation']({ limit: 50, page: 1 })
    const rows = res.rows.filter((r) => r.poNo === poNo)
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.href === `/procurement/po/${poId}`)).toBe(true)
    expect(rows.reduce((s, r) => s + (r.qty as number), 0)).toBe(15)
    expect(rows.reduce((s, r) => s + (r.amount as number), 0)).toBe(4900)
  })

  it('rate-confirmation: party filter narrows to the seeded supplier', async () => {
    const res = await REGISTER_SERVICES['rate-confirmation']({ limit: 50, page: 1, party: SUPPLIER })
    expect(res.rows.length).toBeGreaterThanOrEqual(2)
    const resNone = await REGISTER_SERVICES['rate-confirmation']({ limit: 50, page: 1, party: 'NOPE-XYZ' })
    expect(resNone.rows).toEqual([])
  })

  it('piece-rate-confirmation: operator×order group math (qty 150, earned 450, avg rate 3)', async () => {
    const res = await REGISTER_SERVICES['piece-rate-confirmation']({ limit: 100, page: 1, order: ordNo })
    expect(res.count).toBe(1)
    const row = res.rows[0]
    expect(row.qty).toBe(150)
    expect(row.amount).toBe(450)
    expect(row.rate).toBe(3)
    // q filter (dept code) narrows
    const byDept = await REGISTER_SERVICES['piece-rate-confirmation']({ limit: 100, page: 1, q: deptCode })
    expect(byDept.rows.some((r) => r.orderNo === ordNo)).toBe(true)
  })

  it('budget-vs-actual: CostSheet fallback when no Budget rows (M4 math intact)', async () => {
    const res = await REGISTER_SERVICES['budget-vs-actual']({ order: ordNo, limit: 10, page: 1 })
    const row = res.rows.find((r) => r.orderNo === ordNo)
    expect(row).toBeTruthy()
    // no cost sheets either in this fixture → budgeted 0, actual = PO 4900 + prod 450 + wages 0
    expect(row!.budgeted).toBe(0)
    expect(row!.actual).toBe(5350)
  })

  it('budget-vs-actual: explicit Budget rows WIN over the fallback (M5 §7-A-1)', async () => {
    const b = await db.budget.create({
      data: { orderId, finYear: '26-27', amount: 7000, BudgetLine: { create: [{ amount: 7000 }] } },
    })
    budgetId = b.id
    const res = await REGISTER_SERVICES['budget-vs-actual']({ order: ordNo, limit: 10, page: 1 })
    const row = res.rows.find((r) => r.orderNo === ordNo)
    expect(row!.budgeted).toBe(7000)
    expect(row!.variance).toBe(7000 - 5350)
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    if (budgetId) {
      await sw(db.budgetLine.deleteMany({ where: { budgetId } }))
      await sw(db.budget.deleteMany({ where: { id: budgetId } }))
    }
    await sw(db.productionEntry.deleteMany({ where: { id: { in: prodIds } } }))
    await sw(db.pOLine.deleteMany({ where: { poId } }))
    await sw(db.purchaseOrder.deleteMany({ where: { id: poId } }))
    await sw(db.order.deleteMany({ where: { id: orderId } }))
    await sw(db.style.deleteMany({ where: { styleNo: styNo } }))
  })
})
