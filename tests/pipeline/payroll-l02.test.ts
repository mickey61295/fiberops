/**
 * Payroll L-02 + L-05 (SPEC-M46, Module L Batch 2) — the payroll run +
 * payslip, built on the M45 L-01 employee-party link:
 *   - THE §12 WALKTHROUGH: attendance × dailyWage → run → commit (wage
 *     journal WITH partyId) → payslip → pay_wages → party-ledger balance 0
 *   - advances: pre-paid cash nets against earned; the journal still posts
 *     FULL earned so the ledger closes exactly
 *   - piece mode: same ground truth as the operator statement (the run
 *     journal never double-counts the statement — L-01 frozen)
 *   - guards: piece-window overlap, inverted period, zero activity (wage-0
 *     employees NAMED), unknown run, double-commit, draft payslip refusal
 *   - L-05: payout fields round-trip through the master door; UAN/aadhaar
 *     print MASKED on the payslip
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { planPayrollRun, planPayrollRunCommit } from '@/lib/erp/posting/payroll'
import { planProductionEntry } from '@/lib/erp/posting/production'
import { runCommit } from '@/lib/erp/audit'
import { queryPayrollRuns } from '@/lib/erp/registers/payroll'
import { queryOperatorStatement } from '@/lib/erp/registers/operator-statement'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { fetchPayslipPrint } from '@/lib/erp/print/fetchers-b'
import { PRINT_DOCS, getPrintDocTypes } from '@/lib/erp/print'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { MENU_ITEMS, LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { SEQUENCES } from '@/lib/erp/numbering'
import { allTools, getTool } from '@/lib/agent/tools'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const E1 = `M46-E1-${TS}` // daily employee WITH L-05 payout fields
const E2 = `M46-E2-${TS}` // daily employee #2 (advances walkthrough)
const E3 = `M46-E3-${TS}` // piece employee
const E4 = `M46-E4-${TS}` // attendance but dailyWage 0 (the named guard)
const ORDER = `M46-ORD-${TS}`
const BUYER = `M46-B-${TS}`
const STYLE = `M46-S-${TS}`
const IDEM = `m46-l02-${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')

const TODAY = new Date().toISOString().slice(0, 10)
const dayAt = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)

let e1Id = '', e2Id = '', e3Id = '', e4Id = ''
let e1Party = '', e2Party = '', e3Party = ''
let orderId = '', buyerId = '', styleId = '', deptId = ''
let runIds: string[] = [] // committed + draft runs (lines cascade)
let runNos: string[] = []
let journalIds: string[] = []
let paymentIds: string[] = []
let entryIds: string[] = []

async function commit<T>(planOrPromise: any, idem?: string): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return runCommit(plan, { actorName: 'm46-test', actorSource: 'system', entity: 'payroll_run', ...(idem ? { idempotencyKey: idem } : {}) })
}

beforeAll(async () => {
  const dept = await db.department.findUniqueOrThrow({ where: { code: 'D4' } })
  deptId = dept.id
  const buyer = await db.buyer.create({ data: { code: BUYER, name: `M46 Buyer ${TS}` } })
  buyerId = buyer.id
  const style = await db.style.create({ data: { styleNo: STYLE, description: `M46 Style ${TS}`, buyerId, category: 'Knit' } })
  styleId = style.id
  const order = await db.order.create({
    data: { orderNo: ORDER, buyerId, styleId, orderDate: new Date(), deliveryDate: new Date(Date.now() + 30 * 86400000), finYear: '26-27', totalPcs: 100, status: 'in_progress' },
  })
  orderId = order.id

  // E1 — the L-05 showcase employee (daily, all payout fields)
  const p1 = await planMasterCreate(employeeConfig, {
    code: E1, name: `M46 Daily One ${TS}`, deptCode: 'D4', role: 'operator', dailyWage: 500,
    joiningDate: '2024-06-01', designation: 'Tailor', phone: '9876543210',
    bankName: 'SBI', ifsc: 'SBIN0001234', accountNo: '12345678901', upi: 'e1@upi',
    uan: '101234567890', aadhaar: '483927165384',
  })
  const r1: any = await commit(p1, `${IDEM}-e1`)
  e1Id = r1.id
  const emp1 = await db.employee.findUniqueOrThrow({ where: { code: E1 }, include: { party: true } })
  e1Party = emp1.partyId!
  expect(emp1.party!.code).toBe(E1) // M45 auto-link holds

  // E2 — plain daily employee (advances leg)
  const p2 = await planMasterCreate(employeeConfig, { code: E2, name: `M46 Daily Two ${TS}`, deptCode: 'D4', role: 'operator', dailyWage: 500 })
  const r2: any = await commit(p2, `${IDEM}-e2`)
  e2Id = r2.id
  e2Party = (await db.employee.findUniqueOrThrow({ where: { code: E2 } })).partyId!

  // E3 — piece employee
  const p3 = await planMasterCreate(employeeConfig, { code: E3, name: `M46 Piece ${TS}`, deptCode: 'D4', role: 'operator', pieceRate: 10 })
  const r3: any = await commit(p3, `${IDEM}-e3`)
  e3Id = r3.id
  e3Party = (await db.employee.findUniqueOrThrow({ where: { code: E3 } })).partyId!

  // E4 — attendance-but-zero-wage employee (the named guard), direct create
  const e4 = await db.employee.create({ data: { code: E4, name: `M46 Zero Wage ${TS}`, deptId, role: 'helper', dailyWage: 0 } })
  e4Id = e4.id

  // attendance fixtures — UTC-midnight Date objects, distinct dates per employee
  const att = [
    { employeeId: e1Id, attDate: new Date(`${dayAt(0)}T00:00:00.000Z`), status: 'present' },
    { employeeId: e1Id, attDate: new Date(`${dayAt(-1)}T00:00:00.000Z`), status: 'present' },
    { employeeId: e1Id, attDate: new Date(`${dayAt(-2)}T00:00:00.000Z`), status: 'half' },
    { employeeId: e1Id, attDate: new Date(`${dayAt(-3)}T00:00:00.000Z`), status: 'absent' },
    { employeeId: e2Id, attDate: new Date(`${dayAt(-7)}T00:00:00.000Z`), status: 'present' },
    { employeeId: e2Id, attDate: new Date(`${dayAt(-6)}T00:00:00.000Z`), status: 'present' },
    { employeeId: e2Id, attDate: new Date(`${dayAt(-5)}T00:00:00.000Z`), status: 'present' },
    { employeeId: e4Id, attDate: new Date(`${dayAt(10)}T00:00:00.000Z`), status: 'present' },
  ]
  await db.attendance.createMany({ data: att })
})

afterAll(async () => {
  // companions FIRST (PITFALLS #47: a payment deleted without its JV-CN pair
  // orphans the number and kills parallel workers' re-resolution)
  const pays = paymentIds.length
    ? await db.payment.findMany({ where: { id: { in: paymentIds } }, select: { voucherNo: true } })
    : []
  if (pays.length) {
    await db.journal.deleteMany({ where: { voucherNo: { in: pays.flatMap((p) => [`JV-${p.voucherNo}`, `CN-${p.voucherNo}`]) } } })
  }
  // the run journals (narration references the run) + any tracked ids
  if (runNos.length) {
    const js = await db.journal.findMany({ where: { narration: { contains: 'Payroll run' } }, select: { id: true, narration: true } })
    const mine = js.filter((j) => runNos.some((rn) => j.narration.includes(rn))).map((j) => j.id)
    journalIds.push(...mine)
  }
  await db.journal.deleteMany({ where: { id: { in: journalIds } } })
  await db.payrollRun.deleteMany({ where: { id: { in: runIds } } }) // lines cascade
  await db.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } })
  await db.payment.deleteMany({ where: { id: { in: paymentIds } } })
  await db.productionEntry.deleteMany({ where: { id: { in: entryIds } } })
  await db.attendance.deleteMany({ where: { employeeId: { in: [e1Id, e2Id, e3Id, e4Id] } } })
  await db.employee.deleteMany({ where: { id: { in: [e1Id, e2Id, e3Id, e4Id] } } })
  await db.party.deleteMany({ where: { id: { in: [e1Party, e2Party, e3Party] } } })
  await db.order.deleteMany({ where: { id: orderId } })
  await db.style.deleteMany({ where: { id: styleId } })
  await db.buyer.deleteMany({ where: { id: buyerId } })
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: 'm46-l02-' } } })
  await db.$disconnect()
})

// ─────────────────────────────────────────────────────────────
// THE §12 WALKTHROUGH — attendance × dailyWage → payslip → payment → owed 0
// ─────────────────────────────────────────────────────────────
describe('L-02 daily walkthrough (spec §12): attendance → run → commit → payslip → payment → ledger 0', () => {
  let runNo = '', lineId = ''

  it('attendance math: 2 present + 1 half + 1 absent = 2.5 days × ₹500 = ₹1,250', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: dayAt(-3), to: dayAt(0) })
    expect(plan.ok).toBe(true)
    // E2's attendance also rides this window (1500) — assert E1's line exactly
    const e1Line = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e1Id) as any
    expect(e1Line).toBeTruthy()
    expect(e1Line.data.days).toBe(2.5)
    expect(e1Line.data.earned).toBe(1250)
    expect(e1Line.data.advances).toBe(0)
    expect(e1Line.data.net).toBe(1250)
    expect(e1Line.data.partyId).toBe(e1Party) // frozen link — never null on a created line
  })

  it('run commits draft with frozen lines; runNo PR-####; finYear = the ACTIVE code', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: dayAt(-3), to: dayAt(0) })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-r1`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    runNo = res.runNo
    expect(res.status).toBe('draft')
    expect(res.runNo).toMatch(/^PR-\d{4}$/)
    const run = await db.payrollRun.findUniqueOrThrow({ where: { id: res.id }, include: { lines: true } })
    expect(run.finYear).toBeTruthy()
    const active = await db.finYear.findFirst({ where: { active: true } })
    if (active) expect(run.finYear).toBe(active.code) // SPEC-M44 FY-01: the active row decides
    const e1 = run.lines.find((l) => l.employeeId === e1Id)!
    expect(e1.days).toBe(2.5)
    expect(e1.net).toBe(1250)
    lineId = e1.id
    expect(run.lines.length).toBe(1) // E2's attendance lives in a DISJOINT window ([-7,-5])
  })

  it('commit posts the wage journal WITH partyId (Dr Staff Salaries / Cr Wage Payable)', async () => {
    const plan = await planPayrollRunCommit({ runNo })
    expect(plan.ok).toBe(true)
    expect(plan.updates!.length).toBe(1)
    const res: any = await commit(plan, `${IDEM}-c1`)
    expect(res.status).toBe('committed')
    expect(res.journals).toBe(1) // E1's line only (E2's window is disjoint)
    // the E1 journal
    const j = await db.journal.findFirstOrThrow({
      where: { partyId: e1Party, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable' },
      orderBy: { date: 'desc' },
    })
    journalIds.push(j.id)
    expect(j.amount).toBe(1250) // FULL earned, not net
    expect(j.voucherNo).toMatch(/^V-\d{4}$/)
    expect(j.voucherType).toBe('journal')
    expect(j.narration).toContain(runNo)
    expect(j.narration).toContain(E1)
    const run = await db.payrollRun.findUniqueOrThrow({ where: { id: res.id } })
    expect(run.committedAt).toBeTruthy()
  })

  it('payslip prints for a committed line: L-05 fields, UAN/aadhaar MASKED, net in figures', async () => {
    const slip = await fetchPayslipPrint(lineId)
    expect(slip).toBeTruthy()
    expect(slip!.docType).toBe('payslip')
    expect(slip!.title).toBe('PAYSLIP')
    expect(slip!.docNo).toBe(runNo)
    expect(slip!.party!.code).toBe(E1)
    const meta = Object.fromEntries(slip!.meta ?? [])
    expect(meta['Designation']).toBe('Tailor')
    expect(meta['Joining date']).toBe('2024-06-01')
    expect(meta['UAN']).toBe('XXXX-XXXX-7890') // 12 digits → masked, tail 4
    expect(meta['Aadhaar']).toBe('XXXX-XXXX-5384')
    const rows = slip!.lines!.rows
    expect(String(rows[0][2])).toContain('1,250')
    expect(String(rows[1][2])).toContain('0') // advances −0
    const totals = Object.fromEntries(slip!.totals ?? [])
    expect(String(totals['NET PAYABLE'])).toContain('1,250')
    expect(slip!.notes!.join(' ')).toContain('SBI') // the pay-to block
    expect(slip!.notes!.join(' ')).toContain('SBIN0001234')
    // composite form resolves the same doc (agent door / deep link)
    const twin = await fetchPayslipPrint(`${runNo}/${E1}`)
    expect(twin!.docNo).toBe(runNo)
    expect(twin!.party!.code).toBe(E1)
  })

  it('LOOP CLOSURE: pay_wages ₹1,250 → party-ledger balance exactly 0', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: E1, amount: 1250, mode: 'cash' })
    expect(t.plan).toBeTruthy()
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    const s = await getPartyLedgerSummary(e1Party)
    expect(s!.totalJournal).toBe(1250) // the run journal leg
    expect(s!.totalPaid).toBe(1250)
    expect(s!.balance).toBe(0) // −journal + payment = 0 (loop-closure #3 in the ledger)
  })
})

// ─────────────────────────────────────────────────────────────
// ADVANCES — pre-paid cash nets against earned; ledger still closes exactly
// ─────────────────────────────────────────────────────────────
describe('L-02 advances leg: pre-pay ₹300 → net ₹1,200 → ledger 0', () => {
  let runNo = ''

  it('pays an advance of ₹300 INSIDE E2\'s window (pay_wages, explicit payDate)', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: E2, amount: 300, mode: 'cash', payDate: dayAt(-6), notes: 'Advance' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)
  })

  it('the run nets: earned 1,500 − advances 300 = net 1,200 (journal posts 1,500)', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: dayAt(-7), to: dayAt(-5) })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-r2`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    runNo = res.runNo
    const line = (await db.payrollRun.findUniqueOrThrow({ where: { id: res.id }, include: { lines: true } }))
      .lines.find((l) => l.employeeId === e2Id)!
    expect(line.earned).toBe(1500)
    expect(line.advances).toBe(300)
    expect(line.net).toBe(1200)

    const cplan = await planPayrollRunCommit({ runNo })
    const cres: any = await commit(cplan, `${IDEM}-c2`)
    const j = await db.journal.findFirstOrThrow({
      where: { partyId: e2Party, debitAccount: 'Staff Salaries' },
      orderBy: { date: 'desc' },
    })
    journalIds.push(j.id)
    expect(j.amount).toBe(1500) // FULL earned — advances already live in the ledger as payments
  })

  it('pay the NET ₹1,200 → ledger: −1500 + 300 + 1200 = 0 exactly', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: E2, amount: 1200, mode: 'cash' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    const s = await getPartyLedgerSummary(e2Party)
    expect(s!.balance).toBe(0)
    expect(s!.totalPaid).toBe(1500) // 300 + 1200
  })
})

// ─────────────────────────────────────────────────────────────
// PIECE MODE — statement ground truth, frozen L-01 semantics
// ─────────────────────────────────────────────────────────────
describe('L-02 piece mode: run = the statement ground truth (L-01 frozen)', () => {
  let runNo = ''

  it('production entries 100 @ ₹10 → run earned ₹1,000', async () => {
    const plan = await planProductionEntry({
      orderNo: ORDER, deptCode: 'D4', prodDate: TODAY,
      bundleNo: `M46-BUN-${TS}`, operatorCode: E3, qty: 100, rate: 10,
    })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-pe`)
    entryIds.push(res.id)

    const rplan = await planPayrollRun({ mode: 'piece', from: dayAt(-1), to: dayAt(0) })
    expect(rplan.ok).toBe(true)
    const line = rplan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e3Id) as any
    expect(line.data.earned).toBe(1000)
    expect(line.data.qty).toBe(100)
    const rres: any = await commit(rplan, `${IDEM}-r3`)
    runIds.push(rres.id)
    runNos.push(rres.runNo)
    runNo = rres.runNo
  })

  it('commit → journal partyId Dr Production Wages; statement earned stays 1,000 (no double-count)', async () => {
    const cplan = await planPayrollRunCommit({ runNo })
    const cres: any = await commit(cplan, `${IDEM}-c3`)
    const j = await db.journal.findFirstOrThrow({
      where: { partyId: e3Party, debitAccount: 'Production Wages', creditAccount: 'Wage Payable' },
      orderBy: { date: 'desc' },
    })
    journalIds.push(j.id)
    expect(j.amount).toBe(1000)

    // pay it out, then the frozen statement must read earned 1000 / paid 1000 / owed 0
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: E3, amount: 1000, mode: 'cash' })
    const pres: any = await t.commit!()
    paymentIds.push(pres.id)

    const st = await queryOperatorStatement({ limit: 100, page: 1 })
    const row = st.rows.find((r) => r.code === E3) as any
    expect(row.earned).toBe(1000) // entry-based — the run journal did NOT double it
    expect(row.paid).toBe(1000)
    expect(row.owed).toBe(0)
    const s = await getPartyLedgerSummary(e3Party)
    expect(s!.balance).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// GUARDS
// ─────────────────────────────────────────────────────────────
describe('L-02 guards', () => {
  it('piece overlap: a committed piece run over an overlapping window REFUSES', async () => {
    const plan = await planPayrollRun({ mode: 'piece', from: dayAt(-1), to: dayAt(0) })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('double-credit')
    expect((plan as any).error).toMatch(/PR-\d{4}/)
  })

  it('disjoint piece window never hits the OVERLAP refusal', async () => {
    // the dev DB carries seeded production entries in any historical window —
    // the GUARD under test is overlap: a disjoint window must never refuse
    // with 'double-credit' (whether it plans seeded lines or has no activity)
    const plan = await planPayrollRun({ mode: 'piece', from: dayAt(-10), to: dayAt(-5) })
    expect((plan as any).error ?? '').not.toContain('double-credit')
  })

  it('inverted period refuses', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: dayAt(0), to: dayAt(-3) })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('inverted')
  })

  it('zero-activity window refuses honestly', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: '2020-01-01', to: '2020-01-31' })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('No attendance')
  })

  it('wage-0 employees with attendance are NAMED, not silent', async () => {
    // only E4 has attendance in this future window (dailyWage 0)
    const plan = await planPayrollRun({ mode: 'daily', from: dayAt(9), to: dayAt(11) })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('dailyWage 0')
    expect((plan as any).error).toContain(E4)
  })
  it('unknown run refuses to commit', async () => {
    const plan = await planPayrollRunCommit({ runNo: 'PR-9999' })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('not found')
  })

  it('double-commit refuses (terminal)', async () => {
    const committed = runNos[0]
    const plan = await planPayrollRunCommit({ runNo: committed })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('COMMITTED')
  })

  it('draft payslips refuse (404 — numbers must be posted first)', async () => {
    // a fresh DRAFT run over the past window (daily has no overlap guard)
    const plan = await planPayrollRun({ mode: 'daily', from: dayAt(-3), to: dayAt(0) })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-rdraft`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    const draft = await db.payrollRun.findUniqueOrThrow({ where: { id: res.id }, include: { lines: true } })
    expect(draft.status).toBe('draft')
    const slip = await fetchPayslipPrint(draft.lines[0].id)
    expect(slip).toBeNull()
  })

  it('unknown payslip ids → null (404)', async () => {
    expect(await fetchPayslipPrint('no-such-line')).toBeNull()
    expect(await fetchPayslipPrint('PR-0000/EMP-9999')).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────
// REGISTER + WIRING + L-05 CONTRACTS
// ─────────────────────────────────────────────────────────────
describe('L-02 register + wiring', () => {
  it('the payroll register serves runs with mode/status filters + totals', async () => {
    const res = await queryPayrollRuns({ limit: 100, page: 1 })
    const mine = res.rows.filter((r) => runNos.includes(String(r.runNo)))
    expect(mine.length).toBeGreaterThanOrEqual(4)
    expect(mine.every((r) => (r.href as string).startsWith('/hr/payroll/'))).toBe(true)
    const committedRow = mine.find((r) => r.status === 'committed')!
    expect(['piece', 'daily']).toContain(committedRow.mode)
    expect(Number(committedRow.net)).toBeGreaterThan(0)

    const pieceOnly = await queryPayrollRuns({ limit: 100, page: 1, variant: 'piece' })
    expect(pieceOnly.rows.every((r) => r.mode === 'piece')).toBe(true)
    expect((pieceOnly.rows as any[]).find((r) => r.runNo === runNos[2])).toBeTruthy()

    const drafts = await queryPayrollRuns({ limit: 100, page: 1, status: 'draft' })
    expect(drafts.rows.every((r) => r.status === 'draft')).toBe(true)
  })

  it('slug wired: services + configs + LIVE_ROUTES + menu + pages + csv', () => {
    expect(REGISTER_SERVICES['payroll']).toBe(queryPayrollRuns)
    const cfg = getRegisterConfig('payroll')!
    expect(cfg.agentTools).toContain('get_payroll_runs')
    expect(cfg.filters.map((f) => f.key)).toContain('variant')
    expect(LIVE_ROUTES.has('/hr/payroll')).toBe(true)
    expect(LIVE_ROUTES.has('/hr/payroll/[id]')).toBe(true)
    const item = MENU_ITEMS.find((m) => m.id === 'payroll')
    expect(item).toBeTruthy()
    expect(item!.groupId).toBe('hr')
    expect(item!.agentTools).toContain('commit_payroll_run')
    expect(src('src/app/(erp)/hr/payroll/page.tsx')).toContain("getRegisterConfig('payroll')")
    expect(src('src/app/(erp)/hr/payroll/csv/route.ts')).toContain("makeCsvRouteHandler('payroll')")
    expect(src('src/app/(erp)/hr/payroll/[id]/page.tsx')).toContain('commitPayrollRunAction')
    expect(src('src/app/(erp)/hr/payroll/[id]/page.tsx')).toContain('docType="payslip"')
  })

  it('agent tools registered: create_payroll_run + commit_payroll_run + get_payroll_runs (tools 250→253)', () => {
    for (const [name, isWrite] of [['create_payroll_run', true], ['commit_payroll_run', true], ['get_payroll_runs', false]] as const) {
      const tool = allTools.find((t: any) => t.name === name)
      expect(tool, name).toBeTruthy()
      expect((tool as any).domain).toBe('hr')
      expect((tool as any).isWrite).toBe(isWrite)
    }
  })

  it('PROMPT_VERSION bumped + the HR line carries the payroll run', () => {
    expect(PROMPT_VERSION).toBe('m46-2026-09-03')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('create_payroll_run')
    expect(prompt).toContain('commit_payroll_run')
  })

  it('payslip is a NON_CONFIG print door: PRINT_DOCS key + families 24→25', () => {
    expect(PRINT_DOCS['payslip']).toBeTruthy()
    expect(getPrintDocTypes()).toContain('payslip')
    expect(getPrintDocTypes().length).toBe(25)
  })

  it('numbering: SEQUENCES.payroll_run mints PR-####', () => {
    expect(SEQUENCES['payroll_run']).toBeTruthy()
    expect(SEQUENCES['payroll_run'].template).toBe('PR-####')
    expect(SEQUENCES['payroll_run'].model).toBe('payrollRun')
  })
})

describe('L-05 — employee payout fields', () => {
  it('schema: all eight payout columns live on Employee (additive-optional)', () => {
    const schema = src('prisma/schema.prisma')
    for (const col of ['joiningDate', 'designation', 'bankName', 'ifsc', 'accountNo', 'upi', 'phone', 'uan', 'aadhaar']) {
      expect(schema).toContain(col)
    }
    expect(schema).toContain('@@unique([runId, employeeId])')
    expect(schema).toContain('model PayrollRun')
    expect(schema).toContain('model PayrollLine')
  })

  it('master config: fields + list columns (payslips consume them)', () => {
    const names = employeeConfig.fields.map((f) => f.name)
    for (const f of ['joiningDate', 'designation', 'bankName', 'ifsc', 'accountNo', 'upi', 'phone', 'uan', 'aadhaar']) {
      expect(names).toContain(f)
    }
    expect(employeeConfig.listColumns.map((c) => c.field)).toContain('designation')
  })

  it('round-trip: stored FULL (master surface), printed MASKED (payslip surface)', async () => {
    const emp = await db.employee.findUniqueOrThrow({ where: { code: E1 } })
    expect(emp.aadhaar).toBe('483927165384') // stored as given
    expect(emp.uan).toBe('101234567890')
    expect(emp.designation).toBe('Tailor')
    expect(emp.bankName).toBe('SBI')
    // masked on the payslip — asserted in the walkthrough; re-assert the helper
    const fb = src('src/lib/erp/print/fetchers-b.ts')
    expect(fb).toContain('XXXX-XXXX-')
    expect(fb).toContain('maskTail')
  })

  it('update_employee carries the payout fields (the master door extends)', async () => {
    const tool = getTool('update_employee')!
    const schemaJson = JSON.stringify((tool as any).schema)
    expect(schemaJson).toContain('aadhaar')
    expect(schemaJson).toContain('ifsc')
  })
})
