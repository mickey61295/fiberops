/**
 * Accounts M-03 (SPEC-M52, Module M Batch 3) — final-accounts reports:
 *   - THE GL DOCTRINE (§1): every journal row counts in the GL regardless of
 *     status — journal-cancel flips the original AND writes the CN- mirror
 *     that compensates (net reversal), payment-cancel keeps the original + a
 *     CN- contra (net zero). Both pinned at the report layer.
 *   - Trial balance math (window 2099-06): per-account Dr/Cr/net+side,
 *     ΣDr == ΣCr asserted, the closed-period window does NOT see later
 *     contras (a TB for a closed period shows what was true THEN).
 *   - The unlinked honesty door (2098 window): null-FK rows counted +
 *     reported, never dropped, Δ stays 0.
 *   - Day-book: chronological, variant (voucherType) + q filters, the
 *     real-door cash receipt through planPayment (Dr Cash/Bank [1010] /
 *     Cr Sundry Debtors [1110]) + its cancel pair visible.
 *   - Cash-book: the 1010 family = the control + the 1011 per-bank child
 *     (CoA topology), opening/inflow/outflow/closing + running balance,
 *     the contra netting (cancel B → the mirror re-deposits), the
 *     not-in-family honest refusal.
 *   - Final accounts: P&L (income − expenses) + BS (assets vs liab + equity
 *     + the retained-earnings line) — Δ asserted 0, structural.
 *   - WIRING PINS: tools 265 + the quartet's shapes, REGISTER_SERVICES +
 *     REGISTER_CONFIGS slugs, pages + csv twins on disk, LIVE_ROUTES,
 *     MENU_ITEMS, the GL doctrine docstring, prompt m52.
 * Windows: own voucher/code namespaces (M52J-*), unique accounts (4M52/5M52/
 * 2M52 + the 1011 bank row), the 2099-06 fixture window, revert all.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planPayment } from '@/lib/erp/posting/payment'
import { planCancelPayment, planCancelJournal } from '@/lib/erp/posting/cancel'
import { seedCoa } from '@/lib/erp/coa'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { partyConfig } from '@/lib/erp/master-configs/party'
import { accountActivity } from '@/lib/erp/registers/trial-balance'
import { queryTrialBalance } from '@/lib/erp/registers/trial-balance'
import { queryDayBook } from '@/lib/erp/registers/day-book'
import { queryCashBook } from '@/lib/erp/registers/cash-book'
import { queryFinalAccounts } from '@/lib/erp/registers/final-accounts'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { REGISTER_CONFIGS, getRegisterConfig } from '@/lib/erp/register-configs'
import { LIVE_ROUTES, MENU_ITEMS } from '@/lib/erp/menu-registry'
import { allTools, getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const CUST = `M52-C-${TS}`
const CUST_NAME = `M52 Customer ${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const WIN = { from: new Date('2099-06-01T00:00:00Z'), to: new Date('2099-06-18T23:59:59.999Z') }
const W98 = { from: new Date('2098-01-01T00:00:00Z'), to: new Date('2098-12-31T23:59:59.999Z') }

// collected handles for the revert
let custPartyId = ''
let rcpNo = ''
let created1011 = false
const MY_ACCOUNT_CODES = ['4M52', '5M52', '2M52']

async function jrow(voucherNo: string, drCode: string | null, crCode: string | null, amount: number, date: string) {
  const [dr, cr] = await Promise.all([drCode ? db.account.findFirst({ where: { code: drCode } }) : null, crCode ? db.account.findFirst({ where: { code: crCode } }) : null])
  return db.journal.create({
    data: {
      voucherNo, voucherType: 'journal', date: new Date(date), finYear: '2099-00',
      debitAccount: dr?.name ?? 'M52 Unknown Dr', creditAccount: cr?.name ?? 'M52 Unknown Cr',
      debitAccountId: dr?.id ?? null, creditAccountId: cr?.id ?? null,
      amount, narration: `SPEC-M52 fixture ${voucherNo}`,
    },
  })
}

beforeAll(async () => {
  await seedCoa(db) // idempotent — the 20-row tree

  // residue hygiene (fresh test-db copy per run — belt and braces)
  await db.journal.deleteMany({ where: { OR: [{ voucherNo: { startsWith: 'M52J' } }, { voucherNo: { startsWith: 'CN-M52J' } }] } })
  await db.account.deleteMany({ where: { code: { in: MY_ACCOUNT_CODES } } })

  // the per-bank row under the 1010 control (the M51 shape) — create only if absent
  let a1011 = await db.account.findFirst({ where: { code: '1011' } })
  if (!a1011) {
    const control = await db.account.findFirst({ where: { code: '1010' } })
    a1011 = await db.account.create({ data: { code: '1011', name: 'M52 Bank Row', type: 'asset', parentId: control!.id, active: true } })
    created1011 = true
  }

  // unique statement accounts (income / expense / liability)
  const g4000 = await db.account.findFirst({ where: { code: '4000' } })
  const g5000 = await db.account.findFirst({ where: { code: '5000' } })
  const g2000 = await db.account.findFirst({ where: { code: '2000' } })
  await db.account.create({ data: { code: '4M52', name: 'M52 Income', type: 'income', parentId: g4000!.id, active: true } })
  await db.account.create({ data: { code: '5M52', name: 'M52 Expense', type: 'expense', parentId: g5000!.id, active: true } })
  await db.account.create({ data: { code: '2M52', name: 'M52 Liability', type: 'liability', parentId: g2000!.id, active: true } })

  // the fixture journals (all 2099-06-15 — inside WIN, outside W98 and today)
  await jrow('M52J-A', '1011', '4M52', 1000, '2099-06-15T10:00:00Z') // bank in
  await jrow('M52J-B', '5M52', '1011', 400, '2099-06-15T11:00:00Z') // bank out (expense)
  await jrow('M52J-C', '1110', '4M52', 600, '2099-06-15T12:00:00Z') // income credited to a debtor
  await jrow('M52J-D', '5M52', '2M52', 250, '2099-06-15T13:00:00Z') // accrue a liability (the cancel target)

  // THE UNLINKED honesty row (2098 — its own window; both FKs null)
  await jrow('M52J-UNLINKED', null, null, 50, '2098-01-01T09:00:00Z')

  // the real door: a cash receipt through planPayment (2099-06-20 — outside WIN)
  const cust = await planMasterCreate(partyConfig, { code: CUST, name: CUST_NAME, partyType: 'customer' })
  if (!cust.ok) throw new Error(String(cust.errors))
  custPartyId = (await (cust as any).commit()).id
  const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 777, mode: 'cash', payDate: '2099-06-20', notes: 'M52 real-door receipt' })
  expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
  const res: any = await plan.commit()
  rcpNo = res.voucherNo
})

afterAll(async () => {
  const sw = (p: any) => p.catch(() => {})
  // journals first (the account FK rows), then payments, then accounts/party
  await sw(db.journal.deleteMany({ where: { OR: [{ voucherNo: { startsWith: 'M52J' } }, { voucherNo: { startsWith: 'CN-M52J' } }, { voucherNo: { in: [`JV-${rcpNo}`, `CN-${rcpNo}`] } }] } }))
  if (rcpNo) await sw(db.payment.deleteMany({ where: { voucherNo: rcpNo } }))
  await sw(db.account.deleteMany({ where: { code: { in: MY_ACCOUNT_CODES } } }))
  if (created1011) await sw(db.account.deleteMany({ where: { code: '1011' } }))
  if (custPartyId) await sw(db.party.delete({ where: { id: custPartyId } }))
})

describe('accounts-m03 — trial balance (FA-01)', () => {
  it('window math: per-account Dr/Cr/net + side, ΣDr == ΣCr asserted, unlinked 0', async () => {
    const res = await queryTrialBalance({ ...WIN, limit: 100, page: 1 })
    const byCode = new Map(res.rows.map((r: any) => [r.code, r]))
    expect(res.count).toBe(5)
    expect(byCode.get('1011')).toMatchObject({ dr: 1000, cr: 400, net: 600, side: 'Dr' })
    expect(byCode.get('4M52')).toMatchObject({ dr: 0, cr: 1600, net: -1600, side: 'Cr' })
    expect(byCode.get('1110')).toMatchObject({ dr: 600, cr: 0, net: 600, side: 'Dr' })
    expect(byCode.get('5M52')).toMatchObject({ dr: 650, cr: 0, net: 650, side: 'Dr' })
    expect(byCode.get('2M52')).toMatchObject({ dr: 0, cr: 250, net: -250, side: 'Cr' })
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Debit ₹']).toBe(2250)
    expect(totals['Credit ₹']).toBe(2250)
    expect(totals['Unlinked']).toBe(0)
    expect(res.summary).toContain('BALANCED')
  })

  it('the unlinked honesty door: null-FK rows counted + reported, never dropped, Δ stays 0', async () => {
    const res = await queryTrialBalance({ ...W98, limit: 100, page: 1 })
    expect(res.count).toBe(0) // an unlinked row lands on NO account
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Unlinked']).toBe(1)
    expect(res.summary).toContain('UNLINKED')
    const act = await accountActivity(W98.from, W98.to)
    expect(act.journalCount).toBe(1)
    expect(act.unlinked).toBe(1)
    expect(act.delta).toBe(0)
  })

  it('THE GL DOCTRINE: journal-cancel flips the original AND the CN- mirror compensates — all-time nets reverse, Δ stays 0', async () => {
    // before: 5M52 net 650 (B 400 + D 250), 2M52 net −250
    const before = await accountActivity()
    const b5 = before.rows.find((r) => r.code === '5M52')!
    const b2 = before.rows.find((r) => r.code === '2M52')!
    expect(b5.net).toBe(650)
    expect(b2.net).toBe(-250)

    const plan = await planCancelJournal({ voucherNo: 'M52J-D', reason: 'M52 doctrine probe' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    await plan.commit()

    const after = await accountActivity()
    const a5 = after.rows.find((r) => r.code === '5M52')!
    const a2 = after.rows.find((r) => r.code === '2M52')!
    expect(a5.net).toBe(400) // 650 − 250: the mirror reversed the accrual
    expect(a2.net).toBe(0)
    expect(after.delta).toBe(0)
    expect(after.unlinked).toBe(1) // the 2098 row — still counted
  })

  it('the closed-period window does NOT see the later contra (a TB for a closed period shows what was true then)', async () => {
    const res = await queryTrialBalance({ ...WIN, limit: 100, page: 1 })
    const byCode = new Map(res.rows.map((r: any) => [r.code, r]))
    expect(byCode.get('5M52')).toMatchObject({ net: 650 }) // UNCHANGED — CN-M52J-D is dated today
    expect(res.summary).toContain('BALANCED')
  })
})

describe('accounts-m03 — day book (FA-02)', () => {
  it('chronological rows with resolved CoA legs; variant filters by voucherType; q searches', async () => {
    const res = await queryDayBook({ ...WIN, limit: 50, page: 1 })
    expect(res.count).toBe(4)
    expect((res.rows[0] as any).voucher).toBe('M52J-A')
    expect((res.rows[0] as any).dr).toBe('M52 Bank Row [1011]')
    expect((res.rows[0] as any).cr).toBe('M52 Income [4M52]')
    expect((res.rows[0] as any).href).toBe('/accounts/journal/M52J-A')
    const onlyJournal = await queryDayBook({ ...WIN, variant: 'journal', limit: 50, page: 1 })
    expect(onlyJournal.count).toBe(4)
    const onlyReceipt = await queryDayBook({ ...WIN, variant: 'receipt', limit: 50, page: 1 })
    expect(onlyReceipt.count).toBe(0)
    const one = await queryDayBook({ ...WIN, q: 'M52J-C', limit: 50, page: 1 })
    expect(one.count).toBe(1)
    expect((one.rows[0] as any).amount).toBe(600)
  })

  it('the real door: a cash receipt through planPayment lands in the day book with GL codes', async () => {
    const res = await queryDayBook({ limit: 50, page: 1, q: CUST_NAME })
    expect(res.count).toBe(1)
    const row: any = res.rows[0]
    expect(row.type).toBe('receipt')
    expect(row.dr).toBe('Cash/Bank [1010]')
    expect(row.cr).toBe('Sundry Debtors [1110]')
    expect(row.amount).toBe(777)
    expect(row.status).toBe('active')
  })

  it('THE PAYMENT-CANCEL PAIR: the companion stays active and the CN- contra is the reversal (both visible)', async () => {
    const plan = await planCancelPayment({ voucherNo: rcpNo, reason: 'M52 doctrine probe' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    await plan.commit()
    const res = await queryDayBook({ limit: 50, page: 1, q: CUST_NAME })
    expect(res.count).toBe(2)
    const byVoucher = new Map(res.rows.map((r: any) => [r.voucher, r]))
    const original: any = byVoucher.get(`JV-${rcpNo}`)
    const contra: any = byVoucher.get(`CN-${rcpNo}`)
    expect(original.status).toBe('active') // payment-cancel keeps the companion — the contra IS the reversal
    expect(original.amount).toBe(777)
    expect(contra.type).toBe('contra')
    expect(contra.amount).toBe(777)
    expect(contra.dr).toBe('Sundry Debtors [1110]') // legs swapped
    expect(contra.cr).toBe('Cash/Bank [1010]')
  })
})

describe('accounts-m03 — cash book (FA-03)', () => {
  it('the 1011 bank row: opening/inflow/outflow/closing + running balance (window math)', async () => {
    const res = await queryCashBook({ ...WIN, variant: '1011', limit: 50, page: 1 })
    expect(res.count).toBe(2)
    const [a, b]: any[] = res.rows
    expect(a.voucher).toBe('M52J-A')
    expect(a.particulars).toBe('M52 Income [4M52]')
    expect(a.inflow).toBe(1000)
    expect(a.outflow).toBe(0)
    expect(a.balance).toBe(1000)
    expect(b.voucher).toBe('M52J-B')
    expect(b.particulars).toBe('M52 Expense [5M52]')
    expect(b.inflow).toBe(0)
    expect(b.outflow).toBe(400)
    expect(b.balance).toBe(600)
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Opening ₹']).toBe(0)
    expect(totals['Inflow ₹']).toBe(1000)
    expect(totals['Outflow ₹']).toBe(400)
    expect(totals['Closing ₹']).toBe(600)
  })

  it('opening balance = the account net BEFORE from (the window discipline)', async () => {
    // variant 1011: the bank row (the CN-RCP contra of the real-door test is
    // dated today and touches 1010 — it WOULD land in a family-wide opening;
    // scoping to the bank row keeps this assert about the window math itself)
    const res = await queryCashBook({ from: new Date('2099-06-16T00:00:00Z'), to: WIN.to, variant: '1011', limit: 50, page: 1 })
    expect(res.count).toBe(0) // A/B are on the 15th
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Opening ₹']).toBe(600) // 1000 in − 400 out before the 16th
    expect(totals['Closing ₹']).toBe(600)
  })

  it('variant=all widens to the whole family (same rows in-window); a non-family code is the honest refusal', async () => {
    const fam = await queryCashBook({ ...WIN, limit: 50, page: 1 })
    expect(fam.count).toBe(2) // the same A/B rows — the family catches the 1011 legs too
    expect((fam.rows[0] as any).voucher).toBe('M52J-A')
    const nope = await queryCashBook({ ...WIN, variant: '9999', limit: 50, page: 1 })
    expect(nope.count).toBe(0)
    expect(nope.summary).toContain('not in the cash family')
  })

  it('THE CONTRA NETTING: cancel B all-time → the mirror re-deposits — closing = opening + net (cancels net)', async () => {
    const plan = await planCancelJournal({ voucherNo: 'M52J-B', reason: 'M52 contra netting probe' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    await plan.commit()
    const res = await queryCashBook({ variant: '1011', limit: 50, page: 1 }) // all time, just the bank row
    expect(res.count).toBe(3)
    const byVoucher = new Map(res.rows.map((r: any) => [r.voucher, r]))
    expect((byVoucher.get('M52J-A') as any).inflow).toBe(1000)
    expect((byVoucher.get('M52J-B') as any).outflow).toBe(400)
    const mirror: any = byVoucher.get('CN-M52J-B')
    expect(mirror.inflow).toBe(400) // Dr 1011 — the mirror re-deposits the expense
    expect(mirror.particulars).toBe('M52 Expense [5M52]')
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Inflow ₹']).toBe(1400)
    expect(totals['Outflow ₹']).toBe(400)
    expect(totals['Closing ₹']).toBe(1000)
  })
})

describe('accounts-m03 — final accounts (FA-04)', () => {
  it('P&L: income − expenses = net (the window math)', async () => {
    const res = await queryFinalAccounts({ ...WIN, variant: 'pl', limit: 100, page: 1 })
    const byCode = new Map(res.rows.map((r: any) => [r.code, r]))
    expect(byCode.get('4M52')).toMatchObject({ head: 'Income', amount: 1600 })
    expect(byCode.get('5M52')).toMatchObject({ head: 'Expense', amount: 650 })
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Income ₹']).toBe(1600)
    expect(totals['Expenses ₹']).toBe(650)
    expect(totals['Net P&L ₹']).toBe(950)
    expect(res.summary).toContain('PROFIT ₹950')
  })

  it('balance sheet: assets vs liabilities + equity + the retained-earnings line — Δ asserted 0 (structural)', async () => {
    const res = await queryFinalAccounts({ ...WIN, variant: 'bs', limit: 100, page: 1 })
    const byCode = new Map(res.rows.map((r: any) => [r.code, r]))
    expect(byCode.get('1011')).toMatchObject({ head: 'Assets', amount: 600 })
    expect(byCode.get('1110')).toMatchObject({ head: 'Assets', amount: 600 })
    expect(byCode.get('2M52')).toMatchObject({ head: 'Liabilities', amount: 250 })
    const retained: any = res.rows.find((r: any) => String(r.account).includes('Retained earnings'))
    expect(retained.amount).toBe(950) // the window P&L
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Assets ₹']).toBe(1200)
    expect(totals['Liabilities + Equity + P&L ₹']).toBe(1200)
    expect(totals['Δ ₹']).toBe(0)
    expect(res.summary).toContain('BALANCED')
  })

  it('after the cancels, the ALL-TIME statements still close (the doctrine keeps the books true)', async () => {
    const pl = await queryFinalAccounts({ variant: 'pl', limit: 200, page: 1 }) // all time
    const plByCode = new Map(pl.rows.map((r: any) => [r.code, r]))
    expect(plByCode.get('4M52')).toMatchObject({ head: 'Income', amount: 1600 }) // income untouched by the cancels
    expect(plByCode.get('5M52')).toMatchObject({ amount: 0 }) // 650 − 400 (CN-B) − 250 (CN-D): the expense AND the accrual both fully reversed
    const res = await queryFinalAccounts({ variant: 'bs', limit: 200, page: 1 }) // all time
    const totals = Object.fromEntries((res.totals ?? []).map((t: any) => [t.label, t.value]))
    expect(totals['Δ ₹']).toBe(0) // structural — residue or not, the sheet closes
  })
})

describe('accounts-m03 — wiring pins (FA-05)', () => {
  it('tools: 265 with the read-only report quartet (accounts domain, shaped schemas)', async () => {
    expect(allTools.length).toBe(266)
    const tb = getTool('get_trial_balance')!
    expect(tb.isWrite).toBe(false)
    expect(tb.domain).toBe('accounts')
    expect(tb.schema.shape).toHaveProperty('from')
    const dbk = getTool('get_day_book')!
    expect(dbk.schema.shape).toHaveProperty('type')
    expect(dbk.schema.shape).toHaveProperty('q')
    const cb = getTool('get_cash_book')!
    expect(cb.schema.shape).toHaveProperty('account')
    const fa = getTool('get_final_accounts')!
    expect(fa.schema.shape).toHaveProperty('statement')
    expect(fa.isWrite).toBe(false)
  })

  it('the quartet delegates to the services — same shapes (one service, both doors)', async () => {
    const tb: any = await getTool('get_trial_balance')!.execute({ from: '2099-06-01', to: '2099-06-18' })
    expect(tb.text).toContain('BALANCED')
    expect(tb.json.find((r: any) => r.code === '4M52').net).toBe(-1600)
    const dbk: any = await getTool('get_day_book')!.execute({ q: 'M52J-C' })
    expect(dbk.json.length).toBe(1)
    const cb: any = await getTool('get_cash_book')!.execute({ account: '1011', from: '2099-06-01', to: '2099-06-18' })
    expect(cb.json.length).toBe(2)
    const fa: any = await getTool('get_final_accounts')!.execute({ statement: 'pl', from: '2099-06-01', to: '2099-06-18' })
    expect(fa.json.find((r: any) => r.code === '5M52').amount).toBe(650)
  })

  it('registers + configs + pages + csv twins + routes + menu — the full contract', () => {
    for (const slug of ['trial-balance', 'day-book', 'cash-book', 'final-accounts']) {
      expect(REGISTER_SERVICES[slug]).toBeTruthy()
      expect(getRegisterConfig(slug)).toBeTruthy()
      const cfg = getRegisterConfig(slug)!
      const route = (cfg as any).slug === 'trial-balance' ? '/accounts/trial-balance' : `/accounts/${slug}`
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(MENU_ITEMS.find((m: any) => m.id === slug)).toBeTruthy()
      expect(existsSync(join(ROOT, 'src/app/(erp)', route, 'page.tsx'))).toBe(true)
      expect(existsSync(join(ROOT, 'src/app/(erp)', route, 'csv/route.ts'))).toBe(true)
      expect(REGISTER_CONFIGS.map((c) => c.slug)).toContain(slug)
    }
  })

  it('source pins: the GL doctrine docstring, the four tool doors, prompt m52', () => {
    expect(src('src/lib/erp/registers/trial-balance.ts')).toContain('THE GL DOCTRINE')
    expect(src('src/lib/erp/registers/day-book.ts')).toContain('every status')
    expect(src('src/lib/erp/registers/cash-book.ts')).toContain('CoA TOPOLOGY')
    expect(src('src/lib/erp/registers/final-accounts.ts')).toContain('accountActivity')
    expect(src('src/lib/agent/tools.ts')).toContain("name: 'get_trial_balance'")
    expect(src('src/lib/agent/tools.ts')).toContain("name: 'get_day_book'")
    expect(src('src/lib/agent/tools.ts')).toContain("name: 'get_cash_book'")
    expect(src('src/lib/agent/tools.ts')).toContain("name: 'get_final_accounts'")
    expect(src('src/lib/agent/prompt.ts')).toContain('get_trial_balance')
    expect(PROMPT_VERSION).toBe('m53-2026-09-06')
  })
})
