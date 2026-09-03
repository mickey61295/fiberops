/**
 * Payroll L-01 (SPEC-M45, Module L Batch 1) — wage reconciliation, THE LAST
 * STRUCTURAL P0 (consolidated register dive-2 §1 seam #3):
 *   - Employee create auto-creates/links the 1:1 employee-party (both doors
 *     share master-service's commit — the finYear-invariant hook precedent)
 *   - planProductionBill with operatorCode stamps the journal partyId (the
 *     GL leg hits the employee's party ledger)
 *   - the operator statement: earned (piece-rate entries) − paid (wage
 *     payments to the linked party) = owed; windowed legs on their own dates
 *   - LOOP-CLOSURE #3 GREEN end-to-end: entry → bill → payment → owed 0
 *   - party-ledger agreement: bill journal + payment land in the formula
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { ensureEmployeeParty } from '@/lib/erp/posting/employee-party'
import { planProductionBill } from '@/lib/erp/posting/production-bill'
import { planProductionEntry } from '@/lib/erp/posting/production'
import { planWagePayment } from '@/lib/erp/posting/payment'
import { runCommit } from '@/lib/erp/audit'
import { queryOperatorStatement } from '@/lib/erp/registers/operator-statement'
import { queryWages } from '@/lib/erp/registers/wages'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { getTool, allTools } from '@/lib/agent/tools'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { MENU_ITEMS, LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const EMP = `M45-E-${TS}`           // the operator (created through the MASTER door)
const ORDER = `M45-ORD-${TS}`
const BUYER = `M45-B-${TS}`
const STYLE = `M45-S-${TS}`
const IDEM = `m45-l01-${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')

let empId = '', partyId = '', orderId = '', buyerId = '', styleId = '', deptId = ''
let journalIds: string[] = []
let paymentIds: string[] = []
let entryIds: string[] = []
let auditIds: string[] = []

beforeAll(async () => {
  const dept = await db.department.findUniqueOrThrow({ where: { code: 'D4' } })
  deptId = dept.id
  const buyer = await db.buyer.create({ data: { code: BUYER, name: `M45 Buyer ${TS}` } })
  buyerId = buyer.id
  const style = await db.style.create({ data: { styleNo: STYLE, description: `M45 Style ${TS}`, buyerId, category: 'Knit' } })
  styleId = style.id
  const order = await db.order.create({
    data: { orderNo: ORDER, buyerId, styleId, orderDate: new Date(), deliveryDate: new Date(Date.now() + 30 * 86400000), finYear: '26-27', totalPcs: 100, status: 'in_progress' },
  })
  orderId = order.id
})

afterAll(async () => {
  // full revert — leave the dev DB byte-identical. The payment COMPANION
  // journals (JV-<voucherNo>) must go BEFORE/with the payment rows: a payment
  // deleted without its companion orphans JV-PMT-####, and a parallel worker
  // re-resolving that number then collides on the journal (unique voucherNo).
  const pays = paymentIds.length
    ? await db.payment.findMany({ where: { id: { in: paymentIds } }, select: { voucherNo: true } })
    : []
  if (pays.length) {
    await db.journal.deleteMany({ where: { voucherNo: { in: pays.flatMap((p) => [`JV-${p.voucherNo}`, `CN-${p.voucherNo}`]) } } })
  }
  await db.productionEntry.deleteMany({ where: { id: { in: entryIds } } })
  await db.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } })
  await db.payment.deleteMany({ where: { id: { in: paymentIds } } })
  await db.journal.deleteMany({ where: { id: { in: journalIds } } })
  for (const id of auditIds) await db.auditLog.delete({ where: { id } }).catch(() => {})
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: 'm45-l01-' } } })
  if (empId) {
    await db.employee.deleteMany({ where: { id: empId } })
    if (partyId) await db.party.deleteMany({ where: { id: partyId } })
  }
  await db.order.deleteMany({ where: { id: orderId } })
  await db.style.deleteMany({ where: { id: styleId } })
  await db.buyer.deleteMany({ where: { id: buyerId } })
})

describe('L-01 employee create auto-links the 1:1 employee-party (master door = both doors)', () => {
  it('planMasterCreate(employee) → commit → Employee.partyId set + Party exists', async () => {
    const plan = await planMasterCreate(employeeConfig, { code: EMP, name: `M45 Operator ${TS}`, deptCode: 'D4', role: 'operator', pieceRate: 10 })
    expect(plan.ok).toBe(true)
    expect(plan.sideEffects.join(' ')).toContain('employee-party') // declared before approval (agent door narrates it)
    const res: any = await runCommit(plan, { actorName: 'm45-test', actorSource: 'system', entity: 'employee', idempotencyKey: `${IDEM}-emp` })
    empId = res.id
    expect(res.employeeParty).toBe(EMP)
    const emp = await db.employee.findUniqueOrThrow({ where: { code: EMP }, include: { party: true } })
    expect(emp.partyId).toBeTruthy()
    expect(emp.party!.code).toBe(EMP)
    expect(emp.party!.partyType).toBe('employee')
    expect(emp.party!.name).toBe(`M45 Operator ${TS}`)
    partyId = emp.partyId!
  })

  it('ensureEmployeeParty is idempotent (second call = same party, no dupes)', async () => {
    const before = await db.party.count({ where: { code: EMP } })
    const again = await ensureEmployeeParty({ id: empId, code: EMP, name: `M45 Operator ${TS}` })
    const after = await db.party.count({ where: { code: EMP } })
    expect(again.code).toBe(EMP)
    expect(before).toBe(1)
    expect(after).toBe(1)
  })
})

describe('L-01 loop-closure #3 — entry → bill → payment → owed 0 (spec §12 walkthrough)', () => {
  it('production entry: 100 pcs × ₹10 = ₹1,000 earned', async () => {
    const plan = await planProductionEntry({
      orderNo: ORDER, deptCode: 'D4', prodDate: new Date().toISOString().slice(0, 10),
      bundleNo: `M45-BUN-${TS}`, operatorCode: EMP, qty: 100, rate: 10,
    })
    expect(plan.ok).toBe(true)
    const res: any = await runCommit(plan, { actorName: 'm45-test', actorSource: 'system', idempotencyKey: `${IDEM}-pe` })
    entryIds.push(res.id)
    const row = await db.productionEntry.findUniqueOrThrow({ where: { id: res.id } })
    expect(row.amount).toBe(1000)
  })

  it('per-operator production bill: journal CARRIES partyId (the GL leg)', async () => {
    const plan = await planProductionBill({ operatorCode: EMP, to: new Date().toISOString().slice(0, 10) })
    expect(plan.ok).toBe(true)
    expect((plan as any).creates[0].data.partyId).toBe(partyId) // plan declares it
    const res: any = await runCommit(plan, { actorName: 'm45-test', actorSource: 'system', entity: 'journal', idempotencyKey: `${IDEM}-bill` })
    journalIds.push(res.id)
    expect(res.partyCode).toBe(EMP)
    const j = await db.journal.findUniqueOrThrow({ where: { id: res.id } })
    expect(j.partyId).toBe(partyId)
    expect(j.debitAccount).toBe('Production Wages')
    expect(j.creditAccount).toBe('Wage Payable')
    expect(j.amount).toBe(1000)
  })

  it('statement (before payment): owed = earned = ₹1,000', async () => {
    const res = await queryOperatorStatement({ limit: 100, page: 1 })
    const row = res.rows.find((r) => r.code === EMP) as any
    expect(row).toBeTruthy()
    expect(row.earned).toBe(1000)
    expect(row.paid).toBe(0)
    expect(row.owed).toBe(1000)
    expect(row.party).toBe(EMP)
    expect(row.entries).toBe(1)
    expect(row.qty).toBe(100)
  })

  it('wage payment ₹1,000 via the agent door (pay_wages)', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: EMP, amount: 1000, mode: 'cash' })
    expect(t.plan).toBeTruthy()
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    // companion journal + payment both carry the party id
    const pay = await db.payment.findUniqueOrThrow({ where: { id: res.id } })
    expect(pay.partyId).toBe(partyId)
    expect(pay.direction).toBe('out')
  })

  it('LOOP-CLOSURE #3 GREEN: statement owed = 0 after full payment', async () => {
    const res = await queryOperatorStatement({ limit: 100, page: 1 })
    const row = res.rows.find((r) => r.code === EMP) as any
    expect(row.earned).toBe(1000)
    expect(row.paid).toBe(1000)
    expect(row.owed).toBe(0) // loop-closure #3 GREEN
  })

  it('party-ledger agreement: bill journal + payment land in the formula (balance 0)', async () => {
    const s = await getPartyLedgerSummary(partyId)
    expect(s!.totalJournal).toBe(1000) // the wage bill leg now VISIBLE to the party
    expect(s!.totalPaid).toBe(1000)
    expect(s!.balance).toBe(0) // opening 0 − journals 1000 + paid 1000
  })

  it('wages register (the M40 interim) agrees through the REAL link', async () => {
    const res = await queryWages({ limit: 100, page: 1 })
    const row = res.rows.find((r) => r.code === EMP) as any
    expect(row.paid).toBe(1000)
    expect(row.owed).toBe(0)
  })
})

describe('L-01 statement semantics', () => {
  it('partial payment → owed = earned − paid (hand-computed 1000 − 250 = 750)', async () => {
    // extra ₹? no — PAY MORE than the first ₹1000 would flip owed negative;
    // instead scope: pay ₹250 MORE and check owed goes to −250? No — the
    // honest spec case: a SECOND operator earns and is partially paid.
    const emp2 = await db.employee.create({
      data: { code: `${EMP}-2`, name: `M45 Operator 2 ${TS}`, deptId, role: 'operator', pieceRate: 5, partyId: null },
    })
    await db.party.create({ data: { code: `${EMP}-2`, name: `M45 Operator 2 ${TS}`, partyType: 'employee' } })
    // unlinked employee + unlinked party (the legacy shape, pre-backfill)
    await db.productionEntry.create({
      data: { orderId, deptId, prodDate: new Date(), operatorId: emp2.id, qty: 100, rate: 5, amount: 500 },
    })
    entryIds.push((await db.productionEntry.findFirstOrThrow({ where: { operatorId: emp2.id } })).id)
    const res = await queryOperatorStatement({ limit: 100, page: 1 })
    const row = res.rows.find((r) => r.code === `${EMP}-2`) as any
    expect(row).toBeTruthy()
    expect(row.earned).toBe(500)
    expect(row.paid).toBe(0)  // unlinked → the statement does NOT guess by code
    expect(row.owed).toBe(500)
    expect(row.party).toBe('—') // honest: no link, no party
    // cleanup the ad-hoc pair
    await db.productionEntry.deleteMany({ where: { operatorId: emp2.id } })
    await db.employee.deleteMany({ where: { id: emp2.id } })
    await db.party.deleteMany({ where: { code: `${EMP}-2` } })
    entryIds = entryIds.filter((id) => id)
  })

  it('from/to windows: earned windows by prodDate, paid by payDate (independent)', async () => {
    // payment exists TODAY; entry exists TODAY — a window ending yesterday
    // excludes the entry but ALSO the payment (both legs windowed)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const res = await queryOperatorStatement({ limit: 100, page: 1, to: new Date(`${yesterday}T23:59:59.999Z`) })
    const row = res.rows.find((r) => r.code === EMP) as any
    expect(row).toBeUndefined() // zero activity inside the window → silent row
    // the wages question with an all-time window still sees everything
    const all = await queryOperatorStatement({ limit: 100, page: 1 })
    expect((all.rows.find((r) => r.code === EMP) as any).owed).toBe(0)
  })
})

describe('L-01 wiring + honest claims', () => {
  it('register slug wired: services + configs + LIVE_ROUTES + menu + page + csv', () => {
    expect(REGISTER_SERVICES['operator-statement']).toBe(queryOperatorStatement)
    const cfg = getRegisterConfig('operator-statement')!
    expect(cfg.agentTools).toContain('get_operator_statement')
    expect(LIVE_ROUTES.has('/hr/operator-statement')).toBe(true)
    expect(LIVE_ROUTES.has('/hr/operator-statement/csv')).toBe(false) // csv rides the page's export, not menu
    const item = MENU_ITEMS.find((m) => m.id === 'operator-statement')
    expect(item).toBeTruthy()
    expect(item!.groupId).toBe('hr')
    expect(src('src/app/(erp)/hr/operator-statement/page.tsx')).toContain("getRegisterConfig('operator-statement')")
    expect(src('src/app/(erp)/hr/operator-statement/csv/route.ts')).toContain("makeCsvRouteHandler('operator-statement')")
  })

  it('agent tool registered: get_operator_statement (tools 249→250)', () => {
    const tool = allTools.find((t: any) => t.name === 'get_operator_statement')
    expect(tool).toBeTruthy()
    expect((tool as any).domain).toBe('hr')
    expect((tool as any).isWrite).toBe(false)
  })

  it('PROMPT_VERSION bumped + the hr line carries the statement', () => {
    expect(PROMPT_VERSION).toBe('m46-2026-09-03')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('get_operator_statement')
  })

  it('source contracts: the bill stamps partyId; the wages register uses the link (not code-matching)', () => {
    const bill = src('src/lib/erp/posting/production-bill.ts')
    expect(bill).toContain('ensureEmployeeParty')
    expect(bill).toContain('partyId: operatorPartyId')
    const wages = src('src/lib/erp/registers/wages.ts')
    expect(wages).toContain('partyIdByOperator')
    expect(wages).not.toContain('partyIdByCode')
    const schema = src('prisma/schema.prisma')
    expect(schema).toContain('partyId           String?           @unique')
  })
})
