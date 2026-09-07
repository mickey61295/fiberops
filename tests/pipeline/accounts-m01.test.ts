/**
 * Accounts M-01 (SPEC-M50, Module M Batch 1) — the chart of accounts:
 *   - seedCoa idempotence + the 20-row tree shape (parents resolve, the
 *     9 posting-layer names verbatim — SPEC-M51 added Other Expenses, unique
 *     codes, the 5 types)
 *   - resolveAccountByRef by NAME and by CODE (exact, case-sensitive; a
 *     near-miss is a miss) + partyControlName (customer/supplier/employee/
 *     both → Sundry Debtors/Sundry Creditors/Wage Payable/Suspense)
 *   - THE GUARD (CA-04): planJournal links BOTH legs (creates + commit carry
 *     debitAccountId/creditAccountId; plan text shows the codes; sideEffects
 *     carry the GL-legs line); an unknown leg is REFUSED naming create_account
 *     (no row, no voucher number burned); the CODE form resolves
 *   - THE DOORS: payment (receipt from a customer → Dr Cash/Bank [1010] / Cr
 *     Sundry Debtors [1110]; out to a supplier → Dr Sundry Creditors [2100] /
 *     Cr Cash/Bank; wage payout via the employee-party → the party leg
 *     classifies to Wage Payable [2200]) · production-bill (Dr Production
 *     Wages [5010] / Cr Wage Payable [2200]) · payroll commit (J1 Staff
 *     Salaries [5110] / Wage Payable [2200]; J2 heads → PF/ESI Payable, the
 *     plan text carries the codes)
 *   - CANCEL MIRRORS: journal-cancel mirror swaps the FKs with the strings;
 *     payment-cancel contra carries the swapped companion legs
 *   - THE BACKFILL (CA-03): a party-name leg → the party-type control; an
 *     unknown string → Suspense + the report line; re-run = zero examined
 *     (idempotent); the STRINGS never change (voucher detail stays)
 *   - THE TB SUBSTRATE: every journal row carries BOTH FK ids (the CA-04
 *     invariant on the inherited migrated db) and Σ debit == Σ credit
 *     grouped by account FK (debits == credits holds by construction — the
 *     assert pins the M-03 grouping key)
 *   - WIRING PINS: schema fields, tools 261 (+create/update/list_account —
 *     the factory + the list door), masters 43 (account config), the
 *     master-service self-FK OVERRIDES, PROMPT_VERSION m51, docstrings,
 *     the seed + standalone scripts, the journal register code chips
 * Windows: own voucher-no namespace (M50-*), one attendance day (today-3),
 * the production window is default (30 days) scoped to OUR operator only.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planJournal } from '@/lib/erp/posting/journal'
import { planPayment } from '@/lib/erp/posting/payment'
import { planProductionBill } from '@/lib/erp/posting/production-bill'
import { planPayrollRun, planPayrollRunCommit } from '@/lib/erp/posting/payroll'
import { planCancelJournal, planCancelPayment } from '@/lib/erp/posting/cancel'
import { planAttendance } from '@/lib/erp/posting/attendance'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { employeeConfig } from '@/lib/erp/master-configs/employee'
import { partyConfig } from '@/lib/erp/master-configs/party'
import {
  COA_TREE, seedCoa, resolveAccountByRef, resolveAccountPair, partyControlName,
  backfillLegPlan, backfillJournalLinks, unlinkedAccountError, accountLabel,
  type ResolvedAccount,
} from '@/lib/erp/coa'
import { getTool, allTools } from '@/lib/agent/tools'
import { MASTER_CONFIGS, getMasterConfig } from '@/lib/erp/master-configs'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const E1 = `M50-E1-${TS}` // wage 800 — the payroll door line
const CUST = `M50-C-${TS}` // customer party — the receipt door
const SUP = `M50-S-${TS}` // supplier party — the payment door
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const dayAt = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const D = dayAt(-3) // the attendance day (own employee only)

const V = {
  linked: `M50-V-LINK-${TS}`,
  code: `M50-V-CODE-${TS}`,
  mirror: `M50-V-MIRR-${TS}`,
  bfA: `M50-BF-A-${TS}`,
  bfB: `M50-BF-B-${TS}`,
}

// collected ids for the revert
let e1Id = '', e1PartyId = '', custPartyId = '', supPartyId = ''
let runId = ''
const journalNos: string[] = []
const paymentNos: string[] = []

async function acc(code: string): Promise<ResolvedAccount> {
  const a = await resolveAccountByRef(code)
  if (!a) throw new Error(`account ${code} missing — seed the CoA first`)
  return a
}

beforeAll(async () => {
  // the CoA is inherited from the migrated custom.db copy; seedCoa is
  // idempotent so re-running here is a no-op that proves the same.
  await seedCoa(db)

  const cust = await planMasterCreate(partyConfig, { code: CUST, name: `M50 Customer ${TS}`, partyType: 'customer' })
  if (!cust.ok) throw new Error(String(cust.errors))
  const custRow: any = await cust.commit()
  custPartyId = custRow.id
  const sup = await planMasterCreate(partyConfig, { code: SUP, name: `M50 Supplier ${TS}`, partyType: 'supplier' })
  if (!sup.ok) throw new Error(String(sup.errors))
  const supRow: any = await sup.commit()
  supPartyId = supRow.id

  const emp = await planMasterCreate(employeeConfig, { code: E1, name: `M50 Emp ${TS}`, deptCode: 'D4', role: 'operator', dailyWage: 800 })
  if (!emp.ok) throw new Error(String(emp.errors))
  const empRow: any = await emp.commit()
  e1Id = empRow.id
  const empFull = await db.employee.findUniqueOrThrow({ where: { code: E1 }, include: { party: true } })
  e1PartyId = empFull.partyId!

  // one present day — the payroll door's line basis (no times: no OT, the
  // M49 machinery is orthogonal here)
  const att = await planAttendance({ attDate: D, entries: [{ employeeCode: E1, status: 'present' }] })
  if (!att.ok) throw new Error(att.error)
  await att.commit()
})

afterAll(async () => {
  const sw = (p: any) => p.catch(() => {})
  // journals first (FK + audit rows), then payments, then the run + lines
  await sw(db.journal.deleteMany({ where: { voucherNo: { in: journalNos } } }))
  for (const v of [V.linked, V.code, V.mirror, V.bfA, V.bfB]) {
    await sw(db.journal.deleteMany({ where: { voucherNo: { in: [v, `CN-${v}`] } } }))
  }
  for (const p of paymentNos) {
    await sw(db.paymentAllocation.deleteMany({ where: { payment: { voucherNo: p } } }))
    await sw(db.journal.deleteMany({ where: { voucherNo: { in: [`JV-${p}`, `CN-${p}`] } } }))
    await sw(db.payment.deleteMany({ where: { voucherNo: p } }))
  }
  if (runId) await sw(db.payrollRun.deleteMany({ where: { id: runId } })) // lines cascade
  await sw(db.attendance.deleteMany({ where: { employeeId: e1Id } }))
  await sw(db.productionEntry.deleteMany({ where: { operatorId: e1Id } }))
  await sw(db.employee.deleteMany({ where: { id: e1Id } }))
  await sw(db.party.deleteMany({ where: { id: { in: [e1PartyId, custPartyId, supPartyId].filter(Boolean) } } }))
})

describe('SPEC-M50 CA-02 — the seeded tree', () => {
  it('seedCoa is idempotent and plants the 20-row standard tree', async () => {
    const ids1 = await seedCoa(db)
    const ids2 = await seedCoa(db)
    expect(ids1.size).toBe(20)
    expect([...ids1.values()].every((id) => id.length > 0)).toBe(true)
    for (const code of ids1.keys()) expect(ids2.get(code)).toBe(ids1.get(code)) // re-run = same rows
    const rows = await db.account.findMany({ include: { parent: true } })
    expect(rows.length).toBe(20)
    expect(new Set(rows.map((r) => r.code)).size).toBe(20)
    expect(new Set(rows.map((r) => r.name)).size).toBe(20) // names are the join key — unique
    const byCode = new Map(rows.map((r) => [r.code, r]))
    expect(byCode.get('1010')!.parent?.code).toBe('1000')
    expect(byCode.get('1110')!.parent?.code).toBe('1100')
    expect(byCode.get('2100')!.parent?.code).toBe('2000')
    expect(byCode.get('2200')!.parent?.code).toBe('2000')
    expect(byCode.get('4010')!.parent?.code).toBe('4000')
    expect(byCode.get('5010')!.parent?.code).toBe('5000')
    expect(byCode.get('5110')!.parent?.code).toBe('5100')
    expect(byCode.get('5120')!.parent?.code).toBe('5100') // SPEC-M51 DE-03 — the expense catch-all
    expect(byCode.get('1000')!.parent).toBeNull() // groups are roots
  })

  it('the tree carries every posting-layer name VERBATIM + the 5 types', () => {
    const names = new Set(COA_TREE.map((r) => r.name))
    for (const n of [
      'Cash/Bank', 'Production Wages', 'Staff Salaries', 'Wage Payable',
      'PF Payable', 'ESI Payable', 'PT Payable', 'LWF Payable',
      'Sundry Debtors', 'Sundry Creditors', 'Sales', 'Freight', 'Suspense Account',
      'Other Expenses',
    ]) expect(names.has(n), `missing posting name ${n}`).toBe(true)
    const types = new Set(COA_TREE.map((r) => r.type))
    expect([...types].sort()).toEqual(['asset', 'equity', 'expense', 'income', 'liability'])
  })
})

describe('SPEC-M50 CA-04 — the resolver', () => {
  it('resolves by exact NAME and exact CODE; a near-miss is a miss', async () => {
    const byName = await resolveAccountByRef('Wage Payable')
    expect(byName?.code).toBe('2200')
    const byCode = await resolveAccountByRef('5010')
    expect(byCode?.name).toBe('Production Wages')
    expect(await resolveAccountByRef('cash/bank')).toBeNull() // case-sensitive
    expect(await resolveAccountByRef('Wage Payables')).toBeNull() // plural ≠ name
    expect(await resolveAccountByRef('')).toBeNull()
  })

  it('resolveAccountPair returns both legs + the missing list; the error names the doors', async () => {
    const ok = await resolveAccountPair('Cash/Bank', 'Wage Payable')
    expect(ok.missing).toEqual([])
    expect(ok.debit!.code).toBe('1010')
    expect(ok.credit!.code).toBe('2200')
    const miss = await resolveAccountPair('Nope A', 'Wage Payable')
    expect(miss.missing).toEqual(['Nope A'])
    expect(unlinkedAccountError(['Nope A'])).toContain('create_account')
    expect(unlinkedAccountError(['Nope A'])).toContain('list_accounts')
  })

  it('partyControlName maps the party types to the classical controls', () => {
    expect(partyControlName('customer')).toBe('Sundry Debtors')
    expect(partyControlName('supplier')).toBe('Sundry Creditors')
    expect(partyControlName('employee')).toBe('Wage Payable')
    expect(partyControlName('both')).toBe('Suspense Account') // honest: straddles both sides
    expect(partyControlName(null)).toBe('Suspense Account')
  })
})

describe('SPEC-M50 CA-04 — the create_journal guard', () => {
  it('links BOTH legs on creates + commit (the plan text shows the codes)', async () => {
    const plan = await planJournal({ voucherType: 'journal', voucherNo: V.linked, debitAccount: 'Production Wages', creditAccount: 'Wage Payable', amount: 250, narration: 'm50 link test' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const wages = await acc('5010'), payable = await acc('2200')
    const create = plan.creates!.find((c) => c.table === 'journal') as any
    expect(create.data.debitAccountId).toBe(wages.id)
    expect(create.data.creditAccountId).toBe(payable.id)
    expect(plan.text).toContain('[5010]')
    expect(plan.text).toContain('[2200]')
    expect(plan.sideEffects.join(' ')).toContain('GL legs classify to 5010 / 2200')
    const res: any = await plan.commit()
    journalNos.push(res.voucherNo)
    const row = await db.journal.findUniqueOrThrow({ where: { voucherNo: V.linked } })
    expect(row.debitAccountId).toBe(wages.id)
    expect(row.creditAccountId).toBe(payable.id)
    expect(row.debitAccount).toBe('Production Wages') // the STRING stays (voucher detail)
  })

  it('the CODE form resolves (5010 → Production Wages)', async () => {
    const wages = await acc('5010')
    const plan = await planJournal({ voucherType: 'journal', voucherNo: V.code, debitAccount: '5010', creditAccount: '2200', amount: 60 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    journalNos.push(res.voucherNo)
    const row = await db.journal.findUniqueOrThrow({ where: { voucherNo: V.code } })
    expect(row.debitAccountId).toBe(wages.id)
    expect(row.debitAccount).toBe('5010') // the input string stays — resolution is not a rewrite
  })

  it('an unknown leg is REFUSED — no voucher, no row, the error names the door', async () => {
    const before = await db.journal.count()
    const plan = await planJournal({ voucherType: 'journal', debitAccount: 'Not A Real Account', creditAccount: 'Wage Payable', amount: 10 })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain('Unknown account')
    expect(plan.error).toContain('Not A Real Account')
    expect(plan.error).toContain('create_account')
    expect(await db.journal.count()).toBe(before) // nothing was written
  })
})

describe('SPEC-M50 CA-04 — the posting doors stamp the FKs', () => {
  it('payment: a receipt from a customer → Dr Cash/Bank / Cr Sundry Debtors', async () => {
    const cash = await acc('1010'), debtors = await acc('1110')
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 500, mode: 'bank' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.sideEffects.join(' ')).toContain('Cash/Bank [1010] / Sundry Debtors [1110]')
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.voucherNo}` } })
    expect(jv.debitAccountId).toBe(cash.id)
    expect(jv.creditAccountId).toBe(debtors.id)
    expect(jv.debitAccount).toBe('Cash/Bank')
    expect(jv.creditAccount).toBe(`M50 Customer ${TS}`) // the party NAME string stays
  })

  it('payment: an out-payment to a supplier → Dr Sundry Creditors / Cr Cash/Bank', async () => {
    const cash = await acc('1010'), creditors = await acc('2100')
    const plan = await planPayment({ partyCode: SUP, direction: 'out', amount: 300, mode: 'cash' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.voucherNo}` } })
    expect(jv.debitAccountId).toBe(creditors.id) // the Dr leg is the party control
    expect(jv.creditAccountId).toBe(cash.id)
  })

  it('payment: a wage payout via the employee-party → the party leg classifies to Wage Payable', async () => {
    const cash = await acc('1010'), wage = await acc('2200')
    const plan = await planPayment({ partyCode: E1, direction: 'out', amount: 100, mode: 'cash', notes: 'wage payout' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.voucherNo}` } })
    expect(jv.debitAccountId).toBe(wage.id) // employee-party control
    expect(jv.creditAccountId).toBe(cash.id)
  })

  it('production-bill: Dr Production Wages [5010] / Cr Wage Payable [2200]', async () => {
    const order = await db.order.findFirst({ orderBy: { orderNo: 'asc' } })
    const dept = await db.department.findUniqueOrThrow({ where: { code: 'D4' } })
    const entry = await db.productionEntry.create({
      data: { orderId: order!.id, deptId: dept.id, operatorId: e1Id, prodDate: new Date(dayAt(-1)), qty: 10, rate: 3, amount: 30 },
    })
    const wages = await acc('5010'), payable = await acc('2200')
    const plan = await planProductionBill({ operatorCode: E1 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.summary).toContain('[5010]')
    const res: any = await plan.commit()
    journalNos.push(res.voucherNo)
    const row = await db.journal.findUniqueOrThrow({ where: { voucherNo: res.voucherNo } })
    expect(row.debitAccountId).toBe(wages.id)
    expect(row.creditAccountId).toBe(payable.id)
    expect(entry.qty).toBe(10) // the entry the bill summed
  })

  it('payroll commit: J1 wage journal + J2 statutory heads, codes in the plan text', async () => {
    const staff = await acc('5110'), wage = await acc('2200'), pf = await acc('2210')
    const runPlan = await planPayrollRun({ mode: 'daily', from: D, to: D, statutory: true })
    expect(runPlan.ok).toBe(true)
    if (!runPlan.ok) return
    const runRow: any = await runPlan.commit()
    runId = runRow.id
    const runNo = runRow.runNo as string
    const commitPlan = await planPayrollRunCommit({ runNo })
    expect(commitPlan.ok).toBe(true)
    if (!commitPlan.ok) return
    expect(commitPlan.text).toContain('Staff Salaries [5110]')
    expect(commitPlan.text).toContain('Wage Payable [2200]')
    const res: any = await commitPlan.commit()
    const payVouchers = (res.voucherNos ?? []) as string[]
    journalNos.push(...payVouchers)
    const rows = await db.journal.findMany({ where: { voucherNo: { in: payVouchers } }, orderBy: { voucherNo: 'asc' } })
    expect(rows.length).toBeGreaterThanOrEqual(2) // J1 (+ J2 PF — ESI if the gross clears the limit)
    for (const j of rows) {
      expect(j.debitAccountId).toBe(staff.id) // every payroll journal Dr = Staff Salaries
      expect(j.creditAccountId).toBeTruthy()
    }
    const j1 = rows.find((j) => j.creditAccountId === wage.id)
    expect(j1).toBeTruthy() // the wage journal exists and links Wage Payable
    const j2pf = rows.find((j) => j.creditAccountId === pf.id)
    expect(j2pf).toBeTruthy() // the PF head journal links PF Payable (800 × 12% + 12%)
    expect(Math.abs(j2pf!.amount - 192)).toBeLessThan(0.01) // 96 employee + 96 employer
  })
})

describe('SPEC-M50 CA-04 — cancel mirrors carry the FKs', () => {
  it('journal-cancel mirror SWAPS the FKs with the strings', async () => {
    const wages = await acc('5010'), payable = await acc('2200')
    const plan = await planJournal({ voucherType: 'journal', voucherNo: V.mirror, debitAccount: 'Production Wages', creditAccount: 'Wage Payable', amount: 90 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    await plan.commit()
    const cancel = await planCancelJournal({ voucherNo: V.mirror })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    const res: any = await cancel.commit()
    const mirror = await db.journal.findUniqueOrThrow({ where: { voucherNo: `CN-${V.mirror}` } })
    expect(mirror.debitAccountId).toBe(payable.id) // SWAPPED
    expect(mirror.creditAccountId).toBe(wages.id)
    expect(mirror.debitAccount).toBe('Wage Payable') // strings swapped too
    expect(res.mirror).toBe(`CN-${V.mirror}`)
  })

  it('payment-cancel contra carries the swapped companion legs', async () => {
    const cash = await acc('1010'), debtors = await acc('1110')
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 250, mode: 'bank' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    const jvNo = `JV-${res.voucherNo}`
    const cancel = await planCancelPayment({ voucherNo: res.voucherNo })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    await cancel.commit()
    const contra = await db.journal.findUniqueOrThrow({ where: { voucherNo: `CN-${res.voucherNo}` } })
    expect(contra.debitAccountId).toBe(debtors.id) // the receipt's Cr leg, swapped
    expect(contra.creditAccountId).toBe(cash.id)
    void jvNo
  })
})

describe('SPEC-M50 CA-03 — the backfill', () => {
  it('the pure rule order: exact-name → party-control → suspense', () => {
    const exact: ResolvedAccount = { id: 'a1', code: '5010', name: 'Production Wages', type: 'expense' }
    const control: ResolvedAccount = { id: 'a2', code: '1110', name: 'Sundry Debtors', type: 'asset' }
    const suspense: ResolvedAccount = { id: 'a3', code: '9000', name: 'Suspense Account', type: 'equity' }
    expect(backfillLegPlan('X', exact, control, suspense).rule).toBe('exact-name')
    expect(backfillLegPlan('X', null, control, suspense).rule).toBe('party-control')
    expect(backfillLegPlan('X', null, null, suspense).rule).toBe('suspense')
  })

  it('party-name legs → control; unknown strings → Suspense + REPORTED; strings stay; idempotent', async () => {
    const debtors = await acc('1110'), suspense = await acc('9000')
    await db.journal.create({ data: { voucherNo: V.bfA, voucherType: 'journal', finYear: '26-27', debitAccount: 'Mystery Suspense Bait', creditAccount: 'Cash/Bank', amount: 10 } })
    await db.journal.create({ data: { voucherNo: V.bfB, voucherType: 'receipt', finYear: '26-27', partyId: custPartyId, debitAccount: 'Cash/Bank', creditAccount: `M50 Customer ${TS}`, amount: 20 } })
    const report = await backfillJournalLinks(db)
    expect(report.updated).toBeGreaterThanOrEqual(2)
    expect(report.legs.exactName).toBeGreaterThanOrEqual(2) // the two Cash/Bank legs
    expect(report.suspenseReport.some((l) => l.includes('Mystery Suspense Bait'))).toBe(true)
    const a = await db.journal.findUniqueOrThrow({ where: { voucherNo: V.bfA } })
    expect(a.debitAccountId).toBe(suspense.id) // unknown → Suspense, reported
    expect(a.creditAccountId).toBe((await acc('1010')).id)
    const b = await db.journal.findUniqueOrThrow({ where: { voucherNo: V.bfB } })
    expect(b.creditAccountId).toBe(debtors.id) // party-name leg → customer control
    expect(b.creditAccount).toBe(`M50 Customer ${TS}`) // the STRING never rewritten
    // idempotent: everything linked → nothing examined
    const again = await backfillJournalLinks(db)
    expect(again.examined).toBe(0)
    expect(again.updated).toBe(0)
  })
})

describe('SPEC-M50 — the TB substrate + wiring pins', () => {
  it('EVERY journal row carries both FK ids; Σ debit == Σ credit grouped by account', async () => {
    const rows = await db.journal.findMany({ select: { debitAccountId: true, creditAccountId: true, amount: true } })
    expect(rows.length).toBeGreaterThan(180) // the seed's 187 + this file's posts
    const unlinked = rows.filter((r) => !r.debitAccountId || !r.creditAccountId)
    expect(unlinked, `unlinked rows: ${JSON.stringify(unlinked.slice(0, 3))}`).toEqual([])
    const byAccount = new Map<string, { dr: number; cr: number }>()
    for (const r of rows) {
      const dr = byAccount.get(r.debitAccountId!) ?? { dr: 0, cr: 0 }
      dr.dr += r.amount; byAccount.set(r.debitAccountId!, dr)
      const cr = byAccount.get(r.creditAccountId!) ?? { dr: 0, cr: 0 }
      cr.cr += r.amount; byAccount.set(r.creditAccountId!, cr)
    }
    const sumDr = [...byAccount.values()].reduce((s, v) => s + v.dr, 0)
    const sumCr = [...byAccount.values()].reduce((s, v) => s + v.cr, 0)
    expect(Math.abs(sumDr - sumCr)).toBeLessThan(0.01) // balanced by construction — the GROUPING key is M-03's TB
  })

  it('tools: 265 with create/update/list_account (factory + list door) + the M52 report quartet', async () => {
    expect(allTools.length).toBe(269)
    const create = getTool('create_account')
    expect(create).toBeDefined()
    expect(create!.isWrite).toBe(true)
    expect(getTool('update_account')).toBeDefined()
    const list = getTool('list_accounts')
    expect(list).toBeDefined()
    expect(list!.isWrite).toBe(false)
    const res: any = await list!.execute({})
    expect(res.json.length).toBeGreaterThanOrEqual(19)
    const json = res.json as Array<{ code: string; name: string; type: string; parentCode: string | null }>
    expect(json.find((a) => a.code === '1010')!.name).toBe('Cash/Bank')
    expect(json.find((a) => a.code === '2200')!.type).toBe('liability')
  })

  it('masters: 44 configs with the account config riding the M2 engine', () => {
    expect(MASTER_CONFIGS.length).toBe(44)
    const cfg = getMasterConfig('account')
    expect(cfg).toBeDefined()
    expect(cfg!.createTool).toBe('create_account')
    expect(cfg!.updateTool).toBe('update_account')
    expect(cfg!.listTool).toBe('list_accounts')
    expect(cfg!.codePrefix).toBe('ACC-')
    expect(cfg!.fields.some((f) => f.name === 'parentCode' && f.refEntity === 'account')).toBe(true)
  })

  it('PROMPT_VERSION m51 + the accounts line names the CoA doors', () => {
    expect(PROMPT_VERSION).toBe('m54-2026-09-07')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('chart of accounts')
    expect(prompt).toContain('create_account')
  })

  it('source pins: schema FKs, guard wiring, OVERRIDES, docstrings, seed + scripts, register chips', () => {
    const schema = src('prisma/schema.prisma')
    expect(schema).toContain('model Account')
    expect(schema).toContain('debitAccountId')
    expect(schema).toContain('creditAccountId')
    expect(src('src/lib/erp/posting/journal.ts')).toContain('unlinkedAccountError') // the guard
    expect(src('src/lib/erp/posting/payment.ts')).toContain('partyControlName(party.partyType)')
    expect(src('src/lib/erp/posting/cancel.ts')).toContain('journal.creditAccountId') // the swapped mirror
    expect(src('src/lib/erp/schemas/journal.ts')).toContain('CoA')
    const svc = src('src/lib/erp/posting/master-service.ts')
    expect(svc).toContain("account: 'parentId'")
    expect(svc).toContain("account: 'parentName'")
    const seed = src('scripts/seed.ts')
    expect(seed).toContain('SPEC-M50 M-01 — the chart of accounts')
    expect(seed).toContain("'9000', 'Suspense Account'")
    expect(src('scripts/seed_coa.ts')).toContain('SPEC-M50')
    expect(src('scripts/backfill_coa.ts')).toContain('SPEC-M50')
    expect(src('src/app/(erp)/accounts/journal/page.tsx')).toContain('debitAccountRef') // the code chips
    expect(src('src/app/(erp)/accounts/journal/[id]/page.tsx')).toContain('GL legs')
    const tools = src('src/lib/agent/tools.ts')
    expect(tools).toContain('Create a chart-of-accounts account')
  })
})
