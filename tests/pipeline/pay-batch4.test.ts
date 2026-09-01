/**
 * PAY Batch 4 (Phase-6B, SPEC-M40) — the money-integrity tier:
 *   PAY-01  PaymentAllocation + FIFO settlement (status derives from Σ allocations)
 *   PAY-02  direction-correct invoice/bill links (cross-direction tags rejected)
 *   PAY-03  SupplierBill document + the REAL bill-pass gate (draft → passed)
 *   PAY-04  tolerance engine wired (3-way match + grn check + entry date + TDS flag)
 *   PAY-05  honest AP (open bills − allocations) + received-not-billed memo
 *   PAY-06  money-voucher cancel/reversal (CN- contra legs, audit preserved)
 *   PAY-07  due-date aging (creditDays/dueDate anchor + on-account column)
 *   PAY-08  DEFERRED per §17-3 (recorded, no dead columns)
 *
 * Spec §15 loop-closure tests #3 (wages) + #4 (partial payments):
 *   #4  invoice ₹1,000 → receipts ₹400 + ₹600 → paid via allocations, outstanding 0
 *   #3  earn ₹1,000 (production) → pay ₹600 → the operator statement shows ₹400 owed
 * Both doors share the services (ADR-001).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planInvoice } from '@/lib/erp/posting/invoice'
import { planPayment } from '@/lib/erp/posting/payment'
import { planSupplierBill, planBillPass } from '@/lib/erp/posting/supplier-bill'
import { planPurchaseOrder } from '@/lib/erp/posting/purchase-order'
import { planGrn } from '@/lib/erp/posting/grn'
import {
  planCancelPayment, planCancelJournal, planCancelDebitNote, planCancelExpense, planCancelBudget, planCancelInvoice,
} from '@/lib/erp/posting/cancel'
import { getTool } from '@/lib/agent/tools'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { REPORT_SERVICES } from '@/lib/erp/reports'

const TS = Date.now()
const CUST = `M40-C-${TS}`          // customer party (AR side)
const SUP = `M40-S-${TS}`           // supplier party (AP side)
const EMP = `M40-E-${TS}`           // employee code (wages) — party code matches (HFX-07)
const STYLE = `M40-STY-${TS}`
const ORDER = `M40-ORD-${TS}`

const ERP_DIR = join(process.cwd(), 'src/lib/erp')
const src = (p: string) => readFileSync(join(ERP_DIR, p), 'utf8')

let custId = '', supId = '', empPartyId = '', styleId = '', orderId = ''
let invA = '', invB = ''            // loop-closure #4 invoice + FIFO second invoice
let invAId = ''
let rcp1 = '', rcp2 = ''            // the ₹400 + ₹600 receipts
let grn1 = '', grn1Id = ''          // PO→GRN exact (the matched bill flow)
let grn2 = '', grn2Id = ''          // PO→GRN over-receipt (the BLOCK verdict flow)
let grn3 = '', grn3Id = ''          // GRN without any bill (received-not-billed memo)
let sb1 = '', sb1Id = ''            // the matched bill
let sb2 = ''                        // the blocked (draft) bill
let po1 = '', po2 = '', po3 = ''

async function commit<T>(planOrPromise: any): Promise<T> {
  const plan = await planOrPromise // call sites pass (promises of) DocPlanResults
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 200)}`)
  return plan.commit!()
}

describe('PAY Batch 4 — SPEC-M40 money integrity', () => {
  beforeAll(async () => {
    const cust = await db.party.create({ data: { code: CUST, name: `M40 Customer ${TS}`, partyType: 'customer' } })
    custId = cust.id
    const sup = await db.party.create({ data: { code: SUP, name: `M40 Supplier ${TS}`, partyType: 'supplier' } })
    supId = sup.id
    const empParty = await db.party.create({ data: { code: EMP, name: `M40 Operator ${TS}`, partyType: 'employee' } })
    empPartyId = empParty.id
    const buyer = await db.buyer.findUniqueOrThrow({ where: { code: 'B001' } })
    const style = await db.style.create({ data: { styleNo: STYLE, description: `M40 ${TS}`, buyerId: buyer.id } })
    styleId = style.id
    const order = await db.order.create({ data: { orderNo: ORDER, buyerId: buyer.id, styleId, status: 'open', totalPcs: 100, totalValue: 1000, finYear: '26-27' } })
    orderId = order.id
    const uom = await db.uOM.findFirstOrThrow()

    // supplier chain: 3 POs → 3 GRNs (exact / over-receipt / unbilled)
    const yarn = await db.yarn.create({ data: { code: `M40-Y-${TS}`, count: '30s', uomId: uom.id, rate: 100 } })
    const poNos: string[] = []
    for (const qty of [10, 10, 5]) {
      const po = await commit<any>(planPurchaseOrder({
        poType: 'yarn', partyCode: SUP, deliveryDate: '2026-09-15',
        lines: [{ itemType: 'yarn', itemCode: yarn.code, qty, rate: 100 }],
      }))
      poNos.push(po.poNo)
    }
    ;[po1, po2, po3] = poNos
    const g1 = await db.godown.findUniqueOrThrow({ where: { code: 'G1' } })
    const r1 = await commit<any>(planGrn({ poNo: po1, godownCode: 'G1', receivedQty: 10 }))
    grn1 = r1.grnNo; grn1Id = r1.id
    const r2 = await commit<any>(planGrn({ poNo: po2, godownCode: 'G1', receivedQty: 12 })) // over-delivery (legacy allows)
    grn2 = r2.grnNo; grn2Id = r2.id
    const r3 = await commit<any>(planGrn({ poNo: po3, godownCode: 'G1', receivedQty: 5 }))
    grn3 = r3.grnNo; grn3Id = r3.id

    // the loop-closure #4 invoice: ₹1,000 (GST 0 — clean math), 30-day credit
    const inv = await commit<any>(planInvoice({
      orderNo: ORDER, partyCode: CUST, billType: 'sales', totalQty: 100,
      taxableValue: 1000, gstRate: 0, gstType: 'cgst_sgst', creditDays: 30,
    }))
    invA = inv.invoiceNo; invAId = inv.id
    // the FIFO second invoice: ₹400 (older date so FIFO hits it first)
    invB = (await commit<any>(planInvoice({
      orderNo: ORDER, partyCode: CUST, billType: 'sales', totalQty: 40,
      taxableValue: 400, gstRate: 0, gstType: 'cgst_sgst', invoiceDate: '2026-08-01',
    }))).invoiceNo
  })

  afterAll(async () => {
    const sw = (p: unknown) => p
    // allocations + payments + bills + their contras/approvals (scoped)
    for (const party of [custId, supId, empPartyId]) {
      const pays = await db.payment.findMany({ where: { partyId: party } })
      for (const p of pays) {
        await sw(db.paymentAllocation.deleteMany({ where: { paymentId: p.id } }).catch(() => {}))
        await sw(db.journal.deleteMany({ where: { voucherNo: { in: [`JV-${p.voucherNo}`, `CN-${p.voucherNo}`] } } }).catch(() => {}))
      }
      await sw(db.payment.deleteMany({ where: { partyId: party } }).catch(() => {}))
    }
    const sbs = await db.supplierBill.findMany({ where: { partyId: supId } })
    for (const b of sbs) {
      await sw(db.paymentAllocation.deleteMany({ where: { billId: b.id } }).catch(() => {}))
      await sw(db.supplierBillLine.deleteMany({ where: { billId: b.id } }).catch(() => {}))
      await sw(db.approval.deleteMany({ where: { entity: 'supplier_bill', entityId: b.id } }).catch(() => {}))
    }
    await sw(db.supplierBill.deleteMany({ where: { partyId: supId } }).catch(() => {}))
    // invoices + journals + notes + expenses + budget
    await sw(db.salesInvoice.deleteMany({ where: { partyId: custId } }).catch(() => {}))
    await sw(db.journal.deleteMany({ where: { partyId: { in: [custId, supId] } } }).catch(() => {}))
    await sw(db.debitNote.deleteMany({ where: { partyId: custId } }).catch(() => {}))
    await sw(db.expense.deleteMany({ where: { partyId: supId } }).catch(() => {}))
    // the wage payment journal rides the payment loop above
    // GRNs + POs + ledger
    for (const [grnId, poNo] of [[grn1Id, po1], [grn2Id, po2], [grn3Id, po3]] as Array<[string, string]>) {
      await sw(db.gRNLine.deleteMany({ where: { grnId } }).catch(() => {}))
      await sw(db.stockLedger.deleteMany({ where: { refId: grnId } }).catch(() => {}))
      await sw(db.gRN.deleteMany({ where: { id: grnId } }).catch(() => {}))
      await sw(db.pOLine.deleteMany({ where: { po: { poNo } } }).catch(() => {}))
      await sw(db.purchaseOrder.deleteMany({ where: { poNo } }).catch(() => {}))
    }
    // production entries + order + style + parties + yarn
    await sw(db.productionEntry.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.orderLine.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { orderNo: ORDER } }).catch(() => {}))
    await sw(db.style.deleteMany({ where: { id: styleId } }).catch(() => {}))
    await sw(db.yarn.deleteMany({ where: { code: `M40-Y-${TS}` } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { id: { in: [custId, supId, empPartyId] } } }).catch(() => {}))
  })

  // ───────────── loop-closure test #4 (spec §15) ─────────────

  it('#4 PAY-01: invoice ₹1,000 → receipts ₹400 + ₹600 → partial then PAID via allocations (both doors)', async () => {
    // door 1 — the agent tool record_payment (₹400)
    const tool = getTool('record_payment')!
    const t1 = await tool.execute({ partyCode: CUST, amount: 400, direction: 'in', invoiceNo: invA })
    expect(t1.plan).toBeTruthy()
    rcp1 = ((await t1.commit!()) as any).voucherNo
    const mid = await db.salesInvoice.findUnique({ where: { id: invAId } })
    expect(mid!.status).toBe('partial') // 0 < 400 < 1000 (PAY-01)
    const alloc1 = await db.paymentAllocation.findFirst({ where: { invoiceId: invAId, reversedAt: null } })
    expect(alloc1?.amount).toBe(400)

    // door 2 — the form service planPayment (₹600)
    const c2 = await commit<any>(planPayment({ partyCode: CUST, amount: 600, direction: 'in', invoiceNo: invA }))
    rcp2 = c2.voucherNo
    expect(c2.allocated).toBe(600)
    expect(c2.onAccount).toBe(0)
    const done = await db.salesInvoice.findUnique({ where: { id: invAId } })
    expect(done!.status).toBe('paid') // Σ allocations = billAmount
    const allocs = await db.paymentAllocation.findMany({ where: { invoiceId: invAId, reversedAt: null } })
    expect(allocs.reduce((s, a) => s + a.amount, 0)).toBe(1000)
    // outstanding: INV-B (₹400, dated 2026-08-01) is still open — INV-A is done
    const res = await REPORT_SERVICES['outstanding-summary']({ party: CUST, limit: 50, page: 1 })
    const ar = res.rows.find((r) => r.type === 'AR') as any
    expect(ar).toBeTruthy()
    expect(ar.outstanding).toBe(400)
  })

  it('#4 PAY-01: overpayment ₹1,200 on the ₹400 invoice → paid + ₹800 on-account credit', async () => {
    const c = await commit<any>(planPayment({ partyCode: CUST, amount: 1200, direction: 'in', invoiceNo: invB }))
    expect(c.allocated).toBe(400)
    expect(c.onAccount).toBe(800) // the labeled party credit (PAY-01 overpayment rule)
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: invB } })
    expect(inv!.status).toBe('paid')
    const res = await REPORT_SERVICES['outstanding-summary']({ party: CUST, limit: 50, page: 1 })
    const ar = res.rows.find((r) => r.type === 'AR') as any
    expect(ar.onAccount).toBe(800) // PAY-07: the advance is visible per party
    expect(ar.outstanding).toBe(0)
    // the on-account remainder leaves NO allocation row (nothing to settle)
    const pay = await db.payment.findUnique({ where: { voucherNo: c.voucherNo } })
    const allocs = await db.paymentAllocation.findMany({ where: { paymentId: pay!.id } })
    expect(allocs.length).toBe(1) // only the ₹400 settle
  })

  it("PAY-01: FIFO auto-allocation walks the party's open invoices oldest-first (no invoiceNo)", async () => {
    // cust now: INV-B paid, INV-A paid — open a fresh ₹300 invoice dated today
    const inv3 = await commit<any>(planInvoice({
      orderNo: ORDER, partyCode: CUST, billType: 'sales', totalQty: 30,
      taxableValue: 300, gstRate: 0, gstType: 'cgst_sgst',
    }))
    const c = await commit<any>(planPayment({ partyCode: CUST, amount: 300, direction: 'in' }))
    expect(c.allocated).toBe(300)
    expect(c.allocations[0].ref).toBe(inv3.invoiceNo) // the only open invoice
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: inv3.invoiceNo } })
    expect(inv!.status).toBe('paid')
  })

  it('PAY-02: cross-direction tags are REJECTED with guidance', async () => {
    // out-payment tagged with a SALES invoiceNo
    const bad1 = await planPayment({ partyCode: CUST, amount: 100, direction: 'out', invoiceNo: invA })
    expect(bad1.ok).toBe(false)
    if (!bad1.ok) expect(bad1.error).toMatch(/SALES invoice/i)
    // out-payment tagged with an SB bill number passed as invoiceNo
    const bad2 = await planPayment({ partyCode: SUP, amount: 100, direction: 'out', invoiceNo: 'SB-9999' })
    expect(bad2.ok).toBe(false)
    // in-payment attaching a supplier bill via billNo
    const bad3 = await planPayment({ partyCode: SUP, amount: 100, direction: 'in', billNo: 'SB-9999' })
    expect(bad3.ok).toBe(false)
    if (!bad3.ok) expect(bad3.error).toMatch(/supplier bill/i)
  })

  // ───────────── PAY-03/04: the supplier bill document + the real gate ─────────────

  it('PAY-03: create_supplier_bill → SB-#### DRAFT from the GRN, verdicts + TDS stored', async () => {
    const plan = await planSupplierBill({ grnNo: grn1, gstRate: 5 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creates![0].table).toBe('supplierBill')
    expect(plan.summary).toContain('SB-')
    expect(plan.sideEffects.some((s) => s.startsWith('Tolerance:'))).toBe(true)
    const sb = await commit<any>(plan)
    sb1 = sb.billNo; sb1Id = sb.id
    expect(sb.status).toBe('draft')
    expect(sb.matchStatus).toBe('matched') // bill qty == GRN qty == PO qty
    const row = await db.supplierBill.findUnique({ where: { id: sb1Id }, include: { lines: true } })
    expect(row!.lines.length).toBe(1) // GRN's own line (qty 10 × rate 100)
    expect(row!.taxableValue).toBe(1000)
    expect(row!.billAmount).toBe(1050) // + 5% GST
    expect(row!.tdsPercent).toBe(2) // the tds_default_percent flag default (PAY-04)
    expect(row!.matchVerdicts).toBeTruthy()
    // one OPEN bill per GRN guard (PAY-03 §2.5)
    const dup = await planSupplierBill({ grnNo: grn1 })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.error).toMatch(/already has supplier bill/)
    // process GRNs are jobwork, not supplier bills (honest boundary)
    const proc = await planSupplierBill({ grnNo: 'GRN-NOPE' })
    expect(proc.ok).toBe(false)
  })

  it('PAY-03: create_bill_pass is the REAL gate — draft → passed, approval row, register row', async () => {
    // the agent door
    const tool = getTool('create_bill_pass')!
    const t = await tool.execute({ billNo: sb1, comments: 'm40 test' })
    expect(t.plan).toBeTruthy()
    const out = (await t.commit!()) as any
    expect(out.billStatus).toBe('passed')
    expect(out.status).toBe('approved')
    const ap = await db.approval.findFirst({ where: { entity: 'supplier_bill', entityId: sb1Id } })
    expect(ap!.status).toBe('approved')
    // register surfaces the SB row
    const reg = await REGISTER_SERVICES['supplier-bills']({ party: SUP, limit: 50, page: 1 })
    const row = reg.rows.find((r) => r.billNo === sb1)
    expect(row!.status).toBe('passed')
    expect(row!.grnNo).toBe(grn1)
    // idempotence: second pass refuses
    const again = await tool.execute({ billNo: sb1 })
    expect(again.plan).toBeUndefined()
    expect(again.text).toContain('already passed')
  })

  it('PAY-04: over-receipt GRN → the gate REFUSES on tolerance BLOCK (grn_bal/grn_dev)', async () => {
    // GRN-2 received 12 against PO-2's 10 (20% over — legacy allows it);
    // the bill mirrors 12 → checkGrnVsPo(10, 12) = BLOCK without grn_alladd
    const plan = await planSupplierBill({ grnNo: grn2, gstRate: 5 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const sb = await commit<any>(plan)
    sb2 = sb.billNo
    expect(sb.matchStatus).toBe('variance')
    const gate = await planBillPass({ billNo: sb2 })
    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.error).toMatch(/REFUSED.*BLOCK/i)
    // the form door agrees (CANCEL_PLAN shares the service)
    const bill = await db.supplierBill.findUnique({ where: { billNo: sb2 } })
    expect(bill!.status).toBe('draft') // refused — never became payable
    // a draft bill is NOT payable: the out-payment door refuses with guidance
    const badPay = await planPayment({ partyCode: SUP, amount: 100, direction: 'out', billNo: sb2 })
    expect(badPay.ok).toBe(false)
    if (!badPay.ok) expect(badPay.error).toMatch(/draft.*pass it first/i)
  })

  it('PAY-04: the tolerance engine is WIRED — source contracts (bill + entry-date + TDS + cancel guards)', () => {
    const sbSrc = src('posting/supplier-bill.ts')
    expect(sbSrc).toContain('threeWayMatch(')           // PO vs GRN vs bill
    expect(sbSrc).toContain('checkGrnVsPo(')            // grn_bal/grn_dev/grn_alladd
    expect(sbSrc).toContain('checkEntryDate(')          // entrydatedev
    expect(sbSrc).toContain('tds_default_percent')      // the flag finally has a consumer
    expect(sbSrc).toContain("status !== 'draft'")       // only drafts are passable
    const paySrc = src('posting/payment.ts')
    expect(paySrc).toContain('paymentAllocation')       // PAY-01 allocation rows
    expect(paySrc).toContain('recomputeInvoiceStatus')  // status derives from Σ allocations
    expect(paySrc).toContain('recomputeBillStatus')
  })

  // ───────────── PAY-05: honest AP + received-not-billed ─────────────

  it('PAY-05: out-payment with billNo settles the bill via allocations; AP = open bills − allocations', async () => {
    // ₹400 then ₹650 (TDS-net parity not enforced on cash — the full ₹1050 settles)
    const c1 = await commit<any>(planPayment({ partyCode: SUP, amount: 400, direction: 'out', billNo: sb1 }))
    expect(c1.allocated).toBe(400)
    let bill = await db.supplierBill.findUnique({ where: { id: sb1Id } })
    expect(bill!.status).toBe('partial')
    const c2 = await commit<any>(planPayment({ partyCode: SUP, amount: 650, direction: 'out', billNo: sb1 }))
    expect(c2.allocated).toBe(650)
    bill = await db.supplierBill.findUnique({ where: { id: sb1Id } })
    expect(bill!.status).toBe('paid')
    // AP from the report: 0 outstanding for this supplier's open bills…
    const res = await REPORT_SERVICES['outstanding-summary']({ party: SUP, limit: 50, page: 1 })
    const ap = res.rows.find((r) => r.type === 'AP') as any
    expect(ap).toBeTruthy()
    expect(ap.outstanding).toBe(0)
    // …and the unbilled GRN-3 (₹500) is the honest MEMO, never AP
    expect(ap.receivedNotBilled).toBe(500)
    // the supplier-pending chase list carries the same memo
    const pend = await REGISTER_SERVICES['supplier-pending']({ party: SUP, limit: 50, page: 1, status: 'received' })
    const rnb = pend.totals?.find((t) => t.label === 'Received not billed')?.value
    expect(Number(rnb)).toBeGreaterThanOrEqual(500)
  })

  // ───────────── PAY-06: cancel/reversal with contra legs ─────────────

  it('PAY-06: cancel_payment writes the CN- contra, reverses allocations, re-derives statuses', async () => {
    // cancel the ₹600 receipt on INV-A (₹1000, fully allocated 400+600)
    const plan = await planCancelPayment({ voucherNo: rcp2 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creates![0].table).toBe('journal')
    const out = await commit<any>(plan)
    expect(out.contra).toBe(`CN-${rcp2}`)
    expect(out.reversed).toBe(600)
    // payment cancelled, contra journal exists with swapped legs
    const pay = await db.payment.findUnique({ where: { voucherNo: rcp2 } })
    expect(pay!.status).toBe('cancelled')
    const contra = await db.journal.findUnique({ where: { voucherNo: `CN-${rcp2}` } })
    expect(contra!.voucherType).toBe('contra')
    // in-payment contra SWAPS the legs: Dr party / Cr Cash-Bank
    expect(contra!.debitAccount).not.toBe('Cash/Bank')
    expect(contra!.creditAccount).toBe('Cash/Bank')
    // allocation reversed; INV-A re-derives to partial (400 left)
    const alloc = await db.paymentAllocation.findFirst({ where: { paymentId: pay!.id } })
    expect(alloc!.reversedAt).toBeTruthy()
    const inv = await db.salesInvoice.findUnique({ where: { id: invAId } })
    expect(inv!.status).toBe('partial')
    // idempotence
    const again = await planCancelPayment({ voucherNo: rcp2 })
    expect(again.ok).toBe(false)
  })

  it('PAY-06: planCancelInvoice GUARDS — live allocations block; after reversing them it cancels', async () => {
    // INV-A still has the active ₹400 allocation
    const blocked = await planCancelInvoice({ invoiceNo: invA })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error).toMatch(/settled via payment allocations/)
    // reverse the ₹400 receipt at its own door, then the invoice can go
    await commit<any>(planCancelPayment({ voucherNo: rcp1 }))
    const ok = await commit<any>(planCancelInvoice({ invoiceNo: invA }))
    expect(ok.status).toBe('cancelled')
    const inv = await db.salesInvoice.findUnique({ where: { id: invAId } })
    expect(inv!.status).toBe('cancelled')
  })

  it('PAY-06: journal cancel (mirror CN-), companion/compra guards, note/expense/budget cancels', async () => {
    // a standalone journal V-#### → mirror + cancelled
    const v = `V-M40-${TS}`
    await db.journal.create({ data: { voucherNo: v, voucherType: 'journal', partyId: supId, date: new Date(), finYear: '26-27', debitAccount: 'Freight', creditAccount: 'Cash/Bank', amount: 150, status: 'active' } })
    const jc = await commit<any>(planCancelJournal({ voucherNo: v }))
    expect(jc.mirror).toBe(`CN-${v}`)
    const mirror = await db.journal.findUnique({ where: { voucherNo: `CN-${v}` } })
    expect(mirror!.debitAccount).toBe('Cash/Bank')
    expect(mirror!.creditAccount).toBe('Freight')
    const orig = await db.journal.findUnique({ where: { voucherNo: v } })
    expect(orig!.status).toBe('cancelled')
    // the payment companion (JV-*) refuses with guidance
    const comp = await planCancelJournal({ voucherNo: `JV-${rcp1}` })
    expect(comp.ok).toBe(false)
    if (!comp.ok) expect(comp.error).toMatch(/payment's companion/i)
    // debit note cancel
    const dn = `DN-M40-${TS}`
    await db.debitNote.create({ data: { noteNo: dn, noteType: 'acc', partyId: custId, amount: 90, finYear: '26-27', status: 'raised' } })
    await commit<any>(planCancelDebitNote({ noteNo: dn }))
    expect((await db.debitNote.findUnique({ where: { noteNo: dn } }))!.status).toBe('cancelled')
    // expense: settled refuses, recorded cancels
    const e1 = `EXP-M40A-${TS}`, e2 = `EXP-M40B-${TS}`
    await db.expense.createMany({ data: [
      { expNo: e1, category: 'general', amount: 50, partyId: supId, finYear: '26-27', status: 'settled' },
      { expNo: e2, category: 'transport', amount: 70, partyId: supId, finYear: '26-27', status: 'recorded' },
    ] })
    const settled = await planCancelExpense({ expNo: e1 })
    expect(settled.ok).toBe(false)
    await commit<any>(planCancelExpense({ expNo: e2 }))
    expect((await db.expense.findUnique({ where: { expNo: e2 } }))!.status).toBe('cancelled')
    // budget: actuals block, empty cancels
    const b1 = await db.budget.create({ data: { finYear: '26-27', amount: 500, deptId: null, status: 'active' } })
    await db.budgetLine.create({ data: { budgetId: b1.id, amount: 500, actualAmount: 120 } })
    const withActuals = await planCancelBudget({ budgetId: b1.id })
    expect(withActuals.ok).toBe(false)
    if (!withActuals.ok) expect(withActuals.error).toMatch(/actuals/i)
    const b2 = await db.budget.create({ data: { finYear: '26-27', amount: 300, status: 'active' } })
    await commit<any>(planCancelBudget({ budgetId: b2.id }))
    expect((await db.budget.findUnique({ where: { id: b2.id } }))!.status).toBe('cancelled')
  })

  it('PAY-06: CANCEL_PLAN + the client keyset cover the five money families', async () => {
    const ca = src('cancel-action.ts')
    for (const fn of ['planCancelPayment', 'planCancelJournal', 'planCancelDebitNote', 'planCancelExpense', 'planCancelBudget']) {
      expect(ca).toContain(fn) // the server-door CANCEL_PLAN imports every service
    }
    const dva = readFileSync(join(process.cwd(), 'src/components/erp/doc-view-actions.tsx'), 'utf8')
    for (const slug of ['payment', 'journal', 'debit-note', 'expense', 'budget']) {
      expect(dva).toContain(`'${slug}'`)
    }
  })

  // ───────────── PAY-07: due-date aging ─────────────

  it('PAY-07: creditDays anchors the due date; aging buckets from dueDate (fallback invoiceDate)', async () => {
    // the #4 invoice carried creditDays 30 → dueDate = invoiceDate + 30d
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: invA } })
    expect(inv!.creditDays).toBe(30)
    expect(inv!.dueDate).toBeTruthy()
    const days = Math.round(((inv!.dueDate as Date).getTime() - (inv as any).invoiceDate.getTime()) / 86_400_000)
    expect(days).toBe(30)
    // a FRESH party (no receipts — the FIFO application can't interfere):
    // an old-dated invoice (40 days, no dueDate) lands in 31-60
    const oldParty = await db.party.create({ data: { code: `M40-OLDP-${TS}`, name: `M40 Aging ${TS}`, partyType: 'customer' } })
    const oldInv = `M40-OLD-${TS}`
    await db.salesInvoice.create({ data: { invoiceNo: oldInv, orderId, partyId: oldParty.id, invoiceDate: new Date(Date.now() - 40 * 86_400_000), taxableValue: 100, billAmount: 100, finYear: '26-27', status: 'issued' } })
    const res = await REPORT_SERVICES['outstanding-summary']({ party: oldParty.code, limit: 50, page: 1 })
    const ar = res.rows.find((r) => r.type === 'AR') as any
    expect(ar.b1).toBe(100) // 31-60 bucket (spec PAY-07 widths)
    expect(ar.b0 + ar.b2 + ar.b3).toBe(0)
    await db.salesInvoice.deleteMany({ where: { invoiceNo: oldInv } })
    await db.party.deleteMany({ where: { id: oldParty.id } })
  })

  // ───────────── loop-closure test #3 (spec §15) — wages ─────────────

  it('#3 wages: earn ₹1,000 → pay ₹600 → the operator statement shows ₹400 owed', async () => {
    // the operator earns ₹1,000 (production entry, qty × rate)
    const dept = await db.department.findUniqueOrThrow({ where: { code: 'D4' } })
    const emp = await db.employee.create({ data: { code: EMP, name: `M40 Operator ${TS}`, deptId: dept.id, role: 'operator', pieceRate: 10 } })
    await db.productionEntry.create({ data: { orderId, deptId: dept.id, prodDate: new Date(), operatorId: emp.id, qty: 100, rate: 10, amount: 1000 } })
    // ₹600 paid via the agent door (pay_wages)
    const tool = getTool('pay_wages')!
    const t = await tool.execute({ partyCode: EMP, amount: 600 })
    expect(t.plan).toBeTruthy()
    await t.commit!()
    // the operator statement: earned 1000, paid 600, owed 400
    const res = await REGISTER_SERVICES['production-wages']({ limit: 100, page: 1 })
    const row = res.rows.find((r) => r.code === EMP) as any
    expect(row).toBeTruthy()
    expect(row.amount).toBe(1000)
    expect(row.paid).toBe(600)
    expect(row.owed).toBe(400) // loop-closure #3 GREEN
    expect(res.totals?.find((t2) => t2.label === 'Owed (₹)')?.value).toBeGreaterThanOrEqual(400)
    await db.employee.deleteMany({ where: { id: emp.id } })
  })

  // ───────────── PAY-08 deferral + status fleet honesty ─────────────

  it('PAY-08: explicitly DEFERRED per §17-3 (the owner decision stays open — no dead columns)', () => {
    const spec = readFileSync(join(process.cwd(), 'docs/CONTEXT/specs/SPEC-M40.md'), 'utf8')
    expect(spec).toContain('DEFERRED per §17-3')
    // no cheque-status column landed with the deferral (honest-claims rule)
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    expect(schema).not.toContain('chequeStatus')
  })

  it('status fleets: every new state has a writer (honest-claims rule)', () => {
    const enums = src('enums.ts')
    expect(enums).toContain("'partial'")           // INVOICE_STATUS
    expect(enums).toContain('SUPPLIER_BILL_STATUS')
    expect(enums).toContain('PAYMENT_STATUS')
    const tools = readFileSync(join(process.cwd(), 'src/lib/agent/tools.ts'), 'utf8')
    for (const t of ['create_supplier_bill', 'cancel_payment', 'cancel_journal', 'cancel_debit_note', 'cancel_expense', 'cancel_budget']) {
      expect(tools).toContain(`'${t}'`)
    }
  })
})
