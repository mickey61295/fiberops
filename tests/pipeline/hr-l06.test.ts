/**
 * HR L-06 (SPEC-M55, Module L Batch 6 — the LAST Module L item) — shift
 * wages, the ADR-019-A resolution:
 *   - SW-01/02 the link: ProductionEntry.shiftId (nullable FK, the
 *     Attendance⇄Shift precedent) + the shiftCode attribution door on
 *     post_production_entry (unknown shift = LOUD refusal).
 *   - SW-03 the wage-only door (legacy post_shift_wages port): qty 0 (NO
 *     stock move), amount 0 (prodCost cannot double-count), shiftWages =
 *     the posted wage, operator-neutral.
 *   - SW-04 the budget addend reintroduced: actual = PO + prodCost +
 *     expenses + Σ shiftWages (the REAL column — the HFX-12 Σ amount
 *     stand-in retires); no double-count by construction.
 *   - SW-05 honest totals: production-status Wages = piece + shift.
 *   - SW-06 the register (FrmProdShiftWagesReg port): shift × day grain,
 *     piece + shift + bill columns, the unassigned bucket.
 *   - Piece payroll untouched (M46 back-compat: earned = Σ amount only).
 *   - Wiring pins: tools 271, menu 148 (+ /hr/shift-wages live), routes
 *     184, PROMPT_VERSION m55, context_check pins.
 * Unique M55-* namespaces, full revert.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planShiftWages, planProductionEntry } from '@/lib/erp/posting/production'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { runCommit } from '@/lib/erp/audit'
import { queryShiftWages } from '@/lib/erp/registers/shift-wages'
import { queryProductionStatus } from '@/lib/erp/registers/production-status'
import { getOrderBudgetActual } from '@/lib/erp/registers/budget'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { REGISTER_CONFIGS, getRegisterConfig } from '@/lib/erp/register-configs'
import { MENU_ITEMS, LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { planPayrollRun } from '@/lib/erp/posting/payroll'
import { allTools, getTool } from '@/lib/agent/tools'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { shiftConfig } from '@/lib/erp/master-configs/shift'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const SHIFT = `M55-S1-${TS}` // the shift the door + attribution ride on
const SHIFT_NAME = `M55 Shift One ${TS}`
const E1 = `M55-E1-${TS}` // the piece operator
const ORDER = `M55-ORD-${TS}`
const BUYER = `M55-B-${TS}`
const STYLE = `M55-ST-${TS}`
const BUN = `M55-BUN-${TS}`
const BUN2 = `M55-BUN2-${TS}`
const IDEM = `m55-l06-${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const TODAY = new Date().toISOString().slice(0, 10)

let shiftId = ''
let e1Id = ''
let orderId = '', buyerId = '', styleId = '', deptId = ''
let entryIds: string[] = []

async function commit(plan: any, idem?: string): Promise<any> {
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return runCommit(plan, { actorName: 'm55-test', actorSource: 'system', entity: 'productionEntry', ...(idem ? { idempotencyKey: idem } : {}) })
}

beforeAll(async () => {
  // residue hygiene (parallel-safe: unique namespaces)
  await db.productionEntry.deleteMany({ where: { bundleNo: { startsWith: 'M55-BUN' } } })
  await db.shift.deleteMany({ where: { code: { startsWith: 'M55-S' } } })
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'M55-ORD' } } })
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'M55-ST' } } })
  await db.buyer.deleteMany({ where: { code: { startsWith: 'M55-B' } } })
  await db.employee.deleteMany({ where: { code: { startsWith: 'M55-E' } } })
  await db.party.deleteMany({ where: { code: { startsWith: 'M55-E' } } })

  // the shift through the real master door (the M2 engine, SH-## auto-code
  // would apply when code is omitted — we pass an explicit code)
  const splan = await planMasterCreate(shiftConfig, { code: SHIFT, name: SHIFT_NAME, fromTime: '06:00', toTime: '14:00', hours: 8 })
  if (!splan.ok) throw new Error(String(splan.errors))
  shiftId = (await (splan as any).commit()).id

  // the piece operator through the real master door (auto-links the party)
  const eplan = await planMasterCreate(employeeConfig, { code: E1, name: `M55 Operator ${TS}`, deptCode: 'D4', pieceRate: 10 })
  if (!eplan.ok) throw new Error(String(eplan.errors))
  const e1 = await (eplan as any).commit()
  e1Id = e1.id

  const dept = await db.department.findUniqueOrThrow({ where: { code: 'D4' } })
  deptId = dept.id
  const buyer = await db.buyer.create({ data: { code: BUYER, name: `M55 Buyer ${TS}` } })
  buyerId = buyer.id
  const style = await db.style.create({ data: { styleNo: STYLE, description: `M55 Style ${TS}`, buyerId, category: 'Knit' } })
  styleId = style.id
  const order = await db.order.create({
    data: { orderNo: ORDER, buyerId, styleId, orderDate: new Date(), deliveryDate: new Date(Date.now() + 30 * 86400000), finYear: '26-27', totalPcs: 500, totalValue: 0 },
  })
  orderId = order.id
})

afterAll(async () => {
  await db.productionEntry.deleteMany({ where: { id: { in: entryIds } } })
  await db.stockLedger.deleteMany({ where: { orderId } }) // the piece entry's production_in
  await db.shift.deleteMany({ where: { code: { startsWith: 'M55-S' } } })
  await db.employee.deleteMany({ where: { id: e1Id } })
  await db.party.deleteMany({ where: { code: { startsWith: 'M55-E' } } })
  await db.order.deleteMany({ where: { id: orderId } })
  await db.style.deleteMany({ where: { id: styleId } })
  await db.buyer.deleteMany({ where: { id: buyerId } })
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: 'm55-l06-' } } })
  await db.$disconnect()
})

// ─────────────────────────────────────────────────────────────
// SW-03 the wage-only door (the legacy post_shift_wages port)
// ─────────────────────────────────────────────────────────────
describe('L-06 the wage door: plan, commit, inertness', () => {
  it('plan: qty 0 / amount 0 / shiftWages = the posted wage, shift resolved', async () => {
    const plan = await planShiftWages({ orderNo: ORDER, deptCode: 'D4', shiftCode: SHIFT, prodDate: TODAY, amount: 500 })
    expect(plan.ok).toBe(true)
    expect(plan.text).toContain('500')
    expect(plan.text).toContain(SHIFT_NAME)
    const row = plan.creates!.find((c) => c.table === 'productionEntry')!.data as any
    expect(row.qty).toBe(0)
    expect(row.amount).toBe(0)
    expect(row.shiftWages).toBe(500)
    expect(row.operatorId).toBeNull()
    expect(row.shiftId).toBe(shiftId)
  })

  it('commit: the row lands; NO stock move (qty 0)', async () => {
    const plan = await planShiftWages({ orderNo: ORDER, deptCode: 'D4', shiftCode: SHIFT, prodDate: TODAY, amount: 500 })
    const res = await commit(plan, `${IDEM}-w1`)
    entryIds.push(res.id)
    const row = await db.productionEntry.findUniqueOrThrow({ where: { id: res.id } })
    expect(row.qty).toBe(0)
    expect(row.amount).toBe(0)
    expect(row.shiftWages).toBe(500)
    expect(row.shiftId).toBe(shiftId)
    const moves = await db.stockLedger.count({ where: { orderId } })
    expect(moves).toBe(0) // the wage row moves NOTHING (the G2 call skips qty 0)
  })

  it('honesty doors: unknown shift / dept / order / amount ≤ 0 all REFUSE, no row', async () => {
    const before = await db.productionEntry.count({ where: { orderId } })
    const badShift = await planShiftWages({ orderNo: ORDER, deptCode: 'D4', shiftCode: 'M55-GHOST', prodDate: TODAY, amount: 100 })
    expect(badShift.ok).toBe(false)
    expect(String(badShift.error)).toContain('M55-GHOST')
    expect(String(badShift.error)).toContain('Shift master')
    const badDept = await planShiftWages({ orderNo: ORDER, deptCode: 'D9', shiftCode: SHIFT, prodDate: TODAY, amount: 100 })
    expect(badDept.ok).toBe(false)
    const badOrder = await planShiftWages({ orderNo: 'M55-GHOST-ORD', deptCode: 'D4', shiftCode: SHIFT, prodDate: TODAY, amount: 100 })
    expect(badOrder.ok).toBe(false)
    const badAmount = await planShiftWages({ orderNo: ORDER, deptCode: 'D4', shiftCode: SHIFT, prodDate: TODAY, amount: 0 })
    expect(badAmount.ok).toBe(false)
    const after = await db.productionEntry.count({ where: { orderId } })
    expect(after).toBe(before) // refusals burn NOTHING
  })
})

// ─────────────────────────────────────────────────────────────
// SW-02 the attribution side — post_production_entry takes shiftCode
// ─────────────────────────────────────────────────────────────
describe('L-06 attribution: shiftCode on the piece door', () => {
  it('piece entry WITH shiftCode lands attributed (one G2 move, 1000 piece wage)', async () => {
    const plan = await planProductionEntry({
      orderNo: ORDER, deptCode: 'D4', prodDate: TODAY, bundleNo: BUN, operatorCode: E1,
      qty: 100, rate: 10, shiftCode: SHIFT,
    })
    expect(plan.ok).toBe(true)
    expect(plan.summary).toContain(`shift ${SHIFT}`)
    const res = await commit(plan, `${IDEM}-pe1`)
    entryIds.push(res.id)
    const row = await db.productionEntry.findUniqueOrThrow({ where: { id: res.id } })
    expect(row.shiftId).toBe(shiftId)
    expect(row.amount).toBe(1000)
    const moves = await db.stockLedger.count({ where: { orderId } })
    expect(moves).toBe(1) // the piece move ONLY — the wage row above added none
  })

  it('a piece entry WITHOUT shiftCode lands unassigned (never fabricated)', async () => {
    const plan = await planProductionEntry({
      orderNo: ORDER, deptCode: 'D4', prodDate: TODAY, bundleNo: BUN2, operatorCode: E1,
      qty: 50, rate: 10,
    })
    const res = await commit(plan, `${IDEM}-pe2`)
    entryIds.push(res.id)
    const row = await db.productionEntry.findUniqueOrThrow({ where: { id: res.id } })
    expect(row.shiftId).toBeNull()
  })

  it('unknown shiftCode on a piece entry REFUSES (no silent drop)', async () => {
    const plan = await planProductionEntry({
      orderNo: ORDER, deptCode: 'D4', prodDate: TODAY, bundleNo: `M55-BUNX-${TS}`, operatorCode: E1,
      qty: 10, rate: 10, shiftCode: 'M55-GHOST',
    })
    expect(plan.ok).toBe(false)
    expect(String(plan.error)).toContain('M55-GHOST')
  })
})

// ─────────────────────────────────────────────────────────────
// SW-04 the budget addend + SW-05 honest totals
// ─────────────────────────────────────────────────────────────
describe('L-06 the budget addend: REAL column, no double-count', () => {
  it('budget-vs-actual: shiftWages 500 (the column), actual = 1000 piece + 500 shift', async () => {
    const b = await getOrderBudgetActual(orderId)
    expect(b).not.toBeNull()
    expect(b!.prodCost).toBe(1500)          // 1000 + 500 piece entries
    expect(b!.shiftWages).toBe(500)         // the REAL column (NOT Σ amount — HFX-12 retired)
    expect(b!.expenseSpend).toBe(0)
    expect(b!.actual).toBe(1000 + 500 + 500) // prodCost + the addend — the wage row counted ONCE
  })

  it('production-status Wages = piece + shift (1500 + 500 = 2000)', async () => {
    const res = await queryProductionStatus({ limit: 50, page: 1, order: ORDER } as any)
    const row = res.rows.find((r: any) => r.orderNo === ORDER && r.dept === 'D4')
    expect(row).toBeTruthy()
    expect((row as any).amount).toBe(1500)
    expect((row as any).shiftWages).toBe(2000) // the total wage bill (frozen json name)
    expect((row as any).qty).toBe(150)         // wage rows contribute NO qty
  })

  it('piece payroll UNTOUCHED: earned = Σ amount only (wage row has amount 0)', async () => {
    const rplan = await planPayrollRun({ mode: 'piece', from: TODAY, to: TODAY })
    expect(rplan.ok).toBe(true)
    const line = rplan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e1Id) as any
    expect(line).toBeTruthy()
    expect(line.data.earned).toBe(1500) // 1000 + 500 — piece rows only, wage row adds 0
    // the plan is never committed — nothing lands, nothing to clean
  })
})

// ─────────────────────────────────────────────────────────────
// SW-06 the register (FrmProdShiftWagesReg port)
// ─────────────────────────────────────────────────────────────
describe('L-06 the shift-wages register: shift × day grain', () => {
  it('the S1 row: piece 1000 · shift 500 · bill 1500 · the unassigned row separate', async () => {
    const res = await queryShiftWages({ limit: 50, page: 1, order: ORDER } as any)
    const s1 = res.rows.find((r: any) => r.code === SHIFT) as any
    expect(s1).toBeTruthy()
    expect(s1.piece).toBe(1000)
    expect(s1.shiftWages).toBe(500)
    expect(s1.bill).toBe(1500)
    expect(s1.qty).toBe(100)
    expect(s1.entries).toBe(2) // 1 piece + 1 wage row
    expect(s1.operators).toBe(1)
    const un = res.rows.find((r: any) => r.shift === 'unassigned') as any
    expect(un).toBeTruthy()
    expect(un.piece).toBe(500)
    expect(un.qty).toBe(50)
    const bill = (res.totals ?? []).find((t) => t.label.startsWith('Total bill'))!.value
    expect(bill).toBe(1500 + 500)
  })

  it('wiring: config + service + menu + live route + the tools', () => {
    const cfg = getRegisterConfig('shift-wages')
    expect(cfg).toBeTruthy()
    expect(cfg!.columns.map((c) => c.name)).toContain('shiftWages')
    expect(cfg!.columns.map((c) => c.name)).toContain('bill')
    expect(REGISTER_SERVICES['shift-wages']).toBeTruthy()
    expect(REGISTER_CONFIGS.some((c) => c.slug === 'shift-wages')).toBe(true)

    const item = MENU_ITEMS.find((m) => m.id === 'shift-wages')
    expect(item).toBeTruthy()
    expect(item!.route).toBe('/hr/shift-wages')
    expect(item!.legacyForms).toContain('FrmProdShiftWagesReg')
    expect(LIVE_ROUTES).toContain('/hr/shift-wages')

    const door = getTool('post_shift_wages')
    expect(door).toBeTruthy()
    expect((door as any).domain).toBe('production')
    expect((door as any).isWrite).toBe(true)
    const read = getTool('get_shift_wages')
    expect(read).toBeTruthy()
    expect((read as any).isWrite).toBe(false)
    expect(allTools.length).toBe(271)
  })
})

// ─────────────────────────────────────────────────────────────
// wiring pins (the same-commit sweep)
// ─────────────────────────────────────────────────────────────
describe('L-06 wiring pins', () => {
  it('PROMPT_VERSION m55 + the prompt names both tools', () => {
    expect(PROMPT_VERSION).toBe('m55-2026-09-08')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('post_shift_wages')
    expect(prompt).toContain('get_shift_wages')
  })

  it('context_check pins: 271 / 148 / 184 / m55', () => {
    const cc = src('scripts/context_check.sh')
    expect(cc).toContain('"271"')
    expect(cc).toContain('"148"')
    expect(cc).toContain('"184"')
    expect(cc).toContain('m55-2026-09-08')
    expect(MENU_ITEMS.length).toBe(148)
  })

  it('schema: shiftId + the Shift back-relation (ADR-019-A)', () => {
    const schema = src('prisma/schema.prisma')
    expect(schema).toContain('shiftId')
    expect(schema).toMatch(/shift\s+Shift\?\s+@relation/)
    expect(schema).toContain('productionEntries ProductionEntry[]')
  })
})
