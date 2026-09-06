/**
 * Payroll L-03 (SPEC-M48, Module L Batch 3) — statutory PF/ESI/PT/LWF on the
 * payroll run, built on the M46 L-02 run + the M45 employee-party link:
 *   - PURE computeStatutory: hand-computed heads (PF ceiling, ESI gross
 *     limit skip, PT threshold, LWF flat, cap-at-earned in pf→esi→pt→lwf
 *     order), config resolve fallbacks
 *   - THE WALKTHROUGH: daily run statutory: true → rates FROZEN on the run →
 *     per-line deductions (S1 1250 → PF 150 + ESI 9 + LWF 20 = 179 → net
 *     1,071; S2 22,500 → ESI skipped over limit, PF on the 15,000 ceiling →
 *     net 20,480; S3 100 → capped to 100, net 0) → commit: J1 = earned −
 *     deductions with partyId (S3's skipped) + J2 per head to the authority
 *     parties → pay_wages the net → employee ledger 0 (loop-closure #3
 *     preserved) → EPFO pending 3,924 → record_payment the remittance →
 *     EPFO ledger 0 (LOOP-CLOSURE #4, the remittance tracker)
 *   - PIECE + statutory → the operator statement owes 0 after net payment
 *     (deducted column carries the 148 — the "how much do I still owe X"
 *     answer stays honest)
 *   - statutory-OFF byte-compat: legacy nets, J1 = FULL earned, payslip
 *     without deduction rows, the config nag text
 *   - payslip deduction rows + employer-share note
 *   - the statutory register (rows per run × head, head filter, pending per
 *     authority from the party ledger) + wiring/source pins
 * Windows: daily [-48,-16] and piece [-45,-44] — DISJOINT from every seeded
 * row (earliest production 2026-08-26, zero seeded attendance) and from the
 * l02 fixtures ([-7,+11] + today) so parallel workers never collide.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { planPayrollRun, planPayrollRunCommit } from '@/lib/erp/posting/payroll'
import { planProductionEntry } from '@/lib/erp/posting/production'
import { runCommit } from '@/lib/erp/audit'
import { computeStatutory, normalizeStatutory, DEFAULT_STATUTORY, STATUTORY_HEADS, STATUTORY_OPTION_KEY, ensureStatutoryParties, resolveStatutoryConfig } from '@/lib/erp/statutory'
import { queryStatutoryRegister } from '@/lib/erp/registers/statutory'
import { queryOperatorStatement } from '@/lib/erp/registers/operator-statement'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { fetchPayslipPrint } from '@/lib/erp/print/fetchers-b'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { MENU_ITEMS, LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { allTools, getTool } from '@/lib/agent/tools'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { PROMPT_VERSION } from '@/lib/agent/prompt'
import { PAYROLL_RUN_SCHEMA } from '@/lib/erp/schemas/payroll'

const TS = Date.now()
const S1 = `M48-S1-${TS}` // daily 500 — the walkthrough line
const S2 = `M48-S2-${TS}` // daily 900 — the above-ESI-limit line
const S3 = `M48-S3-${TS}` // daily 100 — the cap-at-earned line
const S4 = `M48-S4-${TS}` // piece 10/pc — the statement-adjustment line
const ORDER = `M48-ORD-${TS}`
const BUYER = `M48-B-${TS}`
const STYLE = `M48-S-${TS}`
const IDEM = `m48-l03-${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const dayAt = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
// the windows (see header — disjoint from seed + l02 + attendance unit)
const W_DAILY: [string, string] = [dayAt(-48), dayAt(-16)]
const W_PIECE: [string, string] = [dayAt(-45), dayAt(-44)]
const W_OFF: [string, string] = [dayAt(-15), dayAt(-14)]

// the TEST config (richer than the seed: PT + LWF ON so every head computes)
const TEST_CFG = {
  pf: { enabled: true, employeePct: 12, employerPct: 12, epsPct: 8.33, wageCeiling: 15000 },
  esi: { enabled: true, employeePct: 0.75, employerPct: 3.25, grossLimit: 21000 },
  pt: { enabled: true, amount: 200, grossThreshold: 5000, state: 'TN' },
  lwf: { enabled: true, employee: 20, employer: 60, state: 'TN' },
}
const SEEDED_CFG_JSON = JSON.stringify(DEFAULT_STATUTORY)

let s1Id = '', s2Id = '', s3Id = '', s4Id = ''
let s1Party = '', s2Party = '', s3Party = '', s4Party = ''
let epfoId = '', esicId = '', ptBoardId = '', lwfBoardId = ''
let orderId = '', buyerId = '', styleId = '', deptId = ''
let runIds: string[] = [] // lines cascade
let runNos: string[] = []
let journalIds: string[] = []
let paymentIds: string[] = []
let entryIds: string[] = []
let empIds: string[] = []
let partyIds: string[] = []

async function commit<T>(planOrPromise: any, idem?: string): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return runCommit(plan, { actorName: 'm48-test', actorSource: 'system', entity: 'payroll_run', ...(idem ? { idempotencyKey: idem } : {}) })
}

beforeAll(async () => {
  deptId = (await db.department.findUniqueOrThrow({ where: { code: 'D4' } })).id

  // the statutory config row (restored to the SEEDED value in afterAll)
  await db.appOption.upsert({
    where: { key: STATUTORY_OPTION_KEY },
    update: { value: JSON.stringify(TEST_CFG) },
    create: { key: STATUTORY_OPTION_KEY, value: JSON.stringify(TEST_CFG), group: 'payroll', label: 'test cfg' },
  })

  const buyer = await db.buyer.create({ data: { code: BUYER, name: `M48 Buyer ${TS}` } })
  buyerId = buyer.id
  const style = await db.style.create({ data: { styleNo: STYLE, description: `M48 Style ${TS}`, buyerId, category: 'Knit' } })
  styleId = style.id
  const order = await db.order.create({
    data: { orderNo: ORDER, buyerId, styleId, orderDate: new Date(), deliveryDate: new Date(Date.now() + 30 * 86400000), finYear: '26-27', totalPcs: 100, status: 'in_progress' },
  })
  orderId = order.id

  const mk = async (code: string, name: string, dailyWage: number, pieceRate = 0) => {
    const plan = await planMasterCreate(employeeConfig, { code, name, deptCode: 'D4', role: 'operator', dailyWage, pieceRate })
    const r: any = await commit(plan, `${IDEM}-${code}`)
    const emp = await db.employee.findUniqueOrThrow({ where: { code }, include: { party: true } })
    return { id: r.id ?? emp.id, partyId: emp.partyId! }
  }
  const e1 = await mk(S1, `M48 Stat One ${TS}`, 500)
  const e2 = await mk(S2, `M48 Stat Two ${TS}`, 900)
  const e3 = await mk(S3, `M48 Stat Three ${TS}`, 23) // pf 3 + lwf 20 exactly consumes 23 — the fully-deducted line
  const e4 = await mk(S4, `M48 Piece ${TS}`, 0, 10)
  s1Id = e1.id; s2Id = e2.id; s3Id = e3.id; s4Id = e4.id
  s1Party = e1.partyId; s2Party = e2.partyId; s3Party = e3.partyId; s4Party = e4.partyId
  empIds.push(s1Id, s2Id, s3Id, s4Id)

  // attendance — S1: 2 present + 1 half (2.5 days); S2: 25 present; S3: 1 present
  // (rows cleaned in afterAll by employeeId + the [-49, ∞) date guard)
  const att: any[] = []
  att.push(
    { employeeId: s1Id, attDate: new Date(`${dayAt(-20)}T00:00:00.000Z`), status: 'present' },
    { employeeId: s1Id, attDate: new Date(`${dayAt(-19)}T00:00:00.000Z`), status: 'present' },
    { employeeId: s1Id, attDate: new Date(`${dayAt(-18)}T00:00:00.000Z`), status: 'half' },
    { employeeId: s3Id, attDate: new Date(`${dayAt(-17)}T00:00:00.000Z`), status: 'present' },
  )
  for (let i = 0; i < 25; i++) att.push({ employeeId: s2Id, attDate: new Date(`${dayAt(-48 + i)}T00:00:00.000Z`), status: 'present' })
  await db.attendance.createMany({ data: att })

  // the authority parties (find-or-create — ids reused by the register/tool)
  const parties = await ensureStatutoryParties()
  epfoId = parties.get('pf')!.id
  esicId = parties.get('esi')!.id
  ptBoardId = parties.get('pt')!.id
  lwfBoardId = parties.get('lwf')!.id
  partyIds.push(epfoId, esicId, ptBoardId, lwfBoardId)
})

afterAll(async () => {
  // config back to the SEEDED defaults (other files read it)
  await db.appOption.upsert({
    where: { key: STATUTORY_OPTION_KEY },
    update: { value: SEEDED_CFG_JSON },
    create: { key: STATUTORY_OPTION_KEY, value: SEEDED_CFG_JSON, group: 'payroll', label: 'seeded' },
  })
  // companions FIRST (PITFALLS #47)
  const pays = paymentIds.length ? await db.payment.findMany({ where: { id: { in: paymentIds } }, select: { voucherNo: true } }) : []
  if (pays.length) {
    await db.journal.deleteMany({ where: { voucherNo: { in: pays.flatMap((p) => [`JV-${p.voucherNo}`, `CN-${p.voucherNo}`]) } } })
  }
  // the run journals (J1 + J2 — narration references the run) + the remittance payment journals are companion-deleted above
  if (runNos.length) {
    const js = await db.journal.findMany({ where: { narration: { contains: 'Payroll run' } }, select: { id: true, narration: true } })
    journalIds.push(...js.filter((j) => runNos.some((rn) => j.narration.includes(rn))).map((j) => j.id))
  }
  await db.journal.deleteMany({ where: { id: { in: journalIds } } })
  await db.payrollRun.deleteMany({ where: { id: { in: runIds } } }) // lines cascade
  await db.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } })
  await db.payment.deleteMany({ where: { id: { in: paymentIds } } })
  await db.productionEntry.deleteMany({ where: { id: { in: entryIds } } })
  await db.attendance.deleteMany({ where: { employeeId: { in: empIds }, attDate: { gte: new Date(`${dayAt(-49)}T00:00:00.000Z`) } } })
  await db.employee.deleteMany({ where: { id: { in: empIds } } })
  await db.party.deleteMany({ where: { id: { in: [...partyIds, s1Party, s2Party, s3Party, s4Party] } } })
  await db.order.deleteMany({ where: { id: orderId } })
  await db.style.deleteMany({ where: { id: styleId } })
  await db.buyer.deleteMany({ where: { id: buyerId } })
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: 'm48-l03-' } } })
  await db.$disconnect()
})

// ─────────────────────────────────────────────────────────────
// PURE COMPUTE — hand-computed everywhere (the service owns the math)
// ─────────────────────────────────────────────────────────────
describe('L-03 computeStatutory (pure)', () => {
  it('S1 math: 1,250 → PF 150/150 + ESI 9/41 + PT skip (below 5,000) + LWF 20 → deductions 179', () => {
    const s = computeStatutory(1250, TEST_CFG as any)
    expect(s.pf).toBe(150)
    expect(s.pfEmployer).toBe(150)
    expect(s.esi).toBe(9) // 0.75% of 1250 = 9.375 → 9
    expect(s.esiEmployer).toBe(41) // 3.25% = 40.625 → 41
    expect(s.pt).toBe(0) // 1250 < the 5,000 threshold
    expect(s.lwf).toBe(20)
    expect(s.deductions).toBe(179)
    expect(s.capped).toBe(false)
  })

  it('S2 math: 22,500 → ESI SKIPPED over the 21,000 limit; PF on the 15,000 ceiling → 1,800/1,800; PT 200; LWF 20', () => {
    const s = computeStatutory(22500, TEST_CFG as any)
    expect(s.esi).toBe(0)
    expect(s.esiEmployer).toBe(0) // NOT covered — no employer share either
    expect(s.pf).toBe(1800) // 12% of min(22500, 15000)
    expect(s.pfEmployer).toBe(1800)
    expect(s.pt).toBe(200)
    expect(s.lwf).toBe(20)
    expect(s.deductions).toBe(2020)
  })

  it('CAP at earned, pf→esi→pt→lwf order (threshold-0 PT config): earned 100 vs PT 200', () => {
    const cfg = normalizeStatutory({ pt: { enabled: true, amount: 200, grossThreshold: 0 } })
    const s = computeStatutory(100, cfg)
    expect(s.pf).toBe(12)
    expect(s.esi).toBe(1) // 0.75 → 1
    expect(s.pt).toBe(87) // wanted 200, remaining 100−13 = 87 — CAPPED
    expect(s.lwf).toBe(0) // nothing left
    expect(s.deductions).toBe(100)
    expect(s.capped).toBe(true)
  })

  it('heads can exactly consume the wage (earned 23: pf 3 + lwf 20 = 23) — net 0, not "capped"', () => {
    const s = computeStatutory(23, TEST_CFG as any)
    expect(s.pf).toBe(3) // R(2.76)
    expect(s.esi).toBe(0) // R(0.17)
    expect(s.pt).toBe(0) // below the 5,000 threshold
    expect(s.lwf).toBe(20)
    expect(s.deductions).toBe(23)
    expect(s.capped).toBe(false) // the heads wanted exactly 23 — nothing clipped
  })

  it('ESI no-limit (grossLimit 0) covers everyone; PF no-ceiling (wageCeiling 0) uses full earned', () => {
    const cfg = normalizeStatutory({ pf: { enabled: true, employeePct: 12, employerPct: 12, wageCeiling: 0 }, esi: { enabled: true, employeePct: 0.75, employerPct: 3.25, grossLimit: 0 } })
    const s = computeStatutory(50000, cfg)
    expect(s.pf).toBe(6000) // uncapped
    expect(s.esi).toBe(375) // covered at any gross
    expect(s.pt).toBe(0) // pt not in the partial override → default (off) fills
    expect(s.lwf).toBe(0)
  })

  it('earned 0 → all heads zero; disabled heads → zero; normalizeStatutory fills gaps with defaults', () => {
    expect(computeStatutory(0, TEST_CFG as any).deductions).toBe(0)
    const off = normalizeStatutory({ pf: { enabled: false }, esi: { enabled: false } })
    const s = computeStatutory(1250, off)
    expect(s.pf).toBe(0)
    expect(s.esi).toBe(0)
    expect(s.pt).toBe(0) // defaults keep PT/LWF off
    expect(s.lwf).toBe(0)
    expect(off.pf.wageCeiling).toBe(DEFAULT_STATUTORY.pf.wageCeiling) // partial head → defaults
    expect(normalizeStatutory(null)).toEqual(DEFAULT_STATUTORY)
    expect(normalizeStatutory('garbage' as any)).toEqual(DEFAULT_STATUTORY)
    expect(normalizeStatutory({ pf: { employeePct: 'not-a-number' } }).pf.employeePct).toBe(12) // wrong type → default
  })
})

describe('L-03 config resolution', () => {
  it('resolveStatutoryConfig reads the AppOption row (source: option)', async () => {
    const { config, source } = await resolveStatutoryConfig()
    expect(source).toBe('option')
    expect(config.pt.amount).toBe(200)
    expect(config.lwf.employee).toBe(20)
  })

  it('an unparseable row falls back to the SAFE defaults (never throws)', async () => {
    await db.appOption.update({ where: { key: STATUTORY_OPTION_KEY }, data: { value: '{broken json' } })
    const { config, source } = await resolveStatutoryConfig()
    expect(source).toBe('default')
    expect(config.pf.employeePct).toBe(12)
    expect(config.pt.enabled).toBe(false) // the seeded default keeps PT off
    await db.appOption.update({ where: { key: STATUTORY_OPTION_KEY }, data: { value: JSON.stringify(TEST_CFG) } })
  })
})

// ─────────────────────────────────────────────────────────────
// THE WALKTHROUGH — daily statutory run → commit split → ledgers
// ─────────────────────────────────────────────────────────────
describe('L-03 walkthrough: statutory daily run → J1/J2 split → ledger closures', () => {
  let runNo = ''

  it('plan: lines freeze WITH statutory numbers; the run freezes the config itself', async () => {
    const plan = await planPayrollRun({ mode: 'daily', from: W_DAILY[0], to: W_DAILY[1], statutory: true })
    expect(plan.ok).toBe(true)
    const l1 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s1Id) as any
    expect(l1.data.pf).toBe(150)
    expect(l1.data.pfEmployer).toBe(150)
    expect(l1.data.esi).toBe(9)
    expect(l1.data.pt).toBe(0)
    expect(l1.data.lwf).toBe(20)
    expect(l1.data.deductions).toBe(179)
    expect(l1.data.net).toBe(1071)
    const l2 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s2Id) as any
    expect(l2.data.net).toBe(20480)
    const l3 = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s3Id) as any
    expect(l3.data.pf).toBe(3)
    expect(l3.data.esi).toBe(0)
    expect(l3.data.lwf).toBe(20)
    expect(l3.data.deductions).toBe(23) // exactly the wage
    expect(l3.data.net).toBe(0)
    expect((plan as any).text).toContain('statutory deductions')
    const runCreate = plan.creates!.find((c) => c.table === 'payrollRun')! as any
    expect(runCreate.data.statutory).toBeTruthy() // the frozen snapshot
    const res: any = await commit(plan, `${IDEM}-r1`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    runNo = res.runNo
    const run = await db.payrollRun.findUniqueOrThrow({ where: { id: res.id } })
    expect((run.statutory as any).pt.amount).toBe(200) // frozen at plan time
    expect(res.deductions).toBe(179 + 2020 + 23)
  })

  it('commit: J1 = earned − deductions (partyId; the fully-deducted line SKIPPED) + J2 per head to the authority parties', async () => {
    const plan = await planPayrollRunCommit({ runNo })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-c1`)
    expect(res.status).toBe('committed')
    expect(res.journals).toBe(6) // 2×J1 (S3 fully deducted — skipped) + 4×J2 (pf, esi, pt, lwf)
    expect(res.statutoryJournals).toBe(4)
    expect(res.statutoryTotal).toBe(3906 + 51 + 200 + 240)

    // J1s — Dr Staff Salaries / Cr Wage Payable, partyId, earned − deductions
    const j1a = await db.journal.findFirstOrThrow({ where: { partyId: s1Party, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable' }, orderBy: { date: 'desc' } })
    journalIds.push(j1a.id)
    expect(j1a.amount).toBe(1071) // NOT the full 1,250
    const j1b = await db.journal.findFirstOrThrow({ where: { partyId: s2Party, debitAccount: 'Staff Salaries' }, orderBy: { date: 'desc' } })
    journalIds.push(j1b.id)
    expect(j1b.amount).toBe(20480)
    const j1c = await db.journal.findFirst({ where: { partyId: s3Party, debitAccount: 'Staff Salaries' }, orderBy: { date: 'desc' } })
    expect(j1c).toBeNull() // the fully-deducted line posts NO employee journal

    // J2s — one per head: Dr Staff Salaries / Cr <Head> Payable, authority partyId
    const j2pf = await db.journal.findFirstOrThrow({ where: { partyId: epfoId, creditAccount: 'PF Payable' }, orderBy: { date: 'desc' } })
    journalIds.push(j2pf.id)
    expect(j2pf.debitAccount).toBe('Staff Salaries')
    expect(j2pf.amount).toBe(3906) // employee 1,953 + employer 1,953
    expect(j2pf.narration).toContain(runNo)
    expect(j2pf.narration).toContain('PF statutory')
    const j2esi = await db.journal.findFirstOrThrow({ where: { partyId: esicId, creditAccount: 'ESI Payable' }, orderBy: { date: 'desc' } })
    journalIds.push(j2esi.id)
    expect(j2esi.amount).toBe(51) // employee 9 + employer 42 (S3's covered ₹23 wage rounds its employer share to 1 — honest)
    const j2pt = await db.journal.findFirstOrThrow({ where: { partyId: ptBoardId, creditAccount: 'PT Payable' }, orderBy: { date: 'desc' } })
    journalIds.push(j2pt.id)
    expect(j2pt.amount).toBe(200) // employee-only share (S2's 200; S3 below threshold)
    const j2lwf = await db.journal.findFirstOrThrow({ where: { partyId: lwfBoardId, creditAccount: 'LWF Payable' }, orderBy: { date: 'desc' } })
    journalIds.push(j2lwf.id)
    expect(j2lwf.amount).toBe(240) // employee 60 (3 lines × 20) + employer 60×3 (lines where lwf ran)
  })

  it('payslips: deduction rows only when > 0; the employer share prints as a NOTE (cost, not deducted)', async () => {
    const line1 = await db.payrollLine.findFirstOrThrow({ where: { runId: runIds[0], employeeId: s1Id } })
    const slip = await fetchPayslipPrint(line1.id)
    expect(slip).toBeTruthy()
    const rows = slip!.lines!.rows.map((r) => String(r[0]))
    expect(rows).toContain('Less: PF (employee)')
    expect(rows).toContain('Less: ESI (employee)')
    expect(rows).toContain('Less: Labour Welfare Fund')
    expect(rows).not.toContain('Less: Professional Tax') // below threshold — honest absence
    const byName = Object.fromEntries(slip!.lines!.rows.map((r) => [String(r[0]), String(r[2])]))
    expect(byName['Less: PF (employee)']).toContain('150')
    expect(byName['Less: ESI (employee)']).toContain('9')
    const totals = Object.fromEntries(slip!.totals ?? [])
    expect(String(totals['NET PAYABLE'])).toContain('1,071')
    const notes = slip!.notes!.join(' ')
    expect(notes).toContain('Employer adds (cost, NOT deducted from the employee)')
    expect(notes).toContain('PF ₹150 + ESI ₹41')

    // the fully-deducted line: net 0, all 23 deducted
    const line3 = await db.payrollLine.findFirstOrThrow({ where: { runId: runIds[0], employeeId: s3Id } })
    const slip3 = await fetchPayslipPrint(line3.id)
    const t3 = Object.fromEntries(slip3!.totals ?? [])
    expect(String(t3['NET PAYABLE'])).toContain('0')
  })

  it('LOOP-CLOSURE #3 preserved: pay_wages the NET → employee-party ledger exactly 0', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: S1, amount: 1071, mode: 'cash' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    const s = await getPartyLedgerSummary(s1Party)
    expect(s!.totalJournal).toBe(1071)
    expect(s!.totalPaid).toBe(1071)
    expect(s!.balance).toBe(0) // −(earned − deductions) + net = 0 — the statutory share never flowed through
  })

  it('LOOP-CLOSURE #4 — the remittance tracker: EPFO ledger −3,906 → register pending 3,906 → pay the authority → 0', async () => {
    const pre = await getPartyLedgerSummary(epfoId)
    expect(pre!.totalJournal).toBe(3906)
    expect(pre!.balance).toBe(-3906) // we owe the authority (the §5 row 12 sign convention)

    const reg = await queryStatutoryRegister({ limit: 100, page: 1, q: runNo })
    const pfRow = reg.rows.find((r) => r.runNo === runNo && r.head === 'PF') as any
    expect(pfRow).toBeTruthy()
    expect(pfRow.employee).toBe(1953)
    expect(pfRow.employer).toBe(1953)
    expect(pfRow.total).toBe(3906)
    expect(pfRow.authority).toBe('EPFO')
    expect(pfRow.pending).toBe(3906) // from the party ledger, not a shadow sum

    const pay = getTool('record_payment')!
    const t = await pay.execute({ partyCode: 'EPFO', amount: 3906, direction: 'out', mode: 'bank', notes: 'PF challan remittance' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)
    const post = await getPartyLedgerSummary(epfoId)
    expect(post!.totalPaid).toBe(3906)
    expect(post!.balance).toBeCloseTo(0) // LOOP-CLOSURE #4 GREEN — the ledger IS the remittance tracker (−0 and +0 both mean settled)
    const reg2 = await queryStatutoryRegister({ limit: 100, page: 1, q: runNo })
    expect((reg2.rows.find((r) => r.runNo === runNo && r.head === 'PF') as any).pending).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// PIECE + STATUTORY — the operator statement stays honest
// ─────────────────────────────────────────────────────────────
describe('L-03 piece + statutory: the statement owes 0 after the net payment (deducted carries the statutory)', () => {
  let runNo = ''

  it('entry 100 @ ₹10 → statutory piece run: earned 1,000, deductions 148, net 852', async () => {
    const plan = await planProductionEntry({
      orderNo: ORDER, deptCode: 'D4', prodDate: W_PIECE[0],
      bundleNo: `M48-BUN-${TS}`, operatorCode: S4, qty: 100, rate: 10,
    })
    expect(plan.ok).toBe(true)
    const res: any = await commit(plan, `${IDEM}-pe`)
    entryIds.push(res.id)

    const rplan = await planPayrollRun({ mode: 'piece', from: W_PIECE[0], to: W_PIECE[1], statutory: true })
    expect(rplan.ok).toBe(true)
    const line = rplan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s4Id) as any
    expect(line.data.earned).toBe(1000)
    expect(line.data.pf).toBe(120)
    expect(line.data.esi).toBe(8) // 7.5 → 8
    expect(line.data.lwf).toBe(20)
    expect(line.data.deductions).toBe(148)
    expect(line.data.net).toBe(852)
    const rres: any = await commit(rplan, `${IDEM}-r2`)
    runIds.push(rres.id)
    runNos.push(rres.runNo)
    runNo = rres.runNo

    const cplan = await planPayrollRunCommit({ runNo })
    const cres: any = await commit(cplan, `${IDEM}-c2`)
    expect(cres.journals).toBe(4) // 1×J1 + 3×J2 (PT skipped — 1,000 below the 5,000 threshold)
    expect(cres.statutoryJournals).toBe(3)
    const j1 = await db.journal.findFirstOrThrow({ where: { partyId: s4Party, debitAccount: 'Production Wages' }, orderBy: { date: 'desc' } })
    journalIds.push(j1.id)
    expect(j1.amount).toBe(852) // earned − deductions on the piece door too
  })

  it('pay the net → statement: earned 1,000 − paid 852 − deducted 148 = owed 0 (the honest answer)', async () => {
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: S4, amount: 852, mode: 'cash' })
    const res: any = await t.commit!()
    paymentIds.push(res.id)

    const st = await queryOperatorStatement({ limit: 100, page: 1 })
    const row = st.rows.find((r) => r.code === S4) as any
    expect(row.earned).toBe(1000)
    expect(row.paid).toBe(852)
    expect(row.deducted).toBe(148) // the new column — reconcilable by hand
    expect(row.owed).toBe(0) // NOT 148: the statutory share is remitted to EPFO/ESIC, not owed to the operator
    const s = await getPartyLedgerSummary(s4Party)
    expect(s!.balance).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// STATUTORY-OFF BYTE-COMPAT + GUARDS
// ─────────────────────────────────────────────────────────────
describe('L-03 statutory-OFF: legacy nets byte-identical + the nag', () => {
  it('a run WITHOUT the flag: deductions 0, J1 = FULL earned (M46 semantics), payslip without deduction rows', async () => {
    // one attendance day for S1 in a fresh window
    await db.attendance.create({ data: { employeeId: s1Id, attDate: new Date(`${W_OFF[0]}T00:00:00.000Z`), status: 'present' } })
    const plan = await planPayrollRun({ mode: 'daily', from: W_OFF[0], to: W_OFF[1] })
    expect(plan.ok).toBe(true)
    expect((plan as any).text).toContain('statutory rates are configured but NOT applied') // the nag
    const line = plan.creates!.find((c) => c.table === 'payrollLine' && (c.data as any).employeeId === s1Id) as any
    expect(line.data.deductions ?? 0).toBe(0)
    expect(line.data.net).toBe(500) // earned − advances, byte-identical
    expect((plan.creates!.find((c) => c.table === 'payrollRun')! as any).data.statutory).toBeUndefined()
    const res: any = await commit(plan, `${IDEM}-r3`)
    runIds.push(res.id)
    runNos.push(res.runNo)
    const cplan = await planPayrollRunCommit({ runNo: res.runNo })
    const cres: any = await commit(cplan, `${IDEM}-c3`)
    expect(cres.statutoryJournals).toBe(0)
    const j = await db.journal.findFirstOrThrow({ where: { partyId: s1Party, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable' }, orderBy: { date: 'desc' } })
    journalIds.push(j.id)
    expect(j.amount).toBe(500) // FULL earned — the M46 journal
    const lineRow = await db.payrollLine.findFirstOrThrow({ where: { runId: res.id, employeeId: s1Id } })
    const slip = await fetchPayslipPrint(lineRow.id)
    expect(slip).toBeTruthy() // draft refused? committed in c3 above
    expect(slip!.lines!.rows.map((r) => String(r[0]))).not.toContain('Less: PF (employee)') // byte-compat layout
  })

  it('double-commit still refuses (terminal)', async () => {
    const plan = await planPayrollRunCommit({ runNo: runNos[0] })
    expect(plan.ok).toBe(false)
    expect((plan as any).error).toContain('COMMITTED')
  })
})

// ─────────────────────────────────────────────────────────────
// REGISTER + WIRING + SOURCE PINS
// ─────────────────────────────────────────────────────────────
describe('L-03 statutory register + wiring', () => {
  it('the register serves committed runs × heads with the head filter + totals; drafts excluded', async () => {
    const res = await queryStatutoryRegister({ limit: 200, page: 1 })
    const mine = res.rows.filter((r) => runNos.slice(0, 2).includes(String(r.runNo)))
    expect(mine.length).toBe(7) // daily run × 4 heads + piece run × 3 heads (PT below threshold — no row)
    expect(mine.every((r) => (r.href as string).startsWith('/hr/payroll/'))).toBe(true)
    const pfOnly = await queryStatutoryRegister({ limit: 200, page: 1, variant: 'pf' })
    expect(pfOnly.rows.every((r) => r.head === 'PF')).toBe(true)
    const totals = Object.fromEntries(res.totals.map((t) => [t.label, t.value]))
    expect(Number(totals['Employee ₹'])).toBeGreaterThan(0)
    expect(Number(totals['Employer ₹'])).toBeGreaterThan(0)
    expect(res.summary).toContain('Pending remittance per authority')
  })

  it('slug wired: service + config + LIVE_ROUTES + menu + page + csv (both doors, ADR-001)', () => {
    expect(REGISTER_SERVICES['statutory']).toBe(queryStatutoryRegister)
    const cfg = getRegisterConfig('statutory')!
    expect(cfg.agentTools).toContain('get_statutory_register')
    expect(cfg.filters.map((f) => f.key)).toContain('variant')
    expect(LIVE_ROUTES.has('/hr/statutory')).toBe(true)
    const item = MENU_ITEMS.find((m) => m.id === 'statutory')
    expect(item).toBeTruthy()
    expect(item!.groupId).toBe('hr')
    expect(item!.agentTools).toContain('get_statutory_register')
    expect(src('src/app/(erp)/hr/statutory/page.tsx')).toContain("getRegisterConfig('statutory')")
    expect(src('src/app/(erp)/hr/statutory/csv/route.ts')).toContain("makeCsvRouteHandler('statutory')")
  })

  it('agent tool: get_statutory_register registered (read, hr domain) → tools 257→258', () => {
    const tool = allTools.find((t: any) => t.name === 'get_statutory_register')
    expect(tool).toBeTruthy()
    expect((tool as any).domain).toBe('hr')
    expect((tool as any).isWrite).toBe(false)
    expect(allTools.length).toBe(258)
    // create_payroll_run carries the statutory param; commit docstring honest
    const createDesc = allTools.find((t: any) => t.name === 'create_payroll_run')!.description
    expect(createDesc).toContain('statutory: true')
    expect(JSON.stringify(PAYROLL_RUN_SCHEMA.shape)).toContain('statutory')
  })

  it('PROMPT_VERSION m48 + the HR line carries the statutory door', () => {
    expect(PROMPT_VERSION).toBe('m49-2026-09-06') // M49 L-04 attendance depth on the M48 line
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('get_statutory_register')
    expect(prompt).toContain('statutory: true')
  })

  it('schema + head meta: the seven line columns + the four heads share ONE source', () => {
    const schema = src('prisma/schema.prisma')
    for (const col of ['pf ', 'pfEmployer', 'esi ', 'esiEmployer', 'pt ', 'lwf ', 'deductions']) {
      expect(schema).toContain(col)
    }
    expect(schema).toContain('statutory   Json?')
    expect(STATUTORY_HEADS.map((h) => h.key)).toEqual(['pf', 'esi', 'pt', 'lwf'])
    expect(STATUTORY_HEADS.map((h) => h.payableAccount)).toEqual(['PF Payable', 'ESI Payable', 'PT Payable', 'LWF Payable'])
    expect(STATUTORY_HEADS.map((h) => h.partyCode)).toEqual(['EPFO', 'ESIC', 'PT-BOARD', 'LWF-BOARD'])
  })
})
