/**
 * Accounts M-02 (SPEC-M51, Module M Batch 2) — true double-entry posts:
 *   - resolveCashLeg paths: cash (bank ignored, NOTED), bank-mode-no-bank
 *     (control — byte-compat), bank+linked (the bank's own GL account),
 *     bank+unlinked (control + THE NAG), unknown accountNo (LOUD), inactive
 *     (LOUD, reactivation hint)
 *   - THE PAYMENT DOOR: a bank-linked receipt (Dr the bank account [1011] /
 *     Cr Sundry Debtors [1110], Payment.bankAccountId set, the string names
 *     the resolved account, the plan text carries the codes + the via) · the
 *     byte-compat pin (no bankAccountNo → Dr Cash/Bank [1010] exactly as
 *     M50) · cash+bank (control + the honest note) · the fallback nag · the
 *     cancel contra swaps the BANK legs
 *   - THE DEBIT-NOTE DOOR: the companion JV-{noteNo} (voucherType
 *     'debit-note', partyId, Dr Sales [4010] / Cr the party control — the
 *     deduction truth) · the ledger counts the note ONCE (the companion is
 *     outside the ['journal'] filter by design) · explicit debitAccount +
 *     the unknown refusal · the cancel (both rows flip + the CN- contra
 *     swaps) · the journal-cancel companion guard names cancel_debit_note
 *   - THE EXPENSE DOOR: transport+party (Dr Freight [5020] / Cr Sundry
 *     Creditors [2100], voucherType 'journal' — the wage-bill class) · the
 *     party ledger payable −500 → record_payment out → 0 (the loop-closure)
 *     · cash expense (Dr Other Expenses [5120] / Cr Cash/Bank [1010],
 *     partyId null) · explicit glAccount + the unknown refusal · the cancel
 *     (companion flip + contra; the payable re-opens) + the settled refusal
 *   - DE-04 THE DOUBLE-REVERSE FIX: the probe scenario — invoice 1,000 →
 *     receipt 1,000 → balance 0 → cancel the receipt → balance +1,000 (the
 *     re-opened AR; was −1,000 when contras counted) · the bills register
 *     drops the cancelled receipt from the day-book (source pin)
 *   - WIRING PINS: schema columns, config fields, docstrings, PROMPT_VERSION
 *     m51, COA_TREE 20 rows, seed paths 5120, the TB assert (companions
 *     balance: ΣDr == ΣCr by account, every row linked)
 * Windows: own code/voucher namespaces (M51-*), one invoice, revert all.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planPayment } from '@/lib/erp/posting/payment'
import { planDebitNote } from '@/lib/erp/posting/debit-note'
import { planExpense, defaultExpenseAccount } from '@/lib/erp/posting/expense'
import { planCancelPayment, planCancelJournal, planCancelDebitNote, planCancelExpense } from '@/lib/erp/posting/cancel'
import { COA_TREE, seedCoa, resolveAccountByRef, resolveCashLeg } from '@/lib/erp/coa'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { queryBillsRegister } from '@/lib/erp/registers/bills'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { partyConfig } from '@/lib/erp/master-configs/party'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const CUST = `M51-C-${TS}` // customer — the receipt + DN + probe door
const SUP = `M51-S-${TS}` // supplier — the expense + settle door
const BANK = `M51-BK-${TS}` // the bank (M51 HDFC)
const BA_LINK = `1111222233` // linked to the 1011 account
const BA_UNLINK = `4444555566` // present, no glAccountCode (the nag)
const BA_DEAD = `7777888899` // inactive (the loud reactivation hint)
const INV = `M51-INV-${TS}` // the probe invoice
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const acc = (code: string) => resolveAccountByRef(code)

// collected handles for the revert
let custPartyId = '', supPartyId = ''
let bankRowId = '', baLinkId = '', baUnlinkId = '', baDeadId = ''
let acc1011Id = '', invRowId = ''
const journalNos: string[] = [] // raw + JV-/CN- companions
const paymentNos: string[] = []
const expenseNos: string[] = []
const noteNos: string[] = []
let cashExpNo = '' // the CASH expense (no party) — the cancel walkthrough target

async function postPayment(args: any): Promise<string> {
  const plan = await planPayment(args)
  expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
  if (!plan.ok) throw new Error(String(plan.error))
  const res: any = await plan.commit()
  paymentNos.push(res.voucherNo)
  journalNos.push(`JV-${res.voucherNo}`, `CN-${res.voucherNo}`)
  return res.voucherNo as string
}

beforeAll(async () => {
  await seedCoa(db) // idempotent — the 20-row tree (incl. 5120)

  // the walkthrough fixtures: a per-bank account 1011 under the 1010 control
  const cash = await acc('1010')
  await db.account.deleteMany({ where: { code: '1011', name: 'HDFC 1234' } }).catch(() => {})
  const a1011 = await db.account.create({ data: { code: '1011', name: 'HDFC 1234', type: 'asset', parentId: cash!.id, active: true } })
  acc1011Id = a1011.id

  const cust = await planMasterCreate(partyConfig, { code: CUST, name: `M51 Customer ${TS}`, partyType: 'customer' })
  if (!cust.ok) throw new Error(String(cust.errors))
  custPartyId = (await (cust as any).commit()).id
  const sup = await planMasterCreate(partyConfig, { code: SUP, name: `M51 Supplier ${TS}`, partyType: 'supplier' })
  if (!sup.ok) throw new Error(String(sup.errors))
  supPartyId = (await (sup as any).commit()).id

  const bank = await db.bank.create({ data: { code: BANK, name: 'M51 HDFC' } })
  bankRowId = bank.id
  const baL = await db.bankAccount.create({ data: { accountNo: BA_LINK, bankId: bank.id, glAccountCode: '1011' } })
  baLinkId = baL.id
  const baU = await db.bankAccount.create({ data: { accountNo: BA_UNLINK, bankId: bank.id } })
  baUnlinkId = baU.id
  const baD = await db.bankAccount.create({ data: { accountNo: BA_DEAD, bankId: bank.id, active: false, glAccountCode: '1011' } })
  baDeadId = baD.id

  // the probe invoice — ₹1,000 billed to CUST (the double-reverse scenario)
  const inv = await db.salesInvoice.create({
    data: { invoiceNo: INV, partyId: custPartyId, finYear: '26-27', billAmount: 1000, status: 'issued', invoiceDate: new Date() },
  })
  invRowId = inv.id
})

afterAll(async () => {
  const sw = (p: any) => p.catch(() => {})
  // companions + contras first (FK/audit rows), then payments, then the docs
  const allJ = [...journalNos, ...expenseNos.map((e) => `JV-${e}`), ...expenseNos.map((e) => `CN-JV-${e}`), ...noteNos.map((n) => `JV-${n}`), ...noteNos.map((n) => `CN-JV-${n}`)]
  await sw(db.journal.deleteMany({ where: { voucherNo: { in: allJ } } }))
  for (const p of paymentNos) {
    // allocations attach by invoiceId (deleted above); the payment delete is
    // the whole voucher (no PaymentAllocation relation — plain paymentId FK)
    await sw(db.journal.deleteMany({ where: { voucherNo: { in: [`JV-${p}`, `CN-${p}`] } } }))
    await sw(db.payment.deleteMany({ where: { voucherNo: p } }))
  }
  await sw(db.expense.deleteMany({ where: { expNo: { in: expenseNos } } }))
  await sw(db.debitNote.deleteMany({ where: { noteNo: { in: noteNos } } }))
  await sw(db.paymentAllocation.deleteMany({ where: { invoiceId: invRowId } }))
  await sw(db.salesInvoice.deleteMany({ where: { id: invRowId } }))
  await sw(db.bankAccount.deleteMany({ where: { id: { in: [baLinkId, baUnlinkId, baDeadId].filter(Boolean) } } }))
  await sw(db.bank.deleteMany({ where: { id: bankRowId } }))
  await sw(db.account.deleteMany({ where: { id: acc1011Id } }))
  await sw(db.party.deleteMany({ where: { id: { in: [custPartyId, supPartyId].filter(Boolean) } } }))
})

describe('SPEC-M51 DE-01 — resolveCashLeg (the mode-aware cash/bank leg)', () => {
  it("mode 'cash' → the control; a bankAccountNo alongside is NOT silently ignored (the note says so)", async () => {
    const res = await resolveCashLeg({ mode: 'cash', bankAccountNo: BA_LINK })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.account.code).toBe('1010')
    expect(res.via).toBe('cash')
    expect(res.note).toContain('not used')
    const bare = await resolveCashLeg({ mode: 'cash' })
    expect((bare as any).note).toBeUndefined() // no bank given — no note
  })

  it('a bank mode WITHOUT bankAccountNo → the control, byte-identical to M50 (via control)', async () => {
    for (const mode of ['bank', 'cheque', 'rtgs', 'neft', 'upi', undefined]) {
      const res = await resolveCashLeg({ mode })
      expect(res.ok).toBe(true)
      if (!res.ok) return
      expect(res.account.code).toBe('1010')
      expect(res.via).toBe('control')
      expect(res.bankAccount).toBeUndefined()
    }
  })

  it('a bank mode + a LINKED bank → the bank account\'s own GL row (via bank)', async () => {
    const res = await resolveCashLeg({ mode: 'neft', bankAccountNo: BA_LINK })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.account.code).toBe('1011')
    expect(res.account.name).toBe('HDFC 1234')
    expect(res.via).toBe('bank')
    expect(res.bankAccount?.id).toBe(baLinkId)
    expect(res.note).toBeUndefined() // no nag — the link worked
  })

  it('an UNLINKED bank → the control + THE NAG (via control-fallback; payments never block)', async () => {
    const res = await resolveCashLeg({ mode: 'rtgs', bankAccountNo: BA_UNLINK })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.account.code).toBe('1010')
    expect(res.via).toBe('control-fallback')
    expect(res.bankAccount?.id).toBe(baUnlinkId)
    expect(res.note).toContain('no linked GL account')
    expect(res.note).toContain('Cash/Bank') // names where it landed
  })

  it('an UNKNOWN bankAccountNo is a LOUD error (an explicit reference, like an unknown partyCode)', async () => {
    const res = await resolveCashLeg({ mode: 'neft', bankAccountNo: '0000000000' })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('0000000000')
    expect(res.error).toContain('not found')
    expect(res.error).toContain('create_bank_account')
  })

  it('an INACTIVE bank is a loud error naming the reactivation door', async () => {
    const res = await resolveCashLeg({ mode: 'neft', bankAccountNo: BA_DEAD })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('inactive')
    expect(res.error).toContain('reactivate')
  })
})

describe('SPEC-M51 DE-01 — the payment door posts mode-aware legs', () => {
  it('the walkthrough receipt: neft + the linked bank → Dr HDFC 1234 [1011] / Cr Sundry Debtors [1110], Payment.bankAccountId set', async () => {
    const a1011 = await acc('1011'), debtors = await acc('1110')
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 800, mode: 'neft', bankAccountNo: BA_LINK, invoiceNo: INV })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    if (!plan.ok) return
    const effects = plan.sideEffects.join(' ')
    expect(effects).toContain('HDFC 1234 [1011] / Sundry Debtors [1110]')
    expect(effects).toContain("the bank account's own GL ledger")
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    journalNos.push(`JV-${res.voucherNo}`, `CN-${res.voucherNo}`)
    const pay = await db.payment.findUniqueOrThrow({ where: { voucherNo: res.voucherNo } })
    expect(pay.bankAccountId).toBe(baLinkId) // the FK — audit + the cancel mirror
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.voucherNo}` } })
    expect(jv.debitAccountId).toBe(a1011!.id) // the bank's OWN account — not the generic control
    expect(jv.creditAccountId).toBe(debtors!.id)
    expect(jv.debitAccount).toBe('HDFC 1234') // the STRING names the resolved account
    expect(jv.voucherType).toBe('receipt')
  })

  it('BYTE-COMPAT: the same receipt WITHOUT bankAccountNo → Dr Cash/Bank [1010], bankAccountId null — exactly the M50 behavior', async () => {
    const cash = await acc('1010'), debtors = await acc('1110')
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 100, mode: 'neft' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    journalNos.push(`JV-${res.voucherNo}`, `CN-${res.voucherNo}`)
    const pay = await db.payment.findUniqueOrThrow({ where: { voucherNo: res.voucherNo } })
    expect(pay.bankAccountId).toBeNull()
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.voucherNo}` } })
    expect(jv.debitAccountId).toBe(cash!.id)
    expect(jv.creditAccountId).toBe(debtors!.id)
    expect(jv.debitAccount).toBe('Cash/Bank') // the M50 string, byte-identical
    expect(jv.creditAccount).toBe(`M51 Customer ${TS}`)
  })

  it("mode 'cash' + a bank given → still [1010] with the honest note in the plan text (no silent ignore)", async () => {
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 50, mode: 'cash', bankAccountNo: BA_LINK })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.sideEffects.join(' ')).toContain('the bank account is not used for the GL leg')
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    journalNos.push(`JV-${res.voucherNo}`, `CN-${res.voucherNo}`)
    const pay = await db.payment.findUniqueOrThrow({ where: { voucherNo: res.voucherNo } })
    expect(pay.bankAccountId).toBeNull() // cash never resolves a bank
  })

  it('the fallback nag: an unlinked bank → [1010] + the plan text names the bank and the fix', async () => {
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 60, mode: 'cheque', bankAccountNo: BA_UNLINK })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const effects = plan.sideEffects.join(' ')
    expect(effects).toContain('has no linked GL account')
    expect(effects).toContain('Cash/Bank control')
    const res: any = await plan.commit()
    paymentNos.push(res.voucherNo)
    journalNos.push(`JV-${res.voucherNo}`, `CN-${res.voucherNo}`)
    const pay = await db.payment.findUniqueOrThrow({ where: { voucherNo: res.voucherNo } })
    expect(pay.bankAccountId).toBe(baUnlinkId) // the bank WAS resolved (audit) — the GL leg just fell back
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.voucherNo}` } })
    expect(jv.debitAccountId).toBe((await acc('1010'))!.id)
  })

  it('an unknown bankAccountNo REFUSES the payment before any row is written', async () => {
    const before = await db.payment.count()
    const plan = await planPayment({ partyCode: CUST, direction: 'in', amount: 70, mode: 'neft', bankAccountNo: '0000000000' })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain('0000000000')
    expect(await db.payment.count()).toBe(before) // nothing written
  })

  it('cancel the bank-linked receipt → the contra SWAPS the bank legs (Dr Sundry Debtors / Cr HDFC 1234)', async () => {
    const voucherNo = await postPayment({ partyCode: CUST, direction: 'in', amount: 90, mode: 'upi', bankAccountNo: BA_LINK })
    const a1011 = await acc('1011'), debtors = await acc('1110')
    const cancel = await planCancelPayment({ voucherNo })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    await cancel.commit()
    const contra = await db.journal.findUniqueOrThrow({ where: { voucherNo: `CN-${voucherNo}` } })
    expect(contra.debitAccountId).toBe(debtors!.id) // the receipt's Cr leg, swapped
    expect(contra.creditAccountId).toBe(a1011!.id) // the BANK leg, swapped — not the generic control
    expect(contra.creditAccount).toBe('HDFC 1234')
  })
})

describe('SPEC-M51 DE-02 — the debit-note door (GL legs + the honest claim)', () => {
  it('the walkthrough note: companion JV-{noteNo} — voucherType debit-note, Dr Sales [4010] / Cr Sundry Debtors [1110], the DEDUCTION claim', async () => {
    const sales = await acc('4010'), debtors = await acc('1110')
    const plan = await planDebitNote({ noteType: 'fabric', partyCode: CUST, amount: 200, reason: 'shade deviation' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    if (!plan.ok) return
    expect(plan.creates!.length).toBe(2) // the note row + the companion journal
    const effects = plan.sideEffects.join(' ')
    expect(effects).toContain('reduces') // the corrected claim — 'increases' is retired
    expect(effects).not.toContain('AR increases')
    expect(effects).toContain('Sales [4010]')
    expect(effects).toContain('Sundry Debtors [1110]')
    const res: any = await plan.commit()
    noteNos.push(res.noteNo)
    journalNos.push(`JV-${res.noteNo}`, `CN-JV-${res.noteNo}`)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.noteNo}` } })
    expect(jv.voucherType).toBe('debit-note') // OUTSIDE the party-ledger ['journal'] filter by design
    expect(jv.partyId).toBe(custPartyId)
    expect(jv.debitAccountId).toBe(sales!.id)
    expect(jv.creditAccountId).toBe(debtors!.id)
    expect(jv.debitAccount).toBe('Sales')
    expect(jv.creditAccount).toBe(`M51 Customer ${TS}`) // the party NAME string stays (voucher detail)
    expect(jv.amount).toBe(200)
    const note = await db.debitNote.findUniqueOrThrow({ where: { noteNo: res.noteNo } })
    expect(note.status).toBe('raised')
  })

  it('the sub-ledger counts the note ONCE: the − debit term, never the companion (no double-subtract)', async () => {
    const s = await getPartyLedgerSummary(custPartyId)!
    const dnTotal = s.totalDebit
    // the walkthrough note (200) is the only non-cancelled note for CUST
    expect(dnTotal).toBeGreaterThanOrEqual(200)
    // the companion is voucherType 'debit-note' — outside the ['journal'] filter:
    // totalJournal must NOT include it (the DN row IS the sub-ledger truth)
    const companions = await db.journal.findMany({ where: { partyId: custPartyId, voucherType: 'debit-note', status: 'active' } })
    expect(companions.length).toBeGreaterThanOrEqual(1)
    expect(s.totalJournal).toBeLessThan(companions.reduce((sm, j) => sm + j.amount, 0) + 1) // none of it rides the journals term
  })

  it('an explicit debitAccount resolves (code form 5010); an unknown one REFUSES — no note row written', async () => {
    const wages = await acc('5010')
    const plan = await planDebitNote({ noteType: 'pcs', partyCode: CUST, amount: 25, debitAccount: '5010' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    noteNos.push(res.noteNo)
    journalNos.push(`JV-${res.noteNo}`, `CN-JV-${res.noteNo}`)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.noteNo}` } })
    expect(jv.debitAccountId).toBe(wages!.id) // the code form resolved
    expect(jv.debitAccount).toBe('Production Wages')
    const before = await db.debitNote.count()
    const refused = await planDebitNote({ noteType: 'comm', partyCode: CUST, amount: 10, debitAccount: 'Not A Real Account' })
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.error).toContain('Not A Real Account')
    expect(refused.error).toContain('create_account')
    expect(await db.debitNote.count()).toBe(before) // no half-posted note
    expect(await db.journal.findFirst({ where: { voucherNo: { startsWith: 'JV-DN-' } } })).toBeTruthy() // the door itself works
  })

  it("the journal-cancel companion guard names the NOTE door (cancel_debit_note), not the payment door", async () => {
    const guard = await planCancelJournal({ voucherNo: `JV-${noteNos[0]}` })
    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.error).toContain("debit note's companion voucher")
    expect(guard.error).toContain('cancel_debit_note')
  })

  it('cancel the note → BOTH rows flip cancelled + the CN- contra swaps the legs; the deduction leaves the ledger', async () => {
    const before = (await getPartyLedgerSummary(custPartyId))!.totalDebit
    const cancel = await planCancelDebitNote({ noteNo: noteNos[0] })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    expect(cancel.summary).toContain(`CN-JV-${noteNos[0]}`)
    const res: any = await cancel.commit()
    expect(res.contra).toBe(`CN-JV-${noteNos[0]}`)
    const sales = await acc('4010'), debtors = await acc('1110')
    const note = await db.debitNote.findUniqueOrThrow({ where: { noteNo: noteNos[0] } })
    expect(note.status).toBe('cancelled')
    const companion = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${noteNos[0]}` } })
    expect(companion.status).toBe('cancelled')
    const contra = await db.journal.findUniqueOrThrow({ where: { voucherNo: `CN-JV-${noteNos[0]}` } })
    expect(contra.debitAccountId).toBe(debtors!.id) // SWAPPED (the M50 doctrine)
    expect(contra.creditAccountId).toBe(sales!.id)
    expect(contra.voucherType).toBe('contra')
    const after = (await getPartyLedgerSummary(custPartyId))!.totalDebit
    expect(after).toBeLessThan(before) // the cancelled deduction no longer nets
  })
})

describe('SPEC-M51 DE-03 — the expense door (GL legs + the settle path)', () => {
  it('defaultExpenseAccount maps transport → Freight, everything else → Other Expenses', () => {
    expect(defaultExpenseAccount('transport')).toBe('Freight')
    expect(defaultExpenseAccount('general')).toBe('Other Expenses')
    expect(defaultExpenseAccount('fixed')).toBe('Other Expenses')
    expect(defaultExpenseAccount('stylewise')).toBe('Other Expenses')
    expect(defaultExpenseAccount('other')).toBe('Other Expenses')
  })

  it('the party expense: transport + SUP → companion JV-{expNo} Dr Freight [5020] / Cr Sundry Creditors [2100] — the ledger shows the payable', async () => {
    const freight = await acc('5020'), creditors = await acc('2100')
    const plan = await planExpense({ category: 'transport', amount: 500, partyCode: SUP, narration: 'm51 freight bill' })
    expect(plan.ok, plan.ok ? '' : String(plan.error)).toBe(true)
    if (!plan.ok) return
    const effects = plan.sideEffects.join(' ')
    expect(effects).toContain('Dr Freight [5020] / Cr Sundry Creditors [2100]')
    expect(effects).toContain('settle with record_payment') // the settle path is claimed
    const res: any = await plan.commit()
    expenseNos.push(res.expNo)
    journalNos.push(`JV-${res.expNo}`, `CN-JV-${res.expNo}`)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.expNo}` } })
    expect(jv.voucherType).toBe('journal') // the wage-bill class — IN the party-ledger filter
    expect(jv.partyId).toBe(supPartyId)
    expect(jv.debitAccountId).toBe(freight!.id)
    expect(jv.creditAccountId).toBe(creditors!.id)
    expect(jv.creditAccount).toBe(`M51 Supplier ${TS}`) // WHO we owe (voucher detail); the FK classifies
    const s = await getPartyLedgerSummary(supPartyId)!
    expect(s.totalJournal).toBe(500) // the payable IS visible before settlement
    expect(s.balance).toBe(-500) // we owe — opening 0 − journals 500
  })

  it('THE LOOP-CLOSURE: record_payment OUT ₹500 to SUP → the balance nets to 0 (the M45 proof extended)', async () => {
    await postPayment({ partyCode: SUP, direction: 'out', amount: 500, mode: 'cash', notes: 'settle the freight expense' })
    const s = await getPartyLedgerSummary(supPartyId)!
    expect(s.totalPaid).toBe(500)
    expect(s.balance).toBe(0) // −500 payable + 500 paid = settled
  })

  it('the cash expense: general, no party → Dr Other Expenses [5120] / Cr Cash/Bank [1010], partyId null (invisible to the sub-ledger)', async () => {
    const other = await acc('5120'), cash = await acc('1010')
    const plan = await planExpense({ category: 'general', amount: 300, narration: 'm51 tea bill' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    expenseNos.push(res.expNo)
    cashExpNo = res.expNo
    journalNos.push(`JV-${res.expNo}`, `CN-JV-${res.expNo}`)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.expNo}` } })
    expect(jv.voucherType).toBe('journal')
    expect(jv.partyId).toBeNull() // no party — the sub-ledger never sees it
    expect(jv.debitAccountId).toBe(other!.id) // the NEW 20th seeded row
    expect(jv.creditAccountId).toBe(cash!.id)
    expect(jv.creditAccount).toBe('Cash/Bank') // paid at record — the leg names itself
  })

  it('an explicit glAccount resolves; an unknown one REFUSES — no expense row written', async () => {
    const plan = await planExpense({ category: 'other', amount: 40, glAccount: '4010' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    expenseNos.push(res.expNo)
    journalNos.push(`JV-${res.expNo}`, `CN-JV-${res.expNo}`)
    const jv = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${res.expNo}` } })
    expect(jv.debitAccountId).toBe((await acc('4010'))!.id) // the explicit leg won
    const before = await db.expense.count()
    const refused = await planExpense({ category: 'other', amount: 10, glAccount: 'Not A Real Account' })
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.error).toContain('Not A Real Account')
    expect(refused.error).toContain('create_account')
    expect(await db.expense.count()).toBe(before) // no half-posted expense
  })

  it('cancel the cash expense → companion flips + the CN- contra mirrors; a SETTLED expense refuses', async () => {
    // a settled expense is refused (reversal is a journal entry, not a cancel)
    const settledPlan = await planExpense({ category: 'general', amount: 15, status: 'settled' })
    expect(settledPlan.ok).toBe(true)
    if (!settledPlan.ok) return
    const settledRes: any = await settledPlan.commit()
    expenseNos.push(settledRes.expNo)
    journalNos.push(`JV-${settledRes.expNo}`, `CN-JV-${settledRes.expNo}`)
    const settledRefusal = await planCancelExpense({ expNo: settledRes.expNo })
    expect(settledRefusal.ok).toBe(false)
    if (settledRefusal.ok) return
    expect(settledRefusal.error).toContain('settled')
    // cancel the CASH expense (no party — the companion flip is the whole GL story)
    const cancel = await planCancelExpense({ expNo: cashExpNo })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    const res: any = await cancel.commit()
    expect(res.contra).toBe(`CN-JV-${cashExpNo}`)
    const exp = await db.expense.findUniqueOrThrow({ where: { expNo: cashExpNo } })
    expect(exp.status).toBe('cancelled')
    const companion = await db.journal.findUniqueOrThrow({ where: { voucherNo: `JV-${cashExpNo}` } })
    expect(companion.status).toBe('cancelled')
    const contra = await db.journal.findUniqueOrThrow({ where: { voucherNo: `CN-JV-${cashExpNo}` } })
    expect(contra.debitAccountId).toBe((await acc('1010'))!.id) // the legs SWAPPED
    expect(contra.creditAccountId).toBe((await acc('5120'))!.id)
  })

  it('the party-expense cancel re-opens the payable (the ledger stops counting the cancelled companion)', async () => {
    // fresh party expense (fixed ₹120) → the payable grows; cancel → it drops back
    const plan = await planExpense({ category: 'fixed', amount: 120, partyCode: SUP })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res: any = await plan.commit()
    expenseNos.push(res.expNo)
    journalNos.push(`JV-${res.expNo}`, `CN-JV-${res.expNo}`)
    const withOpen = (await getPartyLedgerSummary(supPartyId))!.totalJournal // 500 + 120
    expect(withOpen).toBe(620)
    const cancel = await planCancelExpense({ expNo: res.expNo })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    await cancel.commit()
    const settled = (await getPartyLedgerSummary(supPartyId))!.totalJournal
    expect(settled).toBe(500) // the cancelled 120 left the − journals term — the payable re-opened
  })
})

describe('SPEC-M51 DE-04 — the double-reverse fix (honest money screens)', () => {
  // an isolated party: invoice 1,000 → receipt 1,000 → cancel → re-opened +1,000
  // (pre-M51 the ledger read −1,000: the cancelled receipt still counted as
  // received AND its contra counted again — the probe that scoped this batch)
  let probePartyId = ''
  let probeInvId = ''

  it('the probe: cancel the receipt → the balance RE-OPENS (+1,000), not double-reverses (−1,000)', async () => {
    const mk = await planMasterCreate(partyConfig, { code: `M51-P-${TS}`, name: `M51 Probe ${TS}`, partyType: 'customer' })
    if (!mk.ok) throw new Error(String(mk.errors))
    probePartyId = (await (mk as any).commit()).id
    const inv = await db.salesInvoice.create({
      data: { invoiceNo: `M51-PINV-${TS}`, partyId: probePartyId, finYear: '26-27', billAmount: 1000, status: 'issued', invoiceDate: new Date() },
    })
    probeInvId = inv.id
    const rcp = await postPayment({ partyCode: `M51-P-${TS}`, direction: 'in', amount: 1000, mode: 'bank', invoiceNo: `M51-PINV-${TS}` })
    const settled = (await getPartyLedgerSummary(probePartyId))!
    expect(settled.totalReceived).toBe(1000)
    expect(settled.balance).toBe(0) // collected in full — the pre-cancel truth
    const cancel = await planCancelPayment({ voucherNo: rcp })
    expect(cancel.ok).toBe(true)
    if (!cancel.ok) return
    await cancel.commit()
    const reOpened = (await getPartyLedgerSummary(probePartyId))!
    expect(reOpened.totalReceived).toBe(0) // the cancelled receipt stopped counting
    expect(reOpened.balance).toBe(1000) // AR re-opened — NOT the double-reversed −1000
    expect(reOpened.totalJournal).toBe(0) // and the CONTRA never counted (the fix's second half)
  })

  it('the bills register drops the cancelled receipt from the day-book (three screens, one balance)', async () => {
    const res = await queryBillsRegister({ party: `M51-P-${TS}`, limit: 100, page: 1 })
    expect(res.count).toBeGreaterThan(0)
    const paymentRows = res.rows.filter((r: any) => String(r.href ?? '').includes('/accounts/payments') || String(r.docNo ?? '').startsWith('RCP'))
    expect(paymentRows.length).toBe(0) // the cancelled receipt left the collected column
    const invRow = res.rows.find((r: any) => String(r.docNo ?? '').includes(`M51-PINV`))
    expect(invRow).toBeTruthy() // the invoice is still billed
    // cleanup: the probe party leaves nothing behind
    await db.paymentAllocation.deleteMany({ where: { invoiceId: probeInvId } }).catch(() => {})
    await db.salesInvoice.deleteMany({ where: { id: probeInvId } }).catch(() => {})
    await db.party.deleteMany({ where: { id: probePartyId } }).catch(() => {})
  })

  it('DE-04 source pins: the active-only reads in BOTH party-ledger paths + the bills filters', () => {
    const ledger = src('src/lib/erp/registers/party-ledger.ts')
    expect(ledger).toContain("voucherType: 'journal', status: 'active'")
    expect(ledger).not.toContain("voucherType: { in: ['journal', 'contra'] }")
    expect(ledger).toContain("status: 'active'") // payments
    const bills = src('src/lib/erp/registers/bills.ts')
    expect(bills).toContain("const payWhere = { ...where, status: 'active' }")
    expect(bills).toContain("const dnWhere = { ...where, status: { not: 'cancelled' } }")
  })
})

describe('SPEC-M51 DE-05/DE-06 — wiring pins + the TB assert', () => {
  it('the journal-cancel guard knows the two NEW companion families', () => {
    const cancel = src('src/lib/erp/posting/cancel.ts')
    expect(cancel).toContain("startsWith('JV-DN-')")
    expect(cancel).toContain("startsWith('JV-EXP-')")
    expect(cancel).toContain('cancel_debit_note') // the right door named
    expect(cancel).toContain('cancel_expense')
  })

  it('the schema carries the two new columns + the relation', () => {
    const schema = src('prisma/schema.prisma')
    expect(schema).toContain('bankAccountId String?')
    expect(schema).toContain('glAccountCode String?')
    expect(schema).toContain('payments    Payment[]')
  })

  it('the doors wire resolveCashLeg / the companions / the config surfaces', () => {
    expect(src('src/lib/erp/posting/payment.ts')).toContain('resolveCashLeg')
    expect(src('src/lib/erp/posting/payment.ts')).toContain('cashTx.account.name') // the string names the resolved leg
    expect(src('src/lib/erp/posting/debit-note.ts')).toContain("voucherType: 'debit-note'")
    expect(src('src/lib/erp/posting/debit-note.ts')).toContain('reduces') // the honest claim
    expect(src('src/lib/erp/posting/expense.ts')).toContain("voucherType: 'journal'")
    expect(src('src/lib/erp/posting/expense.ts')).toContain('defaultExpenseAccount')
    expect(src('src/lib/erp/coa.ts')).toContain('resolveCashLeg')
    expect(src('src/lib/erp/coa.ts')).toContain("code: '5120'")
    expect(src('src/lib/erp/coa.ts')).toContain("name: 'Other Expenses'")
    expect(COA_TREE.length).toBe(20) // the 20-row tree
    expect(COA_TREE.find((r) => r.code === '5120')!.parentCode).toBe('5100')
    // the form surfaces (doc-configs) + the bank master preference
    expect(src('src/lib/erp/doc-configs/payment.ts')).toContain('bankAccountNo')
    expect(src('src/lib/erp/doc-configs/payment.ts')).toContain("picker: 'bank-account'")
    expect(src('src/lib/erp/doc-configs/debit-note.ts')).toContain('debitAccount')
    expect(src('src/lib/erp/doc-configs/expense.ts')).toContain('glAccount')
    const bank = src('src/lib/erp/master-configs/bank-account.ts')
    expect(bank).toContain("name: 'glAccountCode'")
    expect(bank).toContain('GL Acct')
  })

  it('docstrings + the prompt carry the M-02 rules; the seed paths carry 5120', () => {
    const tools = src('src/lib/agent/tools.ts')
    expect(tools).toContain('bankAccountNo (with a bank mode')
    expect(tools).toContain('DEDUCTION from the buyer') // the corrected claim (escaped \' in source — match before it)
    expect(tools).toContain('the category default — transport → Freight [5020]') // SPEC-M54: the head refines the default (docstring updated)
    expect(PROMPT_VERSION).toBe('m55-2026-09-08')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('SPEC-M51 true double-entry')
    expect(prompt).toContain('Other Expenses [5120]')
    expect(src('scripts/seed.ts')).toContain("'5120', 'Other Expenses'")
    expect(src('scripts/seed_coa.ts')).toContain("'5120', 'Other Expenses'")
    expect(src('src/lib/erp/schemas/payment.ts')).toContain('bankAccountNo')
    expect(src('src/lib/erp/schemas/debit-note.ts')).toContain('debitAccount')
    expect(src('src/lib/erp/schemas/expense.ts')).toContain('glAccount')
  })

  it('THE TB ASSERT: every journal row carries both FKs; companions balance — ΣDr == ΣCr by account', async () => {
    const rows = await db.journal.findMany({ select: { debitAccountId: true, creditAccountId: true, amount: true } })
    expect(rows.length).toBeGreaterThan(180)
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
    expect(Math.abs(sumDr - sumCr)).toBeLessThan(0.01) // balanced — the companions included
  })
})
