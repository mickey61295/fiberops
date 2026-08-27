/**
 * print-docs tests — SPEC-M8 §6: registry completeness + the 5 Wave-A
 * fetchers against seeded fixtures (the doc-parity pattern: create rows,
 * assert the normalized PrintDoc shape, clean up).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { PRINT_DOCS, getPrintDocTypes } from '@/lib/erp/print'
import { amountInWords } from '@/lib/erp/print/amount-words'

const TS = Date.now()

let partyId = ''
let godownId = ''
let invId = ''
let poId = ''
let grnId = ''
let payId = ''
let dcId = ''

const INV_NO = `PINV-${TS}`
const PO_NO = `PPO-${TS}`
const GRN_NO = `PGRN-${TS}`
const PAY_NO = `PPAY-${TS}`
const DC_NO = `PDC-${TS}`

describe('M8 Wave A print docs (SPEC-M8 §6)', () => {
  beforeAll(async () => {
    const party = await db.party.create({
      data: { code: `PPY-${TS}`, name: `Print Party ${TS}`, city: 'Tirupur', gstin: '33AAAPL1234C1ZV', partyType: 'both' },
    })
    partyId = party.id
    const godown = await db.godown.findFirst()
    godownId = godown?.id ?? ''

    const inv = await db.salesInvoice.create({
      data: {
        invoiceNo: INV_NO, partyId, invoiceType: 'domestic', billType: 'sales',
        finYear: 'FY26', totalQty: 900, taxableValue: 225000,
        cgstRate: 2.5, sgstRate: 2.5, cgstAmt: 5625, sgstAmt: 5625,
        billAmount: 236250, status: 'issued',
      },
    })
    invId = inv.id

    const po = await db.purchaseOrder.create({
      data: {
        poNo: PO_NO, poType: 'yarn', partyId, status: 'open', finYear: 'FY26',
        lines: { create: [{ itemType: 'yarn', itemId: 'x', qty: 100, rate: 250, amount: 25000 }] },
      },
    })
    poId = po.id

    const grn = await db.gRN.create({
      data: {
        grnNo: GRN_NO, grnType: 'purchase', partyId, godownId, finYear: 'FY26',
        totalQty: 100, totalValue: 25000,
        lines: { create: [{ itemType: 'yarn', itemId: 'x', qty: 100, rate: 250, amount: 25000 }] },
      },
    })
    grnId = grn.id

    const pay = await db.payment.create({
      data: { voucherNo: PAY_NO, partyId, direction: 'out', mode: 'bank', reference: 'UTR-1', amount: 50000, finYear: 'FY26' },
    })
    payId = pay.id

    const dc = await db.jobworkOrder.create({
      data: { dcNo: DC_NO, jobworkerId: partyId, processType: 'washing', totalQty: 100, totalValue: 5000, status: 'sent' },
    })
    dcId = dc.id
  })

  afterAll(async () => {
    const sw = (e: unknown) => e as any
    // children first — no onDelete cascade in the reconstructed schema
    await sw(db.pOLine.deleteMany({ where: { poId } }).catch(() => {}))
    await sw(db.gRNLine.deleteMany({ where: { grnId } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { id: invId } }).catch(() => {}))
    await sw(db.purchaseOrder.deleteMany({ where: { id: poId } }).catch(() => {}))
    await sw(db.gRN.deleteMany({ where: { id: grnId } }).catch(() => {}))
    await sw(db.payment.deleteMany({ where: { id: payId } }).catch(() => {}))
    await sw(db.jobworkOrder.deleteMany({ where: { id: dcId } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { id: partyId } }).catch(() => {}))
  })

  it('registry has the 5 Wave-A docTypes', () => {
    expect(getPrintDocTypes().sort()).toEqual(['dc', 'grn', 'invoice', 'payment', 'po'])
    expect(Object.keys(PRINT_DOCS)).toHaveLength(5)
  })

  it('invoice: TAX INVOICE with the CGST+SGST split and words', async () => {
    const doc = await PRINT_DOCS.invoice(INV_NO)!
    expect(doc).toBeTruthy()
    expect(doc!.title).toBe('TAX INVOICE')
    expect(doc!.docNo).toBe(INV_NO)
    expect(doc!.party?.name).toContain('Print Party')
    expect(doc!.party?.gstin).toBe('33AAAPL1234C1ZV')
    expect(doc!.totals!.some(([l, v]) => l === 'CGST 2.5%' && v === '₹5,625')).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Bill Amount', '₹2,36,250'])
    expect(doc!.amountWords).toBe(amountInWords(236250))
    expect(doc!.amountWords).toContain('Two Lakhs Thirty Six Thousand')
  })

  it('invoice: IGST split when igstRate > 0', async () => {
    const ig = await db.salesInvoice.create({
      data: { invoiceNo: `PIG-${TS}`, partyId, finYear: 'FY26', taxableValue: 1000, igstRate: 5, igstAmt: 50, billAmount: 1050, status: 'issued' },
    })
    const doc = await PRINT_DOCS.invoice(`PIG-${TS}`)!
    expect(doc!.totals!.some(([l]) => l === 'IGST 5%')).toBe(true)
    expect(doc!.totals!.some(([l]) => l === 'CGST 0%')).toBe(false)
    await db.salesInvoice.delete({ where: { id: ig.id } }).catch(() => {})
  })

  it('po: lines resolved with S.No, qty, rate, amount; approx total', async () => {
    const doc = await PRINT_DOCS.po(PO_NO)!
    expect(doc!.title).toBe('PURCHASE ORDER')
    expect(doc!.party?.label).toBe('Supplier')
    expect(doc!.lines!.columns.map((c) => c.label)).toEqual(['S.No', 'Item', 'Type', 'Qty', 'Rate', 'Amount'])
    expect(doc!.lines!.rows[0][0]).toBe(1)
    expect(doc!.lines!.rows[0][3]).toBe('100')
    expect(doc!.totals!.at(-1)).toEqual(['Total (approx.)', '₹25,000'])
  })

  it('grn: godown + against-PO meta, line table, total value', async () => {
    const doc = await PRINT_DOCS.grn(GRN_NO)!
    expect(doc!.title).toBe('GOODS RECEIPT NOTE')
    expect(doc!.party?.label).toBe('Received From')
    expect(doc!.meta!.some(([l]) => l === 'Godown')).toBe(true)
    expect(doc!.lines!.rows).toHaveLength(1)
    expect(doc!.totals!.at(-1)).toEqual(['Total Value', '₹25,000'])
  })

  it('payment: direction picks the voucher title + mode/reference meta', async () => {
    const doc = await PRINT_DOCS.payment(PAY_NO)!
    expect(doc!.title).toBe('PAYMENT VOUCHER')
    expect(doc!.party?.label).toBe('Paid To')
    expect(doc!.meta!.some(([l, v]) => l === 'Mode' && v === 'BANK')).toBe(true)
    expect(doc!.meta!.some(([l, v]) => l === 'Reference' && v === 'UTR-1')).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Amount Paid', '₹50,000'])
  })

  it('payment: direction=in flips to RECEIPT VOUCHER / Received From', async () => {
    const rc = await db.payment.create({
      data: { voucherNo: `PRC-${TS}`, partyId, direction: 'in', mode: 'cash', amount: 1234, finYear: 'FY26' },
    })
    const doc = await PRINT_DOCS.payment(`PRC-${TS}`)!
    expect(doc!.title).toBe('RECEIPT VOUCHER')
    expect(doc!.party?.label).toBe('Received From')
    expect(doc!.totals!.at(-1)).toEqual(['Amount Received', '₹1,234'])
    await db.payment.delete({ where: { id: rc.id } }).catch(() => {})
  })

  it('dc: DELIVERY CHALLAN with process + parent order meta', async () => {
    const doc = await PRINT_DOCS.dc(DC_NO)!
    expect(doc!.title).toBe('DELIVERY CHALLAN (JOBWORK)')
    expect(doc!.party?.label).toBe('Jobworker')
    expect(doc!.meta!.some(([l, v]) => l === 'Process' && v === 'washing')).toBe(true)
    expect(doc!.lines!.footer![0]).toBe('Total Qty: 100')
  })

  it('id resolution also works (db id, not doc no)', async () => {
    const doc = await PRINT_DOCS.invoice(invId)!
    expect(doc!.docNo).toBe(INV_NO)
  })

  it('unknown id/doc-no → null (route 404s)', async () => {
    expect(await PRINT_DOCS.invoice('NOPE-404')).toBeNull()
    expect(await PRINT_DOCS.po('NOPE-404')).toBeNull()
    expect(await PRINT_DOCS.grn('NOPE-404')).toBeNull()
    expect(await PRINT_DOCS.payment('NOPE-404')).toBeNull()
    expect(await PRINT_DOCS.dc('NOPE-404')).toBeNull()
  })
})
