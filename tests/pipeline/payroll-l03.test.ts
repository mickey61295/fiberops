/**
 * Payroll L-03 (SPEC-M47, Module L Batch 3) — statutory payroll:
 *   - ZERO-CONFIG regression: heads disabled ⇒ plan text/sideEffects/net
 *     are M46-identical (statDeduction 0, no statutory section)
 *   - THE STATUTORY WALKTHROUGH: config on (PF/ESI/PT/LWF) → plan freezes
 *     the legs → commit posts wage journals (partySide 'credit') + per-head
 *     deduction journals (Dr Wage Payable / Cr head Payable, partySide
 *     'debit') → party-ledger totalJournal = earned − statutory → pay_wages
 *     the net → balance EXACTLY 0 (loop-closure #3 WITH statutory)
 *   - applicability matrix: PF needs a UAN (named skip), ESI gross ≤
 *     threshold (over-threshold named), PT single slab above threshold
 *     (boundary: = threshold ⇒ 0), PF wage ceiling cap, PT/LWF × months
 *     on a multi-month window
 *   - the side-aware ledger: legacy rows (partySide null) count credit-side
 *     (M45 behavior pinned), debit-side rows net POSITIVE
 *   - register + challan: committed-only, variant=head filters, UAN/esiNo +
 *     PF breakdown (EPS/EPF/EDLI/admin) on the rows
 *   - config round-trip: setStatutory/getStatutory, unknown + negative
 *     rejected, getStatutoryPure never writes
 *   - wiring/source pins: schema columns, registry, menu, routes, tools,
 *     PROMPT_VERSION m47
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { planPayrollRun, planPayrollRunCommit, STAT_HEADS } from '@/lib/erp/posting/payroll'
import { runCommit } from '@/lib/erp/audit'
import { setStatutory, getStatutory, getStatutoryPure, STAT_DEFS } from '@/lib/erp/statutory'
import { queryStatutoryRegister } from '@/lib/erp/registers/statutory'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { fetchPayslipPrint } from '@/lib/erp/print/fetchers-b'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { MENU_ITEMS, LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { allTools, getTool } from '@/lib/agent/tools'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const S1 = `M47-S1-${TS}` // daily WITH UAN + esiNo (the walkthrough line)
const S2 = `M47-S2-${TS}` // daily, NO UAN (PF-skip named) + PT boundary (= threshold)
const S3 = `M47-S3-${TS}` // high-wage daily (ceiling cap + ESI over-threshold)
const S4 = `M47-S4-${TS}` // multi-month employee (Jul + Aug attendance)
const LP = `M47-PL-${TS}` // throwaway party (the side-aware ledger pin)
const IDEM = `m47-l03-${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')

// FIXED dates (deterministic month counts — wall-clock months would drift)
const AUG = [3, 4, 5].map((d) => `2026-08-0${d}`) // S1: 2 present + 1 half
const augAt = (d: number) => new Date(`2026-08-${String(d).padStart(2, '0')}T00:00:00.000Z`)
const julAt = (d: number) => new Date(`2026-07-${String(d).padStart(2, '0')}T00:00:00.000Z`)
const W_FROM = '2026-08-01'
const W_TO = '2026-08-31'

let s1Id = '', s2Id = '', s3Id = '', s4Id = ''
let s1Party = '', s2Party = '', s3Party = '', s4Party = ''
let lpId = ''
let runIds: string[] = []
let runNos: string[] = []
let journalIds: string[] = []
let paymentIds: string[] = []

async function commit<T>(planOrPromise: any, idem?: string): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return runCommit(plan, { actorName: 'm47-test', actorSource: 'system', entity: 'payroll_run', ...(idem ? { idempotencyKey: idem } : {}) })
}

beforeAll(async () => {
  // stat rows ABSENT at start (pure defaults, every head disabled) — the
  // zero-config describe pins M46-identical behavior on that state.
  await db.appOption.deleteMany({ where: { key: { startsWith: 'stat:' } } })

  // S1 — the walkthrough employee (UAN enrols PF; esiNo for the register)
  const p1 = await planMasterCreate(employeeConfig, {
    code: S1, name: `M47 Stat One ${TS}`, deptCode: 'D4', role: 'operator', dailyWage: 500,
    uan: '100111222333', esiNo: '4455667788',
  })
  const r1: any = await commit(p1, `${IDEM}-s1`)
  s1Id = r1.id
  s1Party = (await db.employee.findUniqueOrThrow({ where: { code: S1 } })).partyId!

  // S2 — NO UAN (the PF-skip guard) + earned exactly at the PT threshold
  const p2 = await planMasterCreate(employeeConfig, { code: S2, name: `M47 No UAN ${TS}`, deptCode: 'D4', role: 'operator', dailyWage: 500 })
  const r2: any = await commit(p2, `${IDEM}-s2`)
  s2Id = r2.id
  s2Party = (await db.employee.findUniqueOrThrow({ where: { code: S2 } })).partyId!

  // S3 — high wage (PF ceiling cap + ESI over-threshold)
  const p3 = await planMasterCreate(employeeConfig, { code: S3, name: `M47 High Wage ${TS}`, deptCode: 'D4', role: 'supervisor', dailyWage: 5000, uan: '100111222344' })
  const r3: any = await commit(p3, `${IDEM}-s3`)
  s3Id = r3.id
  s3Party = (await db.employee.findUniqueOrThrow({ where: { code: S3 } })).partyId!

  // S4 — the multi-month employee (Jul + Aug attendance)
  const p4 = await planMasterCreate(employeeConfig, { code: S4, name: `M47 Multi Month ${TS}`, deptCode: 'D4', role: 'operator', dailyWage: 500, uan: '100111222355' })
  const r4: any = await commit(p4, `${IDEM}-s4`)
  s4Id = r4.id
  s4Party = (await db.employee.findUniqueOrThrow({ where: { code: S4 } })).partyId!

  await db.attendance.createMany({
    data: [
      // S1: 2 present + 1 half = 2.5 days × ₹500 = ₹1,250
      { employeeId: s1Id, attDate: augAt(3), status: 'present' },
      { employeeId: s1Id, attDate: augAt(4), status: 'present' },
      { employeeId: s1Id, attDate: augAt(5), status: 'half' },
      // S2: 2 present = ₹1,000 (exactly the PT threshold)
      { employeeId: s2Id, attDate: augAt(3), status: 'present' },
      { employeeId: s2Id, attDate: augAt(4), status: 'present' },
      // S3: 4 present × ₹5,000 = ₹20,000
      { employeeId: s3Id, attDate: augAt(3), status: 'present' },
      { employeeId: s3Id, attDate: augAt(4), status: 'present' },
      { employeeId: s3Id, attDate: augAt(5), status: 'present' },
      { employeeId: s3Id, attDate: augAt(6), status: 'present' },
      // S4: Jul 21 + Jul 22 + Aug 1 = 3 days × ₹500 = ₹1,500
      { employeeId: s4Id, attDate: julAt(21), status: 'present' },
      { employeeId: s4Id, attDate: julAt(22), status: 'present' },
      { employeeId: s4Id, attDate: augAt(1), status: 'present' },
    ],
  })
})

afterAll(async () => {
  // restore the statutory config to ABSENT (pure defaults, all heads off —
  // the seeded 'stat:' rows this test wrote are TEST artifacts)
  await db.appOption.deleteMany({ where: { key: { startsWith: 'stat:' } } })

  // companions FIRST (PITFALLS #47 — a payment deleted without its JV-CN
  // pair orphans the number and kills parallel workers' re-resolution)
  const pays = paymentIds.length
    ? await db.payment.findMany({ where: { id: { in: paymentIds } }, select: { voucherNo: true } })
    : []
  if (pays.length) {
    await db.journal.deleteMany({ where: { voucherNo: { in: pays.flatMap((p) => [`JV-${p.voucherNo}`, `CN-${p.voucherNo}`]) } } })
  }
  if (runNos.length) {
    const js = await db.journal.findMany({ where: { narration: { contains: 'Payroll run' } }, select: { id: true, narration: true } })
    const mine = js.filter((j) => runNos.some((rn) => j.narration.includes(rn))).map((j) => j.id)
    journalIds.push(...mine)
  }
  await db.journal.deleteMany({ where: { id: { in: journalIds } } })
  await db.payrollRun.deleteMany({ where: { id: { in: runIds } } }) // lines cascade
  await db.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } })
  await db.payment.deleteMany({ where: { id: { in: paymentIds } } })
  await db.attendance.deleteMany({ where: { employeeId: { in: [s1Id, s2Id, s3Id, s4Id] } } })
  await db.employee.deleteMany({ where: { id: { in: [s1Id, s2Id, s3Id, s4Id] } } })
  await db.party.deleteMany({ where: { id: { in: [s1Party, s2Party, s3Party, s4Party, lpId] } } })
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: 'm47-l03-' } } })
  await db.$disconnect()
})

// ─────────────────────────────────────────────────────────────
// ZERO-CONFIG — heads disabled ⇒ M46-identical (the regression pin)
// ─────────────────────────────────────────────────────────────
describe('L-03 zero-config regression: no statutory section anywhere', () => {
  it('plan with every head disabled: statDeduction 0, net = earned − advances, NO statutory text/sideEffects', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_FROM, to: W_TO })
    expect(plan.ok).toBe(true)
    const s1Line = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s1Id) as any
    expect(s1Line).toBeTruthy()
    expect(s1Line.data.net).toBe(1250)
    expect(s1Line.data.statDeduction).toBe(0)
    expect(s1Line.data.pfEe).toBe(0)
    expect(plan.text).not.toContain('statutory')
    expect(plan.sideEffects!.some((s) => s.includes('statutory'))).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────
// THE STATUTORY WALKTHROUGH (spec §6-2)
// ─────────────────────────────────────────────────────────────
describe('L-03 statutory walkthrough: config on → plan → commit → ledger 0 → payslip', () => {
  let runNo = '', s1LineId = ''

  it('arm all four heads (setStatutory; thresholds tuned for the matrix)', async () => {
    await setStatutory('pf.enabled', true)
    await setStatutory('esi.enabled', true)
    await setStatutory('esi.wageThreshold', 1500) // S1/S2/S4 covered; S3 over
    await setStatutory('pt.enabled', true)
    await setStatutory('pt.threshold', 1000) // S2's 1000 = boundary (NOT >)
    await setStatutory('lwf.enabled', true)
    const cfg = await getStatutory()
    expect(cfg['pf.enabled']).toBe(true)
    expect(cfg['esi.wageThreshold']).toBe(1500)
    expect(cfg['pt.threshold']).toBe(1000)
    expect(cfg['pf.eeRate']).toBe(12) // registry default untouched
  })

  it('plan computes + freezes the S1 legs: PF 150 / ESI 9 / PT 208 / LWF 20 → deduction 387, net 863', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_FROM, to: W_TO })
    expect(plan.ok).toBe(true)
    const s1 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s1Id) as any
    // PF: 1250 ≤ ceiling → wages 1250; ee 12% = 150; er 12% = 150 (eps 104 + epf 46); edli 6; admin 6
    expect(s1.data.pfWages).toBe(1250)
    expect(s1.data.pfEe).toBe(150)
    expect(s1.data.pfEr).toBe(150)
    expect(s1.data.pfEps).toBe(104)
    expect(s1.data.pfEpf).toBe(46)
    expect(s1.data.pfEdli).toBe(6)
    expect(s1.data.pfAdmin).toBe(6)
    // ESI: 1250 ≤ 1500 → ee 0.75% = 9, er 3.25% = 41
    expect(s1.data.esiEe).toBe(9)
    expect(s1.data.esiEr).toBe(41)
    // PT: 1250 > 1000 → 208 × 1 month; LWF: 20 × 1
    expect(s1.data.ptAmt).toBe(208)
    expect(s1.data.lwfEe).toBe(20)
    expect(s1.data.lwfEr).toBe(20)
    expect(s1.data.statDeduction).toBe(387)
    expect(s1.data.net).toBe(863)
    expect(plan.text).toContain('statutory deduction')
    expect(plan.summary).toContain('statutory')
    expect(plan.sideEffects!.some((s) => s.includes('partySide debit'))).toBe(true)
  })

  it('plan NAMES the gaps: S2 without UAN (no PF leg) + S3 over the ESI threshold (no ESI leg)', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_FROM, to: W_TO })
    expect(plan.ok).toBe(true)
    expect(plan.text).toContain('without UAN')
    expect(plan.text).toContain('over the ESI threshold')
  })

  it('commit: wage journals (partySide credit) + 12 deduction journals (partySide debit, Cr head payables)', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_FROM, to: W_TO })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-r1`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    runNo = res.runNo
    expect(res.statutory).toBe(387 + 28 + 2028 + 84) // S1+S2+S3+S4 deductions
    const cPlan = await planPayrollRunCommit({ runNo })
    expect(cPlan.ok).toBe(true)
    const cres: any = await commit(cPlan, `${IDEM}-c1`)
    expect(cres.status).toBe('committed')
    expect(cres.journals).toBe(4) // one wage journal per line
    expect(cres.deductionJournals).toBe(12) // S1×4 + S2×2 + S3×3 + S4×3
    // the S1 wage journal — Dr Staff Salaries / Cr Wage Payable, partySide credit
    const wj = await db.journal.findFirstOrThrow({
      where: { partyId: s1Party, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable', amount: 1250 },
    })
    expect(wj.partySide).toBe('credit')
    journalIds.push(wj.id)
    // the four S1 deduction journals — Dr Wage Payable / Cr <head> Payable, partySide debit
    const dj = await db.journal.findMany({
      where: { partyId: s1Party, debitAccount: 'Wage Payable', voucherType: 'journal' },
    })
    const byCredit: Record<string, number> = {}
    for (const j of dj) { byCredit[j.creditAccount] = j.amount; journalIds.push(j.id) }
    expect(byCredit['PF Payable']).toBe(150)
    expect(byCredit['ESI Payable']).toBe(9)
    expect(byCredit['PT Payable']).toBe(208)
    expect(byCredit['LWF Payable']).toBe(20)
    expect(dj.every((j) => j.partySide === 'debit')).toBe(true)
    expect(dj.every((j) => j.narration!.includes(`Payroll run ${runNo}`))).toBe(true)
    expect(dj.every((j) => j.narration!.includes('statutory'))).toBe(true)
    const line = await db.payrollLine.findFirstOrThrow({ where: { runId: res.id, employeeId: s1Id } })
    s1LineId = line.id
  })

  it('party-ledger journals term is SIDE-AWARE: totalJournal = 1,250 − 387 = 863', async () => {
    const s = await getPartyLedgerSummary(s1Party)
    expect(s!.totalJournal).toBe(863)
    expect(s!.balance).toBe(-863) // still owed the net (nothing paid yet)
  })

  it('LOOP CLOSURE WITH STATUTORY: pay_wages the net 863 → balance EXACTLY 0', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: S1, amount: 863, mode: 'cash' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    const s = await getPartyLedgerSummary(s1Party)
    expect(s!.totalPaid).toBe(863)
    expect(s!.balance).toBe(0) // −earned + statutory + advances + net = 0
  })

  it('payslip: deduction rows + employer-contributions note + NET PAYABLE 863', async () => {
    const doc = await fetchPayslipPrint(s1LineId)
    expect(doc).toBeTruthy()
    const rows = doc!.lines.rows.map((r) => r as unknown as string[])
    expect(rows.some((r) => r[0] === 'Less: PF (employee share)' && r[2] === '₹-150')).toBe(true)
    expect(rows.some((r) => r[0] === 'Less: ESI (employee share)' && r[2] === '₹-9')).toBe(true)
    expect(rows.some((r) => r[0] === 'Less: professional tax' && r[2] === '₹-208')).toBe(true)
    expect(rows.some((r) => r[0] === 'Less: LWF (employee share)' && r[2] === '₹-20')).toBe(true)
    expect(doc!.totals.some(([label, v]) => label === 'NET PAYABLE' && v === '₹863')).toBe(true)
    expect(doc!.notes!.some((n) => n.includes('Statutory deductions ₹387'))).toBe(true)
    expect(doc!.notes!.some((n) => n.includes('Employer contributions'))).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// THE APPLICABILITY + MATH MATRIX (spec §6-3)
// ─────────────────────────────────────────────────────────────
describe('L-03 applicability matrix: UAN / ESI threshold / PT boundary / ceiling / months', () => {
  it('S2 (no UAN, earned 1,000): PF 0 (named), ESI 8, PT 0 (= threshold, NOT >), LWF 20 → deduction 28', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_FROM, to: W_TO })
    const s2 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s2Id) as any
    expect(s2.data.pfWages).toBe(0)
    expect(s2.data.pfEe).toBe(0)
    expect(s2.data.esiEe).toBe(8)
    expect(s2.data.ptAmt).toBe(0) // 1000 is NOT > 1000 — the boundary
    expect(s2.data.lwfEe).toBe(20)
    expect(s2.data.statDeduction).toBe(28)
    expect(s2.data.net).toBe(972)
  })

  it('S3 (earned 20,000, UAN): PF wages CEILING-CAPPED at 15,000 → pfEe 1,800; ESI skipped (over threshold); PT 208', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_FROM, to: W_TO })
    const s3 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s3Id) as any
    expect(s3.data.pfWages).toBe(15000)
    expect(s3.data.pfEe).toBe(1800)
    expect(s3.data.pfEps).toBe(1250)
    expect(s3.data.pfEpf).toBe(550)
    expect(s3.data.esiEe).toBe(0)
    expect(s3.data.esiEr).toBe(0)
    expect(s3.data.ptAmt).toBe(208)
    expect(s3.data.statDeduction).toBe(2028)
    expect(s3.data.net).toBe(17972)
  })

  it('multi-month window (Jul 15 → Aug 5, 2 months): PT and LWF × 2 (S4: PT 416, LWF 40)', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: '2026-07-15', to: '2026-08-05' })
    expect(plan.ok).toBe(true)
    const s4 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s4Id) as any
    expect(s4.data.earned).toBe(1500)
    expect(s4.data.ptAmt).toBe(416) // 208 × 2 months
    expect(s4.data.lwfEe).toBe(40)
    expect(s4.data.lwfEr).toBe(40)
    expect(s4.data.esiEe).toBe(11) // 1500 ≤ 1500 — the ESI boundary (covered)
    expect(s4.data.pfEe).toBe(180)
  })
})

// ─────────────────────────────────────────────────────────────
// THE SIDE-AWARE LEDGER (spec §6-6)
// ─────────────────────────────────────────────────────────────
describe('L-03 side-aware ledger: legacy rows count credit-side, debit rows net positive', () => {
  it('null partySide (legacy) = +amount (M45 behavior); debit = −amount; json SHAPE unchanged', async () => {
    const lp = await db.party.create({ data: { code: LP, name: `M47 Ledger Probe ${TS}` } })
    lpId = lp.id
    const legacy = await db.journal.create({
      data: { voucherNo: 'M47L1' + TS, voucherType: 'journal', partyId: lpId, date: new Date(), finYear: '26-27', debitAccount: 'Suspense', creditAccount: 'Party Dues', amount: 100, narration: 'm47 legacy probe (no partySide)' },
    })
    const debit = await db.journal.create({
      data: { voucherNo: 'M47L2' + TS, voucherType: 'journal', partyId: lpId, partySide: 'debit', date: new Date(), finYear: '26-27', debitAccount: 'Party Dues', creditAccount: 'PF Payable', amount: 40, narration: 'm47 debit probe' },
    })
    journalIds.push(legacy.id, debit.id)
    const s = await getPartyLedgerSummary(lpId)
    expect(s!.totalJournal).toBe(60) // 100 (null = credit) − 40 (debit)
    expect(s).toHaveProperty('totalBilled')
    expect(s).toHaveProperty('totalDebit')
    expect(s).toHaveProperty('totalReceived')
    expect(s).toHaveProperty('totalPaid')
    expect(s).toHaveProperty('balance') // the frozen M45 json SHAPE
  })
})

// ─────────────────────────────────────────────────────────────
// REGISTER + CHALLAN (spec §6-5)
// ─────────────────────────────────────────────────────────────
describe('L-03 statutory register + challan data', () => {
  it('committed-only: the walkthrough run lines appear (4), the multi-month plan adds none', async () => {
    // a draft run (multi-month) — committed-only register must ignore it
    const plan = await planPayrollRun({ mode: 'daily', from: '2026-07-15', to: '2026-08-05' })
    const res: any = await commit(plan, `${IDEM}-r2`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    const all = await queryStatutoryRegister({ limit: 100, page: 1 })
    expect(all.count).toBe(4) // draft run's 4 lines EXCLUDED
    const s1Row = all.rows.find((r) => String(r.employee).includes(S1))!
    expect(s1Row).toBeTruthy()
    expect(s1Row.gross).toBe(1250)
    expect(s1Row.pfEe).toBe(150)
    expect(s1Row.pfEps).toBe(104) // the challan breakdown rides the rows
    expect(s1Row.pfEpf).toBe(46)
    expect(s1Row.pfEdli).toBe(6)
    expect(s1Row.pfAdmin).toBe(6)
    expect(s1Row.uan).toBe('100111222333')
    expect(s1Row.esiNo).toBe('4455667788')
    expect(s1Row.deduction).toBe(387)
    expect(s1Row.net).toBe(863)
    expect(all.summary).toContain('deduction')
  })

  it('variant=head filters: pf → 3 rows (S2 has no PF), esi → 3, pt → 2, lwf → 4', async () => {
    const pf = await queryStatutoryRegister({ variant: 'pf', limit: 100, page: 1 })
    expect(pf.count).toBe(3)
    expect(pf.rows.every((r) => (r.pfEe as number) > 0 || (r.pfEr as number) > 0)).toBe(true)
    const esi = await queryStatutoryRegister({ variant: 'esi', limit: 100, page: 1 })
    expect(esi.count).toBe(3)
    const pt = await queryStatutoryRegister({ variant: 'pt', limit: 100, page: 1 })
    expect(pt.count).toBe(2)
    const lwf = await queryStatutoryRegister({ variant: 'lwf', limit: 100, page: 1 })
    expect(lwf.count).toBe(4)
  })

  it('q filter (employee code) + from/to window (run period overlap)', async () => {
    const byQ = await queryStatutoryRegister({ q: S3, limit: 100, page: 1 })
    expect(byQ.count).toBe(1)
    expect(String(byQ.rows[0].employee)).toContain(S3)
    const future = await queryStatutoryRegister({ from: new Date('2026-09-01'), limit: 100, page: 1 })
    expect(future.count).toBe(0) // Aug runs do not overlap Sep 1+
  })

  it('config round-trip: setStatutory + getStatutory; unknown + negative rejected; pure read never writes', async () => {
    await setStatutory('pt.monthlyAmount', 250)
    const cfg = await getStatutory()
    expect(cfg['pt.monthlyAmount']).toBe(250)
    await setStatutory('pt.monthlyAmount', 208) // restore
    await expect(setStatutory('gst.rate', 18)).rejects.toThrow(/Unknown statutory config/)
    await expect(setStatutory('pf.eeRate', -5)).rejects.toThrow(/cannot be negative/)
    // pure read: delete a row, the default fills WITHOUT re-seeding
    await db.appOption.deleteMany({ where: { key: 'stat:pf.adminRate' } })
    const pure = await getStatutoryPure()
    expect(pure['pf.adminRate']).toBe(0.5) // registry default, no write
    expect(await db.appOption.count({ where: { key: 'stat:pf.adminRate' } })).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// WIRING + SOURCE PINS (spec §6-7)
// ─────────────────────────────────────────────────────────────
describe('L-03 wiring + source pins', () => {
  it('statutory.ts registry: 17 defs, every head ships DISABLED by default', () => {
    expect(STAT_DEFS.length).toBe(17)
    const enabledDefs = STAT_DEFS.filter((d) => d.name.endsWith('.enabled'))
    expect(enabledDefs.length).toBe(4)
    expect(enabledDefs.every((d) => d.value === 'false')).toBe(true)
  })

  it('schema: PayrollLine statutory columns + Journal.partySide + Employee.esiNo', () => {
    const schema = src('prisma/schema.prisma')
    for (const col of ['pfWages', 'pfEe', 'pfEr', 'pfEps', 'pfEpf', 'pfEdli', 'pfAdmin', 'esiEe', 'esiEr', 'ptAmt', 'lwfEe', 'lwfEr', 'statDeduction']) {
      expect(new RegExp(`${col}\\s+Float\\s+@default\\(0\\)`).test(schema)).toBe(true)
    }
    expect(new RegExp('partySide\\s+String\?').test(schema)).toBe(true)
    expect(new RegExp('esiNo\\s+String\?').test(schema)).toBe(true)
  })

  it('posting/payroll.ts: deduction journals, partySide stamping, STAT_HEADS', () => {
    const code = src('src/lib/erp/posting/payroll.ts')
    expect(code).toContain("partyId: j.partyId, partySide: 'credit'")
    expect(code).toContain("partyId: d.partyId, partySide: 'debit'")
    expect(code).toContain("debitAccount: 'Wage Payable', creditAccount: d.account")
    expect(code).toContain('getStatutoryPure')
    expect(STAT_HEADS.map((h) => h.account)).toEqual(['PF Payable', 'ESI Payable', 'PT Payable', 'LWF Payable'])
  })

  it('party-ledger is side-aware (both queries)', () => {
    const code = src('src/lib/erp/registers/party-ledger.ts')
    expect(code).toContain("s + (j.partySide === 'debit' ? -j.amount : j.amount)")
    expect(code).toContain("a.journals += j.partySide === 'debit' ? -j.amount : j.amount")
    expect(code).toContain('partySide: true') // the aggregate select carries the side
  })

  it('employee master-config carries esiNo; payslip prints the deduction rows', () => {
    expect(employeeConfig.fields.some((f) => f.name === 'esiNo')).toBe(true)
    const payslip = src('src/lib/erp/print/fetchers-b.ts')
    expect(payslip).toContain("'Less: PF (employee share)'")
    expect(payslip).toContain('statDeduction')
  })

  it('register wiring: slug + service + config + csv twin (variant-aware challan)', () => {
    expect(REGISTER_SERVICES['statutory']).toBeTruthy()
    const cfg = getRegisterConfig('statutory')!
    expect(cfg.slug).toBe('statutory')
    expect(cfg.agentTools).toContain('get_statutory_register')
    expect(cfg.columns.length).toBe(15)
    const csvRoute = src('src/app/(erp)/hr/statutory/csv/route.ts')
    expect(csvRoute).toContain("params.variant === 'pf'")
    expect(csvRoute).toContain("{ label: 'ER EPS', key: 'pfEps' }")
    expect(csvRoute).toContain("{ label: 'IP No', key: 'esiNo' }")
  })

  it('menu 144 + items statutory/statutory-rates; LIVE_ROUTES 180 + both routes', () => {
    expect(MENU_ITEMS.length).toBe(144) // M47 L-03: +statutory +statutory-rates
    expect(MENU_ITEMS.find((m) => m.id === 'statutory')?.route).toBe('/hr/statutory')
    expect(MENU_ITEMS.find((m) => m.id === 'statutory-rates')?.route).toBe('/admin/statutory')
    expect(LIVE_ROUTES.size).toBe(180)
    expect(LIVE_ROUTES.has('/hr/statutory')).toBe(true)
    expect(LIVE_ROUTES.has('/admin/statutory')).toBe(true)
  })

  it('tools 254 + get_statutory_register (hr domain, read tool) + label', async () => {
    expect(allTools.length).toBe(254) // M47 L-03: +get_statutory_register
    const tool = getTool('get_statutory_register')!
    expect(tool.domain).toBe('hr')
    expect(tool.isWrite).toBe(false)
    const labels = src('src/lib/agent/tool-labels.ts')
    expect(labels).toContain("get_statutory_register: 'Statutory register'")
  })

  it('PROMPT_VERSION m47 + the §1 HR line names the statutory register', () => {
    expect(PROMPT_VERSION).toBe('m47-2026-09-08')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('get_statutory_register')
    expect(prompt).toContain('/admin/statutory')
  })
})
