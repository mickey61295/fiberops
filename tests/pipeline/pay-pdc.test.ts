/**
 * M56 (Phase-6B, SPEC-M56 — PAY-08, §17-3 ADR-020) — the cheque/PDC lifecycle:
 *   PDC-02  the issued stamp (cheque-mode payments carry chequeStatus; the
 *           honest-nag when a date rides a non-cheque mode; undated cheques)
 *   PDC-03  the clear door (the physical confirmation stamp — NO journal,
 *           allocations untouched; the register loses the row)
 *   PDC-04  the bounce door (the M40 CN- machinery + the 'bounced' stamp in
 *           ONE tx: allocations reverse, invoice statuses re-derive)
 *   PDC-05  the PDC register (rows, PDC badge, aging, filters, totals)
 *   PDC-06  remit-to: the ACTIVE BankAccount master wins over print.* options
 *   PDC-07  wiring (tools + config + service + menu + route + prompt + pins)
 * Plus the plain-cancel byte-identity guard (the PAY-06 refactor safety).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planPayment } from '@/lib/erp/posting/payment'
import { planChequeClear, planChequeBounce } from '@/lib/erp/posting/cheque'
import { planCancelPayment } from '@/lib/erp/posting/cancel'
import { queryPdc } from '@/lib/erp/registers/pdc'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { PAYMENT_SCHEMA } from '@/lib/erp/schemas/payment'
import { CHEQUE_CLEAR_SCHEMA, CHEQUE_BOUNCE_SCHEMA } from '@/lib/erp/schemas/cancel'
import { getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION } from '@/lib/agent/prompt'
import { getPrintHeader } from '@/lib/erp/reports/report-csv'
import { LIVE_ROUTES, MENU_ITEMS } from '@/lib/erp/menu-registry'

const TS = Date.now()
const CUST = `M56-C-${TS}`          // customer party (the invoice + overdue receipt)
const CUST2 = `M56-C2-${TS}`        // second customer (the on-account receipts — keeps INV clean for FIFO)
const SUP = `M56-S-${TS}`           // supplier party (the payment-out side)
const INV = `INV-M56-${TS}`         // the invoice the overdue cheque receipt settles
const DAY = 86_400_000

const ERP_DIR = join(process.cwd(), 'src/lib/erp')
const APP_DIR = join(process.cwd(), 'src/app/(erp)/accounts')
const AGENT_DIR = join(process.cwd(), 'src/lib/agent')
const src = (base: string, p: string) => readFileSync(join(base, p), 'utf8')

let custId = '', supId = '', invId = ''
let pdcRcp = ''                      // PDC receipt (future-dated, on-account)
let overRcp = ''                     // overdue receipt (past-dated, settles the invoice)
let plainRcp = ''                    // undated cheque receipt (the clear-door subject)
let bankPmt = ''                     // bank-mode payment (non-cheque guards + nag)
let outChq = ''                      // cheque payment out (the plain-cancel guard)
const createdVouchers: string[] = []

async function commit<T>(planOrPromise: any): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 200)}`)
  return plan.commit!()
}

describe('M56 PAY-08 — the cheque/PDC lifecycle (SPEC-M56, §17-3 ADR-020)', () => {
  beforeAll(async () => {
    const cust = await db.party.create({ data: { code: CUST, name: `M56 Customer ${TS}`, partyType: 'customer' } })
    custId = cust.id
    await db.party.create({ data: { code: CUST2, name: `M56 Customer2 ${TS}`, partyType: 'customer' } })
    const sup = await db.party.create({ data: { code: SUP, name: `M56 Supplier ${TS}`, partyType: 'supplier' } })
    supId = sup.id
    const inv = await db.salesInvoice.create({
      data: { invoiceNo: INV, partyId: cust.id, invoiceDate: new Date(), finYear: '26-27', billAmount: 2000, status: 'issued' },
    })
    invId = inv.id
  })

  afterAll(async () => {
    // allocations → payments → journals → invoice → parties → bank fixtures → print options
    const vouchers = createdVouchers.length ? createdVouchers : []
    const payRows = vouchers.length ? await db.payment.findMany({ where: { voucherNo: { in: vouchers } }, select: { id: true } }) : []
    const payIds = payRows.map((p: any) => p.id)
    if (payIds.length) await db.paymentAllocation.deleteMany({ where: { paymentId: { in: payIds } } })
    await db.payment.deleteMany({ where: { voucherNo: { in: [...vouchers, `CN-x-${TS}`] } } })
    await db.journal.deleteMany({ where: { OR: vouchers.flatMap((v) => [{ voucherNo: `JV-${v}` }, { voucherNo: `CN-${v}` }]) } })
    await db.salesInvoice.deleteMany({ where: { id: invId } })
    await db.party.deleteMany({ where: { code: { in: [CUST, CUST2, SUP] } } })
    await db.bankAccount.deleteMany({ where: { accountNo: { startsWith: 'M56-ACC' } } })
    await db.bank.deleteMany({ where: { name: { startsWith: 'M56 Bank' } } })
    await db.appOption.deleteMany({ where: { key: { startsWith: 'print.' }, value: { startsWith: 'M56 ' } } })
  })

  // ───────── PDC-02 — the issued stamp ─────────

  it('PDC-02: a cheque-mode payment stamps issued + the POST-DATED plan card', async () => {
    const future = new Date(Date.now() + 7 * DAY)
    const plan = await planPayment({
      partyCode: CUST2, amount: 1500, direction: 'in', mode: 'cheque', reference: 'CHQ-M56-77',
      chequeDate: future.toISOString().slice(0, 10),
    })
    expect(plan.ok).toBe(true)
    expect(plan.text).toContain('Cheque CHQ-M56-77 issued')
    expect(plan.text).toContain('POST-DATED, due')
    expect(plan.summary).toContain('cheque issued (PDC due')
    expect(plan.creates![0].data.chequeStatus).toBe('issued')
    expect(plan.sideEffects!.some((s: string) => s.includes('ISSUED (appears in the /accounts/pdc PDC register'))).toBe(true)
    const res = await commit<any>(plan)
    pdcRcp = res.voucherNo
    createdVouchers.push(pdcRcp)
    expect(res.chequeStatus).toBe('issued')
    const row = await db.payment.findUnique({ where: { voucherNo: pdcRcp } })
    expect(row?.chequeStatus).toBe('issued')
    expect(row?.chequeDate?.toISOString().slice(0, 10)).toBe(future.toISOString().slice(0, 10))
    expect(row?.status).toBe('active')
    const jv = await db.journal.findUnique({ where: { voucherNo: `JV-${pdcRcp}` } })
    expect(jv).not.toBeNull() // the bank GL leg posted at voucher time (M51 doctrine)
  })

  it('PDC-02: the honest-nag — a chequeDate on a bank-mode payment is NAMED as ignored', async () => {
    const plan = await planPayment({
      partyCode: SUP, amount: 700, direction: 'out', mode: 'bank',
      chequeDate: new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10),
    })
    expect(plan.ok).toBe(true)
    expect(plan.sideEffects!.some((s: string) => /IGNORED — mode is 'bank'/.test(s))).toBe(true)
    const res = await commit<any>(plan)
    bankPmt = res.voucherNo
    createdVouchers.push(bankPmt)
    const row = await db.payment.findUnique({ where: { voucherNo: bankPmt } })
    expect(row?.chequeStatus).toBeNull()
    expect(row?.chequeDate).toBeNull()
  })

  it('PDC-02: a cheque without a date still starts the journey (issued, date null)', async () => {
    const plan = await planPayment({ partyCode: CUST2, amount: 300, direction: 'in', mode: 'cheque', reference: 'CHQ-M56-78' })
    expect(plan.ok).toBe(true)
    expect(plan.creates![0].data.chequeStatus).toBe('issued')
    const res = await commit<any>(plan)
    plainRcp = res.voucherNo
    createdVouchers.push(plainRcp)
    const row = await db.payment.findUnique({ where: { voucherNo: plainRcp } })
    expect(row?.chequeStatus).toBe('issued')
    expect(row?.chequeDate).toBeNull()
  })

  // ───────── PDC-05 — the register (before the transitions mutate the rows) ─────────

  it('PDC-05: the register — rows, PDC badge, aging, overdue totals, non-cheques absent', async () => {
    // an overdue cheque receipt settling the invoice (past-dated cheque)
    const past = new Date(Date.now() - 3 * DAY)
    const res = await commit<any>(await planPayment({
      partyCode: CUST, amount: 2000, direction: 'in', invoiceNo: INV, mode: 'cheque', reference: 'CHQ-M56-79',
      chequeDate: past.toISOString().slice(0, 10),
    }))
    overRcp = res.voucherNo
    createdVouchers.push(overRcp)
    expect(res.allocated).toBe(2000) // FIFO settled the invoice fully
    const inv = await db.salesInvoice.findUnique({ where: { id: invId } })
    expect(inv?.status).toBe('paid')

    // a cheque payment OUT (the plain-cancel guard subject)
    const res2 = await commit<any>(await planPayment({ partyCode: SUP, amount: 400, direction: 'out', mode: 'cheque', reference: 'CHQ-M56-80' }))
    outChq = res2.voucherNo
    createdVouchers.push(outChq)

    const q = await queryPdc({ limit: 100, page: 1 })
    expect(q.count).toBe(4) // pdcRcp + plainRcp + overRcp + outChq — bankPmt absent
    const byVoucher = new Map(q.rows.map((r: any) => [r.voucherNo, r]))
    expect(byVoucher.get(pdcRcp)?.type).toBe('PDC')
    expect(byVoucher.get(pdcRcp)?.due).toMatch(/^due in \d+ d$/)
    expect(byVoucher.get(overRcp)?.type).toBe('cheque')
    expect(byVoucher.get(overRcp)?.due).toMatch(/^OVERDUE \d+ d$/)
    expect(byVoucher.get(plainRcp)?.due).toBe('—')
    expect(byVoucher.get(plainRcp)?.type).toBe('—')
    expect(byVoucher.get(overRcp)?.href).toBe(`/accounts/payments/${(await db.payment.findUnique({ where: { voucherNo: overRcp } }))?.id}`)
    const overdueTotal = (q.totals ?? []).find((t: any) => t.label === 'Overdue (₹)')?.value ?? 0
    expect(Number(overdueTotal)).toBeGreaterThanOrEqual(2000)
    expect(q.summary).toContain('post-dated')
  })

  it('PDC-05: the register filters — direction, party, cheque-date window', async () => {
    const ins = await queryPdc({ limit: 100, page: 1, direction: 'in' })
    expect(ins.rows.every((r: any) => r.direction === 'in')).toBe(true)
    expect(ins.rows.some((r: any) => r.voucherNo === outChq)).toBe(false)
    const mine = await queryPdc({ limit: 100, page: 1, q: CUST })
    expect(mine.rows.every((r: any) => r.party.includes(CUST))).toBe(true)
    expect(mine.rows.some((r: any) => r.voucherNo === outChq)).toBe(false)
    const futureWindow = await queryPdc({ limit: 100, page: 1, from: new Date(Date.now() + DAY), to: new Date(Date.now() + 14 * DAY) })
    expect(futureWindow.rows.map((r: any) => r.voucherNo)).toEqual([pdcRcp]) // only the future-dated row
  })

  // ───────── PDC-03 — the clear door ─────────

  it('PDC-03: the clear door — the stamp, NO journal, the register loses the row', async () => {
    const journalsBefore = await db.journal.count({ where: { voucherNo: { startsWith: `CN-${plainRcp}` } } })
    const plan = await planChequeClear({ voucherNo: plainRcp, notes: 'bank confirmed' })
    expect(plan.ok).toBe(true)
    expect(plan.text).toContain('Physical confirmation only')
    expect(plan.updates![0].data.chequeStatus).toBe('cleared')
    expect(plan.creates).toEqual([])
    expect(plan.sideEffects!.some((s: string) => s.startsWith('NO journal'))).toBe(true)
    const res = await commit<any>(plan)
    expect(res.chequeStatus).toBe('cleared')
    const row = await db.payment.findUnique({ where: { voucherNo: plainRcp } })
    expect(row?.chequeStatus).toBe('cleared')
    expect(row?.clearedAt).not.toBeNull()
    expect(row?.status).toBe('active') // the money was real — PAY-06 untouched
    const journalsAfter = await db.journal.count({ where: { voucherNo: { startsWith: `CN-${plainRcp}` } } })
    expect(journalsAfter).toBe(journalsBefore) // zero — no journal ever
    const q = await queryPdc({ limit: 100, page: 1 })
    expect(q.rows.some((r: any) => r.voucherNo === plainRcp)).toBe(false)
  })

  it('PDC-03: clear refusals — non-cheque mode, unknown voucher, cleared-again, pre-M56 stamp', async () => {
    const nonCheque = await planChequeClear({ voucherNo: bankPmt })
    expect(nonCheque.ok).toBe(false)
    expect(nonCheque.error).toContain("mode 'bank'")
    const unknown = await planChequeClear({ voucherNo: 'RCP-999999' })
    expect(unknown.ok).toBe(false)
    expect(unknown.error).toContain('not found')
    const again = await planChequeClear({ voucherNo: plainRcp })
    expect(again.ok).toBe(false)
    expect(again.error).toContain('already CLEARED')
    // pre-M56 row: chequeStatus null + mode cheque → the stamp ends the journey honestly
    await db.payment.update({ where: { voucherNo: outChq }, data: { chequeStatus: null } })
    const preM56 = await planChequeClear({ voucherNo: outChq })
    expect(preM56.ok).toBe(true)
    expect(preM56.sideEffects!.some((s: string) => s.includes('Pre-M56 cheque row'))).toBe(true)
    await commit<any>(preM56)
    const row = await db.payment.findUnique({ where: { voucherNo: outChq } })
    expect(row?.chequeStatus).toBe('cleared')
  })

  // ───────── PDC-04 — the bounce door ─────────

  it('PDC-04: the bounce door — contra + allocation reversal + statuses + the stamp, one tx', async () => {
    const plan = await planChequeBounce({ voucherNo: overRcp, reason: 'insufficient funds' })
    expect(plan.ok).toBe(true)
    expect(plan.text).toContain('Proposed BOUNCE of cheque CHQ-M56-79')
    expect(plan.summary).toContain('CHEQUE BOUNCED')
    const contra = plan.creates!.find((c: any) => c.table === 'journal')
    expect(contra.data.voucherNo).toBe(`CN-${overRcp}`)
    expect(contra.data.narration).toBe(`Contra: cheque BOUNCED ${overRcp} — insufficient funds`)
    const payUpdate = plan.updates!.find((u: any) => u.table === 'payment')!
    expect(payUpdate.data.status).toBe('cancelled')
    expect(payUpdate.data.chequeStatus).toBe('bounced')
    const res = await commit<any>(plan)
    expect(res.contra).toBe(`CN-${overRcp}`)
    expect(res.chequeStatus).toBe('bounced')

    const row = await db.payment.findUnique({ where: { voucherNo: overRcp } })
    expect(row?.status).toBe('cancelled')
    expect(row?.chequeStatus).toBe('bounced')

    // the companion stays; the contra mirrors its legs (swapped)
    const jv = await db.journal.findUnique({ where: { voucherNo: `JV-${overRcp}` } })
    const cn = await db.journal.findUnique({ where: { voucherNo: `CN-${overRcp}` } })
    expect(jv).not.toBeNull()
    expect(cn?.debitAccount).toBe(jv?.creditAccount)
    expect(cn?.creditAccount).toBe(jv?.debitAccount)
    expect(cn?.debitAccountId).toBe(jv?.creditAccountId)
    expect(cn?.creditAccountId).toBe(jv?.debitAccountId)

    // allocations reversed + the invoice re-derives
    const allocs = await db.paymentAllocation.findMany({ where: { paymentId: row!.id } })
    expect(allocs.length).toBe(1)
    expect(allocs[0].reversedAt).not.toBeNull()
    const inv = await db.salesInvoice.findUnique({ where: { id: invId } })
    expect(inv?.status).toBe('issued') // re-opened — the money never arrived

    // the register loses the row
    const q = await queryPdc({ limit: 100, page: 1 })
    expect(q.rows.some((r: any) => r.voucherNo === overRcp)).toBe(false)
  })

  it('PDC-04: bounce refusals — cleared cheque, bounced-again, non-cheque, unknown', async () => {
    const cleared = await planChequeBounce({ voucherNo: plainRcp })
    expect(cleared.ok).toBe(false)
    expect(cleared.error).toContain('was CLEARED')
    const bounced = await planChequeBounce({ voucherNo: overRcp })
    expect(bounced.ok).toBe(false)
    expect(bounced.error).toContain('already BOUNCED')
    const nonCheque = await planChequeBounce({ voucherNo: bankPmt })
    expect(nonCheque.ok).toBe(false)
    expect(nonCheque.error).toContain("mode 'bank'")
    const unknown = await planChequeBounce({ voucherNo: 'PMT-999999' })
    expect(unknown.ok).toBe(false)
    expect(unknown.error).toContain('not found')
  })

  it('PDC-04: the plain cancel path stays byte-identical (no chequeStatus leak)', async () => {
    // outChq is now CLEARED — bounce/clear refuse; use cancel_payment directly:
    // its plan must read exactly like the pre-M56 M40 door.
    const plan = await planCancelPayment({ voucherNo: outChq, reason: 'test cancel' })
    expect(plan.ok).toBe(true)
    expect(plan.text).toBe(`Proposed cancellation of payment ${outChq} (₹400) — contra CN-${outChq} mirrors the legs.`)
    expect(plan.text).not.toContain('BOUNCE')
    expect(plan.summary).toBe(`Cancel payment ${outChq} | M56 Supplier ${TS} | ₹400 payment | no allocations (pure on-account)`)
    const contra = plan.creates!.find((c: any) => c.table === 'journal')
    expect(contra.data.narration).toBe(`Contra: cancel ${outChq} — test cancel`)
    const payUpdate = plan.updates!.find((u: any) => u.table === 'payment')!
    expect(payUpdate.data.status).toBe('cancelled')
    expect('chequeStatus' in payUpdate.data).toBe(false) // the plain path NEVER stamps
    expect(plan.sideEffects!.some((s: string) => s.includes('stamped BOUNCED'))).toBe(false)
  })

  // ───────── PDC-06 — remit-to from the master ─────────

  it('PDC-06: the active BankAccount master WINS the print remit-to; AppOptions stay the fallback', async () => {
    await db.appOption.createMany({
      data: [
        { key: `print.companyName`, value: 'M56 FiberOps Test', group: 'print', label: 'Company' },
        { key: `print.bankName`, value: 'M56 Old Static Bank', group: 'print', label: 'Bank' },
      ],
    })
    // no master rows yet → AppOptions fallback
    const fallback = await getPrintHeader()
    expect(fallback?.companyName).toBe('M56 FiberOps Test')
    expect(fallback?.bankName).toBe('M56 Old Static Bank')

    // an active master row wins — ALONE, never mixed with the static options
    const bank = await db.bank.create({ data: { name: `M56 Bank ${TS}`, code: `M56BANK${TS}` } })
    await db.bankAccount.create({
      data: { accountNo: 'M56-ACC-1', bankId: bank.id, branch: 'MG Road', ifsc: 'M56I00001', active: true },
    })
    const master = await getPrintHeader()
    expect(master?.bankName).toBe(`M56 Bank ${TS}`)
    expect(master?.bankAcNo).toBe('M56-ACC-1')
    expect(master?.bankBranch).toBe('MG Road')
    expect(master?.bankIfsc).toBe('M56I00001')
    expect(master?.upi).toBeUndefined() // the master's OWN fields only — never mixed

    // deactivating the row returns the AppOptions fallback
    await db.bankAccount.updateMany({ where: { accountNo: 'M56-ACC-1' }, data: { active: false } })
    const back = await getPrintHeader()
    expect(back?.bankName).toBe('M56 Old Static Bank')
    await db.bankAccount.deleteMany({ where: { accountNo: 'M56-ACC-1' } })
    await db.bank.deleteMany({ where: { id: bank.id } })
  })

  // ───────── PDC-07 — wiring + mirrors ─────────

  it('PDC-07: the agent doors + read tool are registered (accounting domain)', async () => {
    const clear = getTool('post_cheque_clear')
    expect(clear).toBeDefined()
    expect(clear?.isWrite).toBe(true)
    expect(clear?.domain).toBe('accounting')
    const bounce = getTool('post_cheque_bounce')
    expect(bounce?.isWrite).toBe(true)
    expect(bounce?.domain).toBe('accounting')
    const read = getTool('get_pdc_register')
    expect(read?.isWrite).toBe(false)
    expect(read?.domain).toBe('accounting')
    // the read tool delegates to the same service as the screen
    const out = await read!.execute({ direction: 'in' })
    expect(out.text).toContain('in the field')
    expect(Array.isArray(out.json)).toBe(true)
  })

  it('PDC-07: register config + service + menu + route + schemas + prompt wired', async () => {
    expect(REGISTER_SERVICES['pdc']).toBe(queryPdc)
    const cfg = getRegisterConfig('pdc')
    expect(cfg?.slug).toBe('pdc')
    expect(cfg?.columns.map((c: any) => c.name)).toEqual(['voucherNo', 'direction', 'party', 'amount', 'reference', 'chequeDate', 'type', 'due'])
    expect(cfg?.agentTools).toContain('get_pdc_register')
    const item = MENU_ITEMS.find((m) => m.id === 'pdc-register')
    expect(item?.route).toBe('/accounts/pdc')
    expect(item?.phase).toBe('M56')
    expect(LIVE_ROUTES.has('/accounts/pdc')).toBe(true)
    // the page exists
    expect(readFileSync(join(APP_DIR, 'pdc/page.tsx'), 'utf8')).toContain("getRegisterConfig('pdc')")
    // the schemas
    expect(PAYMENT_SCHEMA.shape.chequeDate).toBeDefined()
    expect(CHEQUE_CLEAR_SCHEMA.shape.clearedOn).toBeDefined()
    expect(CHEQUE_BOUNCE_SCHEMA.shape.reason).toBeDefined()
    // the prompt + version
    expect(PROMPT_VERSION).toBe('m56-2026-09-08')
    expect(src(AGENT_DIR, 'prompt.ts')).toContain('post_cheque_bounce')
    // source mirrors — the lifecycle doctrine is commented where it lives
    expect(src(ERP_DIR, 'posting/payment.ts')).toContain('chequeStatus')
    expect(src(ERP_DIR, 'posting/cheque.ts')).toContain('buildPaymentCancelPlan')
    expect(src(ERP_DIR, 'posting/cancel.ts')).toContain('chequeBounce')
    expect(src(ERP_DIR, 'registers/pdc.ts')).toContain('chequeStatus: ')
    expect(src(ERP_DIR, 'reports/report-csv.ts')).toContain('PDC-06')
    expect(src(ERP_DIR, 'doc-configs/payment.ts')).toContain('chequeDate')
  })
})
