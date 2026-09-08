/**
 * Accounts M-04 (SPEC-M53, Module M Batch 4) — Tally both sides:
 *   - THE EXPORT DOCTRINE (§1): every journal row renders exactly once — as
 *     its document's voucher or as itself; JV-* companions NEVER re-export
 *     (the live double-count bug: 178 receipts + 187 companion journals for
 *     the same money); the CN- contra IS the reversal (cancels export as
 *     net-zero pairs — a full-window Tally import converges to the GL).
 *   - Both-sides coverage: SupplierBill → Purchase (Input GST splits),
 *     DebitNote → Credit Note (the companion's frozen legs), Expense →
 *     Journal (source 'expense'), Sales → Output CGST/SGST/IGST splits.
 *   - Honesty doors: unlinked-bank + no-companion warnings, orphan JV-*
 *     fallback (never a silent drop), stored-math mismatch, draft/cancelled
 *     invoice+bill exclusions REPORTED, legacy derivation paths.
 *   - Balance: every voucher asserts ΣDr == ΣCr.
 *   - WIRING: get_tally_export (tools 265→266, accounts domain, read),
 *     PROMPT_VERSION m53, the page/API/docstring pins.
 * Window: today ± 36h (cancels date their contras now — the pair must sit
 * together), unique M53-* namespaces, full revert.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planPayment } from '@/lib/erp/posting/payment'
import { planDebitNote } from '@/lib/erp/posting/debit-note'
import { planExpense } from '@/lib/erp/posting/expense'
import { planJournal } from '@/lib/erp/posting/journal'
import { planCancelPayment, planCancelJournal } from '@/lib/erp/posting/cancel'
import { seedCoa } from '@/lib/erp/coa'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { partyConfig } from '@/lib/erp/master-configs/party'
import { buildTallyExport } from '@/lib/erp/registers/tally'
import { allTools, getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const CUST = `M53-C-${TS}`
const CUST_NAME = `M53 Customer ${TS}`
const SUP = `M53-S-${TS}`
const SUP_NAME = `M53 Supplier ${TS}`
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const WIN = { from: new Date(Date.now() - 36 * 3600 * 1000), to: new Date(Date.now() + 36 * 3600 * 1000) }
const LEG_ACC = `M53 Bank GL ${TS}`
const BANK_ACC_NO = `M53ACC${TS}`

let custPartyId = ''
let supPartyId = ''
let cashRcpNo = '' // real-door cash receipt (cancelled later — the doctrine pair)
let bankRcpNo = '' // real-door bank-linked receipt (the frozen per-bank leg)
let neftNo = '' // real-door neft WITHOUT bankAccountNo (the control + warning)
let dnNo = 'DN-M53-1'
let expNo = 'EXP-M53-1'
let jrnNo = 'M53J-1'
let bankAccId = ''
let bankId = ''

const sumSide = (v: any, isDebit: boolean) =>
  v.ledgerEntries.filter((e: any) => e.isDebit === isDebit).reduce((s: number, e: any) => s + e.amount, 0)
const balanced = (v: any) => Math.abs(sumSide(v, true) - sumSide(v, false)) < 0.005

beforeAll(async () => {
  await seedCoa(db)

  // residue hygiene
  await db.journal.deleteMany({ where: { OR: [{ voucherNo: { in: ['M53J-1', 'CN-M53J-1', 'JV-M53-ORPHAN', `JV-DN-M53-1`, `JV-EXP-M53-1`] } }, { voucherNo: { startsWith: 'CN-M53' } }] } })
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'M53-INV' } } })
  await db.supplierBill.deleteMany({ where: { billNo: { startsWith: 'M53-SB' } } })
  await db.debitNote.deleteMany({ where: { noteNo: { startsWith: 'DN-M53' } } })
  await db.expense.deleteMany({ where: { expNo: { startsWith: 'EXP-M53' } } })
  await db.payment.deleteMany({ where: { voucherNo: { startsWith: 'M53-' } } })
  await db.account.deleteMany({ where: { code: '1053' } })
  await db.bankAccount.deleteMany({ where: { accountNo: { startsWith: 'M53ACC' } } })
  await db.bank.deleteMany({ where: { code: { startsWith: 'M53B' } } })
  await db.party.deleteMany({ where: { code: { in: [CUST, SUP] } } })

  // parties through the real master door
  const c = await planMasterCreate(partyConfig, { code: CUST, name: CUST_NAME, partyType: 'customer' })
  if (!c.ok) throw new Error(String(c.errors))
  custPartyId = (await (c as any).commit()).id
  const s = await planMasterCreate(partyConfig, { code: SUP, name: SUP_NAME, partyType: 'supplier' })
  if (!s.ok) throw new Error(String(s.errors))
  supPartyId = (await (s as any).commit()).id

  // the per-bank GL row under the 1010 control + the bank + its account
  const control = await db.account.findFirst({ where: { code: '1010' } })
  await db.account.create({ data: { code: '1053', name: LEG_ACC, type: 'asset', parentId: control!.id, active: true } })
  const bank = await db.bank.create({ data: { code: `M53B${TS}`, name: `M53 Bank ${TS}` } })
  bankId = bank.id
  const ba = await db.bankAccount.create({ data: { accountNo: BANK_ACC_NO, bankId: bank.id, glAccountCode: '1053', active: true } })
  bankAccId = ba.id

  // invoice ₹1000 + CGST 25 + SGST 25 (issued) + the mismatch row + the cancelled row
  await db.salesInvoice.create({ data: { invoiceNo: `M53-INV-1`, partyId: custPartyId, invoiceDate: new Date(), finYear: 'FY99', billType: 'sales', taxableValue: 1000, cgstRate: 2.5, sgstRate: 2.5, cgstAmt: 25, sgstAmt: 25, billAmount: 1050, status: 'issued' } })
  await db.salesInvoice.create({ data: { invoiceNo: `M53-INV-X1`, partyId: custPartyId, invoiceDate: new Date(), finYear: 'FY99', taxableValue: 100, billAmount: 150, status: 'issued' } }) // mismatch: 100 ≠ 150
  await db.salesInvoice.create({ data: { invoiceNo: `M53-INV-C1`, partyId: custPartyId, invoiceDate: new Date(), finYear: 'FY99', taxableValue: 200, billAmount: 200, status: 'cancelled' } })

  // supplier bill ₹800 + IGST 80 (passed) + a draft (the gate never blessed it)
  await db.supplierBill.create({ data: { billNo: `M53-SB-1`, partyId: supPartyId, billDate: new Date(), finYear: 'FY99', taxableValue: 800, igstRate: 10, igstAmt: 80, billAmount: 880, status: 'passed', matchStatus: 'matched' } })
  await db.supplierBill.create({ data: { billNo: `M53-SB-D1`, partyId: supPartyId, billDate: new Date(), finYear: 'FY99', taxableValue: 50, billAmount: 50, status: 'draft' } })

  // real-door payments: cash ₹500 / bank-linked ₹300 (frozen per-bank leg) / neft-no-account ₹100 (control + warning)
  const p1 = await planPayment({ partyCode: CUST, direction: 'in', amount: 500, mode: 'cash', payDate: new Date().toISOString().slice(0, 10), reference: 'M53CASH' })
  expect(p1.ok, p1.ok ? '' : String(p1.error)).toBe(true)
  cashRcpNo = (await (p1 as any).commit()).voucherNo
  const p2 = await planPayment({ partyCode: CUST, direction: 'in', amount: 300, mode: 'neft', bankAccountNo: BANK_ACC_NO, payDate: new Date().toISOString().slice(0, 10), reference: 'M53NEFT' })
  expect(p2.ok, p2.ok ? '' : String(p2.error)).toBe(true)
  bankRcpNo = (await (p2 as any).commit()).voucherNo
  const p3 = await planPayment({ partyCode: SUP, direction: 'out', amount: 100, mode: 'neft', payDate: new Date().toISOString().slice(0, 10), reference: 'M53CTL' })
  expect(p3.ok, p3.ok ? '' : String(p3.error)).toBe(true)
  neftNo = (await (p3 as any).commit()).voucherNo

  // a hand-crafted payment with NO companion (the legacy/M19 shape — warning path)
  await db.payment.create({ data: { voucherNo: 'M53-PAY-X', partyId: supPartyId, direction: 'out', payDate: new Date(), finYear: 'FY99', amount: 60, mode: 'cheque', reference: 'M53LEGACY' } })

  // debit note through the real door (companion JV-DN-M53-1) + a legacy note without one
  const dn = await planDebitNote({ noteNo: dnNo, noteType: 'acc', partyCode: CUST, amount: 100, reason: 'M53 deduction' })
  expect(dn.ok, dn.ok ? '' : String(dn.error)).toBe(true)
  await (dn as any).commit()
  await db.debitNote.create({ data: { noteNo: 'DN-M53-LEGACY', noteType: 'comm', partyId: custPartyId, date: new Date(), finYear: 'FY99', amount: 30, status: 'raised' } })

  // expense through the real door (companion JV-EXP-M53-1, Dr Freight / Cr supplier)
  const ex = await planExpense({ expNo: expNo, category: 'transport', partyCode: SUP, amount: 200, expDate: new Date().toISOString().slice(0, 10), narration: 'M53 freight' })
  expect(ex.ok, ex.ok ? '' : String(ex.error)).toBe(true)
  await (ex as any).commit()

  // manual journal through the real door (V-legs resolve: Dr Freight / Cr Sales)
  const j = await planJournal({ voucherNo: jrnNo, voucherType: 'journal', debitAccount: 'Freight', creditAccount: 'Sales', amount: 12, narration: 'M53 manual journal', date: new Date().toISOString().slice(0, 10) })
  expect(j.ok, j.ok ? '' : String(j.error)).toBe(true)
  await (j as any).commit()

  // an ORPHAN companion (no document — the never-silently-drops door)
  await db.journal.create({ data: { voucherNo: 'JV-M53-ORPHAN', voucherType: 'journal', date: new Date(), finYear: 'FY99', debitAccount: 'Freight', creditAccount: 'Sales', amount: 5, narration: 'M53 orphan companion' } })
})

afterAll(async () => {
  const sw = (p: any) => p.catch(() => {})
  const jvNos = [jrnNo, `CN-${jrnNo}`, 'JV-M53-ORPHAN', `JV-${dnNo}`, `JV-${expNo}`, 'CN-M53-LEGACY']
  if (cashRcpNo) jvNos.push(`JV-${cashRcpNo}`, `CN-${cashRcpNo}`)
  if (bankRcpNo) jvNos.push(`JV-${bankRcpNo}`)
  if (neftNo) jvNos.push(`JV-${neftNo}`)
  await sw(db.journal.deleteMany({ where: { voucherNo: { in: jvNos } } }))
  await sw(db.payment.deleteMany({ where: { voucherNo: { in: [cashRcpNo, bankRcpNo, neftNo, 'M53-PAY-X'] } } }))
  await sw(db.debitNote.deleteMany({ where: { noteNo: { in: [dnNo, 'DN-M53-LEGACY'] } } }))
  await sw(db.expense.deleteMany({ where: { expNo: expNo } }))
  await sw(db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'M53-INV' } } }))
  await sw(db.supplierBill.deleteMany({ where: { billNo: { startsWith: 'M53-SB' } } }))
  await sw(db.account.deleteMany({ where: { code: '1053' } }))
  await sw(db.bankAccount.deleteMany({ where: { id: bankAccId } }))
  await sw(db.bank.deleteMany({ where: { id: bankId } }))
  await sw(db.party.deleteMany({ where: { id: { in: [custPartyId, supPartyId] } } }))
})

describe('accounts-m04 — the walkthrough (SPEC-M53 §4)', () => {
  it('the invoice → Sales with the Output GST SPLIT (no single Output GST ledger)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const inv = out.vouchers.find((v) => v.voucherNo === 'M53-INV-1')!
    expect(inv.voucherType).toBe('Sales')
    expect(inv.source).toBe('invoice')
    expect(inv.party).toBe(CUST_NAME)
    expect(inv.ledgerEntries.find((e) => e.ledger === 'Output GST')).toBeUndefined()
    expect(inv.ledgerEntries.find((e) => e.ledger === 'Output CGST')).toMatchObject({ amount: 25, isDebit: false })
    expect(inv.ledgerEntries.find((e) => e.ledger === 'Output SGST')).toMatchObject({ amount: 25, isDebit: false })
    expect(inv.ledgerEntries.find((e) => e.isDebit)).toMatchObject({ ledger: CUST_NAME, amount: 1050 })
    expect(inv.ledgerEntries.find((e) => !e.isDebit && e.ledger === 'Sales')).toMatchObject({ amount: 1000 })
    expect(balanced(inv)).toBe(true)
  })

  it('the supplier bill → Purchase with Input IGST (the purchase side exists)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const bill = out.vouchers.find((v) => v.voucherNo === 'M53-SB-1')!
    expect(bill.voucherType).toBe('Purchase')
    expect(bill.source).toBe('bill')
    expect(bill.party).toBe(SUP_NAME)
    expect(bill.ledgerEntries.find((e) => e.isDebit && e.ledger === 'Purchases')).toMatchObject({ amount: 800 })
    expect(bill.ledgerEntries.find((e) => e.isDebit && e.ledger === 'Input IGST')).toMatchObject({ amount: 80 })
    expect(bill.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: SUP_NAME, amount: 880 })
    expect(bill.narration).toContain('match matched')
    expect(balanced(bill)).toBe(true)
  })

  it('the cash receipt → legs from the frozen companion (Dr Cash/Bank / Cr party)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const rcp = out.vouchers.find((v) => v.voucherNo === cashRcpNo)!
    expect(rcp.voucherType).toBe('Receipt')
    expect(rcp.source).toBe('payment')
    expect(rcp.ledgerEntries.find((e) => e.isDebit)).toMatchObject({ ledger: 'Cash/Bank', amount: 500 })
    expect(rcp.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: CUST_NAME, amount: 500 })
    expect(rcp.narration).toContain('M53CASH')
    expect(balanced(rcp)).toBe(true)
  })

  it('the bank-linked receipt → the frozen per-bank leg (the bank GL account name)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const rcp = out.vouchers.find((v) => v.voucherNo === bankRcpNo)!
    expect(rcp.voucherType).toBe('Receipt')
    expect(rcp.ledgerEntries.find((e) => e.isDebit)).toMatchObject({ ledger: LEG_ACC, amount: 300 })
    expect(rcp.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: CUST_NAME, amount: 300 })
  })

  it('the neft payment without a linked bank → the control leg + the warning (the M51 nag surfaced)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const pmt = out.vouchers.find((v) => v.voucherNo === neftNo)!
    expect(pmt.voucherType).toBe('Payment')
    expect(pmt.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: 'Cash/Bank', amount: 100 })
    expect(out.warnings.some((w) => w.includes(neftNo) && w.includes('Cash/Bank control'))).toBe(true)
  })

  it('the debit note → Credit Note typed from the companion legs (Dr Sales / Cr party)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const dn = out.vouchers.find((v) => v.voucherNo === dnNo)!
    expect(dn.voucherType).toBe('Credit Note')
    expect(dn.source).toBe('debit-note')
    expect(dn.ledgerEntries.find((e) => e.isDebit)).toMatchObject({ ledger: 'Sales', amount: 100 })
    expect(dn.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: CUST_NAME, amount: 100 })
    expect(dn.narration).toContain('deduction')
  })

  it('the expense → Journal (source expense) from the companion legs (Dr Freight / Cr party)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const ex = out.vouchers.find((v) => v.voucherNo === expNo)!
    expect(ex.voucherType).toBe('Journal')
    expect(ex.source).toBe('expense')
    expect(ex.ledgerEntries.find((e) => e.isDebit)).toMatchObject({ ledger: 'Freight', amount: 200 })
    expect(ex.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: SUP_NAME, amount: 200 })
  })

  it('the manual journal → its own legs (Dr Freight / Cr Sales)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const j = out.vouchers.find((v) => v.voucherNo === jrnNo)!
    expect(j.voucherType).toBe('Journal')
    expect(j.source).toBe('journal')
    expect(j.ledgerEntries.find((e) => e.isDebit)).toMatchObject({ ledger: 'Freight', amount: 12 })
    expect(j.ledgerEntries.find((e) => !e.isDebit)).toMatchObject({ ledger: 'Sales', amount: 12 })
  })

  it('COUNTED ONCE — the JV- companions never re-export as journal vouchers (the live double-count fixed)', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const nos = out.vouchers.map((v) => v.voucherNo)
    expect(nos).not.toContain(`JV-${cashRcpNo}`)
    expect(nos).not.toContain(`JV-${bankRcpNo}`)
    expect(nos).not.toContain(`JV-${neftNo}`)
    expect(nos).not.toContain(`JV-${dnNo}`)
    expect(nos).not.toContain(`JV-${expNo}`)
    // every journal row still appears exactly once — via its document:
    expect(nos).toContain(cashRcpNo)
    expect(nos).toContain(dnNo)
    expect(nos).toContain(expNo)
  })

  it('THE DOCTRINE PAIR (payment cancel): the receipt exports WITH its CN- reversal — net zero', async () => {
    const plan = await planCancelPayment({ voucherNo: cashRcpNo, reason: 'M53 doctrine probe' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    await plan.commit()
    const out = await buildTallyExport(WIN.from, WIN.to)
    const rcp = out.vouchers.find((v) => v.voucherNo === cashRcpNo)!
    const contra = out.vouchers.find((v) => v.voucherNo === `CN-${cashRcpNo}`)
    expect(contra).toBeDefined() // the contra rides WITH its original
    expect(contra!.reversalOf).toBe(cashRcpNo)
    expect(contra!.voucherType).toBe('Journal')
    expect(contra!.narration).toContain(`Reversal: ${cashRcpNo}`)
    // legs swapped: the contra's Dr = the original's Cr leg ledger
    expect(contra!.ledgerEntries.find((e) => e.isDebit)!.ledger).toBe(CUST_NAME)
    expect(contra!.ledgerEntries.find((e) => !e.isDebit)!.ledger).toBe('Cash/Bank')
    const dr = sumSide(rcp, true) + sumSide(contra!, true)
    const cr = sumSide(rcp, false) + sumSide(contra!, false)
    expect(Math.abs(dr - cr)).toBeLessThan(0.005) // the pair nets zero
  })

  it('THE DOCTRINE PAIR (journal cancel): the cancelled V-* exports [CANCELLED] + its CN- mirror', async () => {
    const plan = await planCancelJournal({ voucherNo: jrnNo, reason: 'M53 doctrine probe' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    await plan.commit()
    const out = await buildTallyExport(WIN.from, WIN.to)
    const orig = out.vouchers.find((v) => v.voucherNo === jrnNo)!
    const mirror = out.vouchers.find((v) => v.voucherNo === `CN-${jrnNo}`)!
    expect(orig.narration).toContain('[CANCELLED]')
    expect(mirror.reversalOf).toBe(jrnNo)
    expect(mirror.ledgerEntries.find((e) => e.isDebit)!.ledger).toBe('Sales')
    expect(mirror.ledgerEntries.find((e) => !e.isDebit)!.ledger).toBe('Freight')
  })

  it('the honesty doors: mismatch, legacy derivations, orphan companion, exclusions REPORTED', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    // stored-math mismatch (billAmount 150 vs legs 100)
    expect(out.warnings.some((w) => w.includes('M53-INV-X1') && w.includes('mismatch'))).toBe(true)
    // legacy payment without a companion → Cash/Bank + warning
    const legacy = out.vouchers.find((v) => v.voucherNo === 'M53-PAY-X')!
    expect(legacy.ledgerEntries.find((e) => !e.isDebit)!.ledger).toBe('Cash/Bank')
    expect(out.warnings.some((w) => w.includes('M53-PAY-X') && w.includes('no companion journal'))).toBe(true)
    // legacy DN without a companion → derived legs + warning
    const ldn = out.vouchers.find((v) => v.voucherNo === 'DN-M53-LEGACY')!
    expect(ldn.ledgerEntries.find((e) => e.isDebit)!.ledger).toBe('Sales')
    expect(out.warnings.some((w) => w.includes('DN-M53-LEGACY') && w.includes('no companion journal'))).toBe(true)
    // orphan JV-* → rendered as a journal + warning (never a silent drop)
    const orphan = out.vouchers.find((v) => v.voucherNo === 'JV-M53-ORPHAN')!
    expect(orphan.source).toBe('journal')
    expect(out.warnings.some((w) => w.includes('JV-M53-ORPHAN') && w.includes('no document'))).toBe(true)
    // draft/cancelled exclusions counted + reported
    expect(out.vouchers.map((v) => v.voucherNo)).not.toContain('M53-INV-C1')
    expect(out.vouchers.map((v) => v.voucherNo)).not.toContain('M53-SB-D1')
    expect(out.warnings.some((w) => w.includes('cancelled invoice') && w.includes('1 '))).toBe(true)
    expect(out.warnings.some((w) => w.includes('draft bill') && w.includes('1 '))).toBe(true)
  })

  it('every M53 voucher balances (ΣDr == ΣCr) except the DELIBERATE mismatch row; the window filters', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    const mine = out.vouchers.filter((v) => v.voucherNo.startsWith('M53') || v.voucherNo === cashRcpNo || v.voucherNo === bankRcpNo || v.voucherNo === neftNo || [dnNo, expNo, jrnNo, `CN-${cashRcpNo}`, `CN-${jrnNo}`, 'DN-M53-LEGACY'].includes(v.voucherNo))
    expect(mine.length).toBeGreaterThanOrEqual(10)
    for (const v of mine) {
      if (v.voucherNo === 'M53-INV-X1') continue // the DELIBERATE stored-math mismatch — exported as-is + warned (the honesty door)
      expect(balanced(v)).toBe(true)
    }
    // the mismatch row itself: unbalanced by exactly the stored gap, warned
    const x1 = mine.find((v) => v.voucherNo === 'M53-INV-X1')!
    expect(Math.abs(sumSide(x1, true) - sumSide(x1, false))).toBeCloseTo(50, 2)
    // the narrow window excludes the 2099 fixtures of other suites
    const narrow = await buildTallyExport(new Date('2099-06-01'), new Date('2099-06-30'))
    expect(narrow.vouchers.map((v) => v.voucherNo).some((n) => n.startsWith('M53'))).toBe(false)
  })

  it('the counts shape (7 keys) + the notes carry the doctrine', async () => {
    const out = await buildTallyExport(WIN.from, WIN.to)
    expect(Object.keys(out.counts).sort()).toEqual(['creditNotes', 'journals', 'payments', 'purchases', 'receipts', 'reversals', 'sales'])
    expect(out.counts.creditNotes).toBe(2) // DN-M53-1 + DN-M53-LEGACY
    expect(out.counts.purchases).toBe(1) // M53-SB-1 (the draft excluded)
    expect(out.counts.reversals).toBeGreaterThanOrEqual(2) // CN-RCP + CN-M53J-1
    expect(out.notes.some((n) => n.includes('Counted once'))).toBe(true)
    expect(out.notes.some((n) => n.includes('Tally XML'))).toBe(true)
  })
})

describe('accounts-m04 — wiring (TL-05)', () => {
  it('get_tally_export: tools 265→266, accounts domain, read-only, the service twin', async () => {
    expect(allTools.length).toBe(271)
    const t = getTool('get_tally_export')!
    expect(t.domain).toBe('accounts')
    expect(t.isWrite).toBe(false)
    const res: any = await t.execute({ from: WIN.from.toISOString().slice(0, 10), to: WIN.to.toISOString().slice(0, 10) })
    expect(res.text).toContain('Tally export')
    expect(res.text).toContain('credit notes')
    expect(res.json.counts.creditNotes).toBeGreaterThanOrEqual(2)
    expect(res.json.vouchers.length).toBeLessThanOrEqual(20)
    expect(res.json.warnings.length).toBeGreaterThanOrEqual(3)
  })

  it('prompt: PROMPT_VERSION m53 + the Tally line', () => {
    expect(PROMPT_VERSION).toBe('m55-2026-09-08')
    const p = src('src/lib/agent/prompt.ts')
    expect(p).toContain('get_tally_export')
    expect(p).toContain('SPEC-M53 Tally both sides')
    expect(p).toContain('decision §17-4')
  })

  it('the service docstring carries THE EXPORT DOCTRINE; the route + page exist', () => {
    const svc = src('src/lib/erp/registers/tally.ts')
    expect(svc).toContain('THE EXPORT DOCTRINE')
    expect(svc).toContain('counted once')
    expect(existsSync(join(ROOT, 'src/app/api/tally/route.ts'))).toBe(true)
    const page = src('src/app/(erp)/accounts/tally-export/page.tsx')
    expect(page).toContain('Purchase')
    expect(page).toContain('data-tally-warnings')
    expect(page).toContain('Credit notes')
    expect(page).toContain('§17-4')
  })

  it('context_check pins: tools 271 + the m55 version check', () => {
    const cc = src('scripts/context_check.sh')
    expect(cc).toContain('"271"')
    expect(cc).toContain("m55-2026-09-08")
  })
})
