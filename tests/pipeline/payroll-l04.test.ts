/**
 * Payroll L-04 (SPEC-M49, Module L Batch 4) — attendance depth: cross-midnight
 * + overtime, built on M20 attendance, M46 L-02 runs, M48 L-03 statutory:
 *   - PURE computeOtDay: hand-computed (10h/8std/₹800/2× → 2h ₹400; shift-as-
 *     standard; zero guards; the standardHours ≤ 0 fallback kills div-by-zero)
 *     + normalizeOt garbage handling + resolveOtConfig source: option
 *   - THE WALKTHROUGH: post the attendance THROUGH the door (E1 wage 800:
 *     night 22:00→06:00 linked to the 8h night shift = 8h OT 0 · night
 *     22:00→08:00 = 10h → OT 2h = ₹400 · day 06:00→17:00 no shift = 11h vs
 *     the frozen 8h standard → OT 3h = ₹600) + E2 (half with 11h recorded —
 *     the part-wage is the WEIGHT, not the hours; absent) → daily run
 *     ot: true → lines freeze (E1 days 3, otHours 5, otPay 1,000, earned
 *     3,400 = 2,400 base + 1,000 OT; E2 0.5 days, 400, zero OT) + statutory:
 *     true on the SAME run → PF 408/408 + ESI 26/111 → net 2,966 → commit:
 *     J1 2,966 (partyId) + J2 EPFO 912 / ESIC 153 → pay_wages the net →
 *     employee ledger 0 (loop-closure #3 preserved with OT inside earned)
 *   - OT-OFF byte-compat: earned = round(days × wage) EXACTLY (2,400), no
 *     otHours/otPay on the create payload, the nag names the 2 OT-able days
 *   - piece + ot → the loud error; the config freeze (a later multiplier
 *     edit moves the NEXT run, never the drafted one)
 *   - payslip: the OT EARNINGS row (only when otPay > 0) + the OT note
 *   - registers: the day-book OT Hrs column + summary total; the payroll
 *     register's OT ₹ run column
 *   - wiring/source pins: schema + tool docstring + prompt m49 + configs
 * Windows: attendance + runs on [-14,-11] — disjoint from the seed (zero
 * seeded attendance), l02 ([-7,+11]+today), l03 ([-48,-16] daily, [-45,-44]
 * piece, [-15,-14] off — its employees/rows are deleted in ITS afterAll
 * before this file runs) and the attendance unit suite (today).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { planAttendance } from '@/lib/erp/posting/attendance'
import { planPayrollRun, planPayrollRunCommit } from '@/lib/erp/posting/payroll'
import { runCommit } from '@/lib/erp/audit'
import { computeOtDay, normalizeOt, resolveOtConfig, DEFAULT_OT, OT_OPTION_KEY, defaultOtJson } from '@/lib/erp/overtime'
import { DEFAULT_STATUTORY, STATUTORY_OPTION_KEY } from '@/lib/erp/statutory'
import { queryAttendance } from '@/lib/erp/registers/attendance'
import { queryPayrollRuns } from '@/lib/erp/registers/payroll'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { fetchPayslipPrint } from '@/lib/erp/print/fetchers-b'
import { getTool, allTools } from '@/lib/agent/tools'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { PROMPT_VERSION } from '@/lib/agent/prompt'
import { PAYROLL_RUN_SCHEMA } from '@/lib/erp/schemas/payroll'

const TS = Date.now()
const E1 = `M49-E1-${TS}` // wage 800 — the OT walkthrough line
const E2 = `M49-E2-${TS}` // wage 800 — the half/absent no-OT guard line
const NIGHT = `M49-NIGHT-${TS}` // 22:00→06:00, hours 8 — the linked standard
const IDEM = `m49-l04-${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const dayAt = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
// the window (see header — disjoint from seed + l02 + l03 + attendance unit)
const D1 = dayAt(-14), D2 = dayAt(-13), D3 = dayAt(-12)
const W: [string, string] = [D1, D3]

const OT_CFG_JSON = JSON.stringify({ otMultiplier: 2, standardHours: 8 })
const STAT_CFG_JSON = JSON.stringify(DEFAULT_STATUTORY) // PF/ESI on, PT/LWF off — the seeded shape

let e1Id = '', e2Id = '', e1Party = '', e2Party = '', nightShiftId = ''
let runIds: string[] = [] // lines cascade
let runNos: string[] = []
let journalIds: string[] = []
let paymentIds: string[] = []
let empIds: string[] = []

async function commit<T>(planOrPromise: any, idem?: string): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return runCommit(plan, { actorName: 'm49-test', actorSource: 'system', entity: 'payroll_run', ...(idem ? { idempotencyKey: idem } : {}) })
}

beforeAll(async () => {
  // the config rows (restored to the seeded shapes in afterAll)
  await db.appOption.upsert({
    where: { key: OT_OPTION_KEY },
    update: { value: OT_CFG_JSON },
    create: { key: OT_OPTION_KEY, value: OT_CFG_JSON, group: 'payroll', label: 'ot test cfg' },
  })
  await db.appOption.upsert({
    where: { key: STATUTORY_OPTION_KEY },
    update: { value: STAT_CFG_JSON },
    create: { key: STATUTORY_OPTION_KEY, value: STAT_CFG_JSON, group: 'payroll', label: 'stat test cfg' },
  })

  const deptId = (await db.department.findUniqueOrThrow({ where: { code: 'D4' } })).id
  const mk = async (code: string, name: string) => {
    const plan = await planMasterCreate(employeeConfig, { code, name, deptCode: 'D4', role: 'operator', dailyWage: 800 })
    const r: any = await commit(plan, `${IDEM}-${code}`)
    const emp = await db.employee.findUniqueOrThrow({ where: { code }, include: { party: true } })
    void deptId
    return { id: r.id ?? emp.id, partyId: emp.partyId! }
  }
  const a = await mk(E1, `M49 OT One ${TS}`)
  const b = await mk(E2, `M49 OT Two ${TS}`)
  e1Id = a.id; e1Party = a.partyId
  e2Id = b.id; e2Party = b.partyId
  empIds.push(e1Id, e2Id)

  const sh = await db.shift.create({ data: { code: NIGHT, name: `M49 Night ${TS}`, fromTime: '22:00', toTime: '06:00', hours: 8 } })
  nightShiftId = sh.id

  // THE ATTENDANCE — posted through the service door (AT-01 end-to-end):
  // cross-midnight pairs, a shift-linked pair, a half day with times, an absent
  const post = async (attDate: string, entries: any[]) => {
    const plan = await planAttendance({ attDate, entries })
    if (!plan.ok) throw new Error(`attendance plan failed: ${plan.error}`)
    await plan.commit()
  }
  await post(D1, [
    { employeeCode: E1, status: 'present', shiftCode: NIGHT, inTime: '22:00', outTime: '06:00' }, // 8h cross-midnight, OT 0
    { employeeCode: E2, status: 'half', inTime: '06:00', outTime: '17:00' }, // 11h recorded — the weight is the wage basis
  ])
  await post(D2, [
    { employeeCode: E1, status: 'present', shiftCode: NIGHT, inTime: '22:00', outTime: '08:00' }, // 10h cross-midnight → OT 2
    { employeeCode: E2, status: 'absent' },
  ])
  await post(D3, [
    { employeeCode: E1, status: 'present', inTime: '06:00', outTime: '17:00' }, // 11h no-shift → OT 3
  ])
})

afterAll(async () => {
  // configs back to the seeded shapes (other files read them)
  await db.appOption.upsert({
    where: { key: OT_OPTION_KEY },
    update: { value: OT_CFG_JSON },
    create: { key: OT_OPTION_KEY, value: OT_CFG_JSON, group: 'payroll', label: 'ot' },
  })
  await db.appOption.upsert({
    where: { key: STATUTORY_OPTION_KEY },
    update: { value: STAT_CFG_JSON },
    create: { key: STATUTORY_OPTION_KEY, value: STAT_CFG_JSON, group: 'payroll', label: 'statutory' },
  })
  // companions FIRST (PITFALLS #47): the pay_wages payment journals
  const pays = paymentIds.length ? await db.payment.findMany({ where: { id: { in: paymentIds } }, select: { voucherNo: true } }) : []
  if (pays.length) {
    await db.journal.deleteMany({ where: { voucherNo: { in: pays.flatMap((p) => [`JV-${p.voucherNo}`, `CN-${p.voucherNo}`]) } } })
  }
  // the run journals (J1 + J2 — narration references the run)
  if (runNos.length) {
    const js = await db.journal.findMany({ where: { narration: { contains: 'Payroll run' } }, select: { id: true, narration: true } })
    journalIds.push(...js.filter((j) => (j.narration ?? '').includes && runNos.some((rn) => (j.narration ?? '').includes(rn))).map((j) => j.id))
  }
  await db.journal.deleteMany({ where: { id: { in: journalIds } } })
  await db.payrollRun.deleteMany({ where: { id: { in: runIds } } }) // lines cascade
  await db.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } })
  await db.payment.deleteMany({ where: { id: { in: paymentIds } } })
  await db.attendance.deleteMany({ where: { employeeId: { in: empIds } } })
  await db.employee.deleteMany({ where: { id: { in: empIds } } })
  await db.party.deleteMany({ where: { OR: [{ id: e1Party }, { id: e2Party }] } })
  await db.shift.deleteMany({ where: { id: nightShiftId } })
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: IDEM } } })
  await db.$disconnect()
})

// ─────────────────────────────────────────────────────────────
// PURE COMPUTE — hand-computed everywhere (the service owns the math)
// ─────────────────────────────────────────────────────────────
describe('L-04 computeOtDay (pure)', () => {
  it('10h vs 8h standard, ₹800 wage, 2× → 2h OT at ₹100/h × 2 = ₹400', () => {
    const r = computeOtDay(10, 8, 800, 2)
    expect(r.otHours).toBe(2)
    expect(r.otPay).toBe(400)
    expect(r.standard).toBe(8)
  })

  it('exactly the standard → zero (a normal day); a 12h shift standard means 12h is normal (hourly ₹600÷12)', () => {
    expect(computeOtDay(8, 8, 800, 2).otHours).toBe(0)
    expect(computeOtDay(11, 12, 600, 2).otHours).toBe(0)
    const r = computeOtDay(14, 12, 900, 1.5) // 2h beyond at ₹75/h × 1.5
    expect(r.otHours).toBe(2)
    expect(r.otPay).toBe(225)
  })

  it('zero guards: no hours / no wage → zero; standard ≤ 0 falls back to 8 (div-by-zero impossible)', () => {
    expect(computeOtDay(0, 8, 800, 2).otPay).toBe(0)
    expect(computeOtDay(10, 8, 0, 2).otPay).toBe(0)
    const r = computeOtDay(10, 0, 800, 2)
    expect(r.standard).toBe(8)
    expect(r.otHours).toBe(2)
    expect(r.otPay).toBe(400)
  })

  it('2dp hours: 10.25h vs 8 → 2.25h; fractional multipliers pay honestly', () => {
    const r = computeOtDay(10.25, 8, 800, 1.5)
    expect(r.otHours).toBe(2.25)
    expect(r.otPay).toBe(2.25 * 100 * 1.5)
  })
})

describe('L-04 config resolution (the M48 statutory pattern)', () => {
  it('resolveOtConfig reads the AppOption row (source: option)', async () => {
    const { config, source } = await resolveOtConfig()
    expect(source).toBe('option')
    expect(config.otMultiplier).toBe(2)
    expect(config.standardHours).toBe(8)
  })

  it('normalizeOt: garbage falls back field-by-field, never throws; standardHours ≤ 0 → 8', () => {
    expect(normalizeOt(null)).toEqual(DEFAULT_OT)
    expect(normalizeOt({ otMultiplier: 'x', standardHours: -3 })).toEqual(DEFAULT_OT)
    expect(normalizeOt({ otMultiplier: 3 })).toEqual({ otMultiplier: 3, standardHours: 8 })
    expect(normalizeOt({ standardHours: 12 })).toEqual({ otMultiplier: 2, standardHours: 12 })
    expect(defaultOtJson()).toBe(JSON.stringify(DEFAULT_OT))
  })
})

// ─────────────────────────────────────────────────────────────
// THE WALKTHROUGH — cross-midnight posted, OT + statutory run, closures
// ─────────────────────────────────────────────────────────────
describe('L-04 walkthrough: OT daily run + statutory → J1/J2 → ledger 0', () => {
  let runNo = ''

  it('the attendance rows carry the cross-midnight hours (22:00→06:00 = 8h, not rejected)', async () => {
    const rows = await db.attendance.findMany({ where: { employeeId: e1Id }, orderBy: { attDate: 'asc' } })
    expect(rows.length).toBe(3)
    expect(rows[0].hours).toBe(8) // 22:00→06:00 spans the two days
    expect(rows[0].inTime).toBe('22:00')
    expect(rows[0].outTime).toBe('06:00')
    expect(rows[0].shiftId).toBe(nightShiftId)
    expect(rows[1].hours).toBe(10) // 22:00→08:00
    expect(rows[2].hours).toBe(11) // 06:00→17:00, no shift
    const e2rows = await db.attendance.findMany({ where: { employeeId: e2Id }, orderBy: { attDate: 'asc' } })
    expect(e2rows[0].status).toBe('half')
    expect(e2rows[0].hours).toBe(11) // recorded honestly — but half-day wage is the weight
    expect(e2rows[1].status).toBe('absent')
  })

  it('plan: ot: true freezes the config; E1 days 3 + otHours 5 + otPay 1,000 → earned 3,400; E2 half-day no OT', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W[0], to: W[1], ot: true, statutory: true })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    runNo = String((plan.creates!.find((c) => c.table === 'payrollRun')! as any).data.runNo)

    const runCreate = plan.creates!.find((c) => c.table === 'payrollRun') as any
    expect(runCreate.data.ot).toEqual({ otMultiplier: 2, standardHours: 8 }) // FROZEN
    expect(runCreate.data.statutory).toBeTruthy()

    const l1 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e1Id) as any
    expect(l1.data.days).toBe(3)
    expect(l1.data.otHours).toBe(5) // 0 + 2 + 3
    expect(l1.data.otPay).toBe(1000) // 2×100×2 + 3×100×2
    expect(l1.data.earned).toBe(3400) // round(3 × 800) + 1000
    // statutory on the OT-INCLUSIVE earned: PF 408/408 + ESI 26/111
    expect(l1.data.pf).toBe(408)
    expect(l1.data.pfEmployer).toBe(408)
    expect(l1.data.esi).toBe(26)
    expect(l1.data.esiEmployer).toBe(111)
    expect(l1.data.net).toBe(2966) // 3400 − 408 − 26

    const l2 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e2Id) as any
    expect(l2.data.days).toBe(0.5)
    expect(l2.data.otHours).toBe(0) // half day: the weight is the wage basis, not the hours
    expect(l2.data.otPay).toBe(0)
    expect(l2.data.earned).toBe(400)
    expect(l2.data.pf).toBe(48)
    expect(l2.data.net).toBe(349)

    expect((plan as any).text).toContain('OT ₹1,000 (5 h beyond the per-day standard at 2×)')
    expect((plan as any).text).toContain('statutory deductions ₹485')

    // create the run (draft) — the commit test + payslips build on it
    const res: any = await commit(plan, `${IDEM}-r1`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    runNo = res.runNo
  })

  it('commit: J1 = earned − deductions with partyId + J2 per head to the authorities (OT flows inside earned)', async () => {
    const plan = await planPayrollRunCommit({ runNo })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-c1`)
    runIds.push(res.id)
    runNos.push(res.runNo)

    const js = await db.journal.findMany({ where: { narration: { contains: `Payroll run ${res.runNo}` } }, orderBy: { voucherNo: 'asc' } })
    const j1e1 = js.find((j) => j.partyId === e1Party)
    expect(j1e1?.amount).toBe(2966)
    expect(j1e1?.debitAccount).toBe('Staff Salaries')
    expect(j1e1?.creditAccount).toBe('Wage Payable')
    const j1e2 = js.find((j) => j.partyId === e2Party)
    expect(j1e2?.amount).toBe(349)
    // J2 heads: PF (408+48)+(408+48) = 912 → EPFO; ESI (26+3)+(111+13) = 153 → ESIC
    const epfo = await db.party.findUnique({ where: { code: 'EPFO' } })
    const esic = await db.party.findUnique({ where: { code: 'ESIC' } })
    const j2pf = js.find((j) => j.partyId === epfo?.id)
    expect(j2pf?.amount).toBe(912)
    expect(j2pf?.creditAccount).toBe('PF Payable')
    const j2esi = js.find((j) => j.partyId === esic?.id)
    expect(j2esi?.amount).toBe(153)
    expect(j2esi?.creditAccount).toBe('ESI Payable')
  })

  it('payslip: the OT EARNINGS row + the statutory rows sum to earned; the OT note prints', async () => {
    const line = await db.payrollLine.findFirstOrThrow({ where: { runId: runIds[0], employeeId: e1Id } })
    const slip = await fetchPayslipPrint(line.id)
    expect(slip).toBeTruthy()
    const rows = slip!.lines!.rows
    const byName = Object.fromEntries(rows.map((r) => [String(r[0]), String(r[2])]))
    expect(byName['Earnings']).toContain('2,400') // earned − otPay (the base)
    expect(byName['Overtime']).toContain('1,000') // the OT row
    expect(byName['Less: PF (employee)']).toContain('408')
    expect(byName['Less: ESI (employee)']).toContain('26')
    const totals = Object.fromEntries(slip!.totals ?? [])
    expect(String(totals['NET PAYABLE'])).toContain('2,966')
    const notes = slip!.notes!.join(' ')
    expect(notes).toContain('Overtime is paid on PRESENT days with hours beyond the per-day standard')
    // the E2 payslip: NO Overtime row (byte-compat when otPay = 0)
    const line2 = await db.payrollLine.findFirstOrThrow({ where: { runId: runIds[0], employeeId: e2Id } })
    const slip2 = await fetchPayslipPrint(line2.id)
    expect(slip2!.lines!.rows.map((r) => String(r[0]))).not.toContain('Overtime')
  })

  it('LOOP-CLOSURE #3 preserved with OT inside earned: pay_wages the net → employee-party ledger exactly 0', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: E1, amount: 2966, mode: 'cash' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    const s = await getPartyLedgerSummary(e1Party)
    expect(s!.totalJournal).toBe(2966) // J1 only — J2 never touches the employee-party ledger
    expect(s!.totalPaid).toBe(2966)
    expect(s!.balance).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// GUARDS + BYTE-COMPAT + FREEZE
// ─────────────────────────────────────────────────────────────
describe('L-04 guards, byte-compat and the freeze', () => {
  it('piece + ot is a LOUD error (no attendance basis), not a silent ignore', async () => {
    const plan = await planPayrollRun({ mode: 'piece', from: W[0], to: W[1], ot: true })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.error).toContain('only valid on a DAILY run')
  })

  it('OT-OFF byte-compat: earned = round(days × wage) EXACTLY, no OT fields on the create payload, the nag names the OT-able days', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W[0], to: W[1] })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const l1 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e1Id) as any
    expect(l1.data.earned).toBe(2400) // M46 arithmetic — the OT never silently applies
    expect(l1.data.net).toBe(2400)
    expect(l1.data.otHours).toBeUndefined()
    expect(l1.data.otPay).toBeUndefined()
    expect(l1.data.deductions ?? 0).toBe(0)
    expect((plan.creates!.find((c) => c.table === 'payrollRun')! as any).data.ot).toBeUndefined()
    // the nag: 2 present days carry hours beyond the per-day standard
    expect((plan as any).text).toContain('pass ot: true to pay overtime')
  })

  it('THE FREEZE: a multiplier edit after the plan moves the NEXT run, never the drafted/committed one', async () => {
    // run A is committed with 2× (otPay 1,000) — mutate the live config to 3×
    await db.appOption.update({ where: { key: OT_OPTION_KEY }, data: { value: JSON.stringify({ otMultiplier: 3, standardHours: 8 }) } })
    const live = await resolveOtConfig()
    expect(live.config.otMultiplier).toBe(3)

    // the committed run's lines are FROZEN — earned still 3,400
    const lineA = await db.payrollLine.findFirstOrThrow({ where: { runId: runIds[0], employeeId: e1Id } })
    expect(lineA.otPay).toBe(1000)
    expect(lineA.earned).toBe(3400)

    // a NEW plan over the same window picks the LIVE 3× (2h+3h) × ₹100 × 3 = 1,500
    const planB = await planPayrollRun({ mode: 'daily', from: W[0], to: W[1], ot: true })
    expect(planB.ok).toBe(true)
    if (planB.ok) {
      const l1 = planB.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === e1Id) as any
      expect(l1.data.otPay).toBe(1500)
      expect(l1.data.earned).toBe(3900)
      expect((planB.creates!.find((c) => c.table === 'payrollRun')! as any).data.ot.otMultiplier).toBe(3)
    }
    // restore the seeded shape for the wiring section below
    await db.appOption.update({ where: { key: OT_OPTION_KEY }, data: { value: OT_CFG_JSON } })
  })
})

// ─────────────────────────────────────────────────────────────
// REGISTERS — the day-book OT column + the payroll OT ₹ column
// ─────────────────────────────────────────────────────────────
describe('L-04 registers: the OT surfaces', () => {
  it('the attendance day-book: OT Hrs per present row (shift standard else live config), null otherwise; the summary total', async () => {
    const res = await queryAttendance({ limit: 50, page: 1, from: new Date(`${W[0]}T00:00:00.000Z`), to: new Date(`${W[1]}T00:00:00.000Z`) } as any)
    const e1rows = res.rows.filter((r) => r.code === E1).sort((a: any, b: any) => new Date(a.attDate as any).getTime() - new Date(b.attDate as any).getTime())
    expect(e1rows.length).toBe(3)
    expect(e1rows[0].otHrs).toBe(0) // 8h vs the 8h shift standard
    expect(e1rows[1].otHrs).toBe(2) // 10h vs the 8h shift standard
    expect(e1rows[2].otHrs).toBe(3) // 11h vs the live 8h fallback
    const e2rows = res.rows.filter((r) => r.code === E2)
    expect(e2rows.every((r) => r.otHrs == null)).toBe(true) // half/absent — no OT display
    expect(res.summary).toContain('OT 5 h beyond standard')
    const totals = Object.fromEntries((res.totals ?? []).map((t) => [t.label, t.value]))
    expect(Number(totals['OT hrs'])).toBe(5)
  })

  it('the payroll register: the OT ₹ run column + the incl-OT summary', async () => {
    const res = await queryPayrollRuns({ limit: 200, page: 1, q: runNos[0] } as any)
    const row = res.rows.find((r) => r.runNo === runNos[0]) as any
    expect(row).toBeTruthy()
    expect(row.ot).toBe(1000)
    expect(res.summary).toContain('incl. OT')
  })
})

// ─────────────────────────────────────────────────────────────
// WIRING + SOURCE PINS
// ─────────────────────────────────────────────────────────────
describe('L-04 wiring + source pins', () => {
  it('schema + tool docstring + form door + actions carry the ot flag', () => {
    expect(JSON.stringify(PAYROLL_RUN_SCHEMA.shape)).toContain('ot')
    const createDesc = allTools.find((t: any) => t.name === 'create_payroll_run')!.description
    expect(createDesc).toContain('ot: true')
    const postDesc = allTools.find((t: any) => t.name === 'post_attendance')!.description
    expect(postDesc).toContain('CROSS-MIDNIGHT')
    const listDesc = allTools.find((t: any) => t.name === 'list_attendance')!.description
    expect(listDesc).toContain('OT hours')
    expect(allTools.length).toBe(261) // + M50 M-01 create/update/list_account
    expect(src('src/app/(erp)/hr/payroll/actions.ts')).toContain("fd.get('ot')")
    expect(src('src/app/(erp)/hr/payroll/page.tsx')).toContain('name="ot"')
  })

  it('register configs carry the OT columns; the run view carries the OT card', () => {
    const attCfg = getRegisterConfig('attendance')!
    expect(attCfg.columns.map((c) => c.name)).toContain('otHrs')
    const payCfg = getRegisterConfig('payroll')!
    expect(payCfg.columns.map((c) => c.name)).toContain('ot')
    expect(src('src/app/(erp)/hr/payroll/[id]/page.tsx')).toContain('Overtime (SPEC-M49 L-04)')
    expect(src('src/app/(erp)/hr/payroll/[id]/page.tsx')).toContain('OT ₹')
  })

  it('prompt m49 + the HR line carries the OT door; the config door hint', () => {
    expect(PROMPT_VERSION).toBe('m50-2026-09-06')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('ot: true on DAILY runs')
    expect(prompt).toContain('cross-midnight')
    expect(src('src/app/(erp)/admin/options/page.tsx')).toContain('attendance:ot')
    expect(src('scripts/seed.ts')).toContain('attendance:ot')
  })
})
