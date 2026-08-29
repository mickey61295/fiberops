/**
 * print-fidelity tests — SPEC-M18 §6: the three Wave-A print upgrades.
 * (1) fetchOrderPrint: SALES ORDER sheet with per-line HSN (style.hsn),
 *     FCY symbol + no rupee words for USD orders, INR words for INR;
 * (2) invoice body completion: with-order invoices print per-order-line rows
 *     with the HSN column + derived HSN summary note; orderless invoices keep
 *     the summary row;
 * (3) dc cost-bearing auto-template: totalValue>0 → COST BEARING title with
 *     values + words; totalValue=0 → NON-COST BEARING plain challan (no words).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { PRINT_DOCS } from '@/lib/erp/print'

const TS = Date.now()

let partyId = ''
let buyerId = ''
let styleId = ''
let styleNoHsnId = ''
let colourId = ''
let sizeId = ''
let orderId = ''
let orderUsdId = ''
let invWithOrderId = ''
let invBareId = ''
let dcCostId = ''
let dcPlainId = ''

const ORDER_NO = `SO-${TS}`
const ORDER_USD_NO = `SOU-${TS}`
const INV_WITH = `PINVW-${TS}`
const INV_BARE = `PINVB-${TS}`
const DC_COST = `PDCC-${TS}`
const DC_PLAIN = `PDCP-${TS}`

describe('M18 print fidelity (SPEC-M18 §6)', () => {
  beforeAll(async () => {
    const party = await db.party.create({
      data: { code: `M18PY-${TS}`, name: `M18 Party ${TS}`, city: 'Tirupur', gstin: '33AAAPL1234C1ZV', partyType: 'both' },
    })
    partyId = party.id
    const buyer = await db.buyer.create({ data: { code: `M18BY-${TS}`, name: `M18 Buyer ${TS}`, dept: 'Knits' } })
    buyerId = buyer.id
    const style = await db.style.create({ data: { styleNo: `M18ST-${TS}`, hsn: '610910' } })
    styleId = style.id
    const styleNoHsn = await db.style.create({ data: { styleNo: `M18STX-${TS}` } })
    styleNoHsnId = styleNoHsn.id
    const colour = await db.colour.create({ data: { code: `M18CL-${TS}`, name: `M18 Navy ${TS}` } })
    colourId = colour.id
    const size = await db.size.create({ data: { name: `M18SZ-${TS}` } })
    sizeId = size.id

    const mkLines = (rate: number) => [
      { styleId, colourId, sizeId, qty: 500, rate },
      { styleId: styleNoHsnId, colourId: null, sizeId: null, qty: 400, rate },
    ]
    const order = await db.order.create({
      data: {
        orderNo: ORDER_NO, buyerId, styleId, finYear: 'FY26', status: 'open',
        totalPcs: 900, totalValue: 315000,
        lines: { create: mkLines(350) },
      },
    })
    orderId = order.id
    const orderUsd = await db.order.create({
      data: {
        orderNo: ORDER_USD_NO, buyerId, styleId, finYear: 'FY26', status: 'open',
        totalPcs: 100, totalValue: 12000, currency: 'USD', fxRate: 83,
        lines: { create: [{ styleId, colourId: null, sizeId: null, qty: 100, rate: 120 }] },
      },
    })
    orderUsdId = orderUsd.id

    const invWith = await db.salesInvoice.create({
      data: {
        invoiceNo: INV_WITH, partyId, orderId, invoiceType: 'domestic', billType: 'sales',
        finYear: 'FY26', totalQty: 900, taxableValue: 315000,
        cgstRate: 2.5, sgstRate: 2.5, cgstAmt: 7875, sgstAmt: 7875,
        billAmount: 330750, status: 'issued',
      },
    })
    invWithOrderId = invWith.id
    const invBare = await db.salesInvoice.create({
      data: {
        invoiceNo: INV_BARE, partyId, invoiceType: 'domestic', billType: 'sales',
        finYear: 'FY26', totalQty: 100, taxableValue: 25000,
        igstRate: 5, igstAmt: 1250, billAmount: 26250, status: 'issued',
      },
    })
    invBareId = invBare.id

    const dcCost = await db.jobworkOrder.create({
      data: { dcNo: DC_COST, jobworkerId: partyId, processType: 'washing', totalQty: 900, totalValue: 18000, status: 'sent', orderId },
    })
    dcCostId = dcCost.id
    const dcPlain = await db.jobworkOrder.create({
      data: { dcNo: DC_PLAIN, jobworkerId: partyId, processType: 'dyeing', totalQty: 500, totalValue: 0, status: 'sent', orderId },
    })
    dcPlainId = dcPlain.id
  })

  afterAll(async () => {
    const sw = (e: unknown) => e as any
    await sw(db.orderLine.deleteMany({ where: { orderId: { in: [orderId, orderUsdId] } } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { id: { in: [invWithOrderId, invBareId] } } }).catch(() => {}))
    await sw(db.jobworkOrder.deleteMany({ where: { id: { in: [dcCostId, dcPlainId] } } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { id: { in: [orderId, orderUsdId] } } }).catch(() => {}))
    await sw(db.size.deleteMany({ where: { id: sizeId } }).catch(() => {}))
    await sw(db.colour.deleteMany({ where: { id: colourId } }).catch(() => {}))
    await sw(db.style.deleteMany({ where: { id: { in: [styleId, styleNoHsnId] } } }).catch(() => {}))
    await sw(db.buyer.deleteMany({ where: { id: buyerId } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { id: partyId } }).catch(() => {}))
  })

  // ── (1) order print ─────────────────────────────────────────────────────
  it('order: SALES ORDER with per-line HSN, buyer block and INR words', async () => {
    const doc = await PRINT_DOCS.order!(ORDER_NO)
    expect(doc).toBeTruthy()
    expect(doc!.title).toBe('SALES ORDER')
    expect(doc!.docNo).toBe(ORDER_NO)
    expect(doc!.party?.label).toBe('Buyer')
    expect(doc!.party?.name).toContain('M18 Buyer')
    expect(doc!.party?.address).toContain('Knits')
    expect(doc!.lines!.columns.map((c) => c.label)).toContain('HSN')
    const hsnCol = doc!.lines!.columns.findIndex((c) => c.label === 'HSN')
    expect(String(doc!.lines!.rows[0][hsnCol])).toBe('610910') // style.hsn
    expect(String(doc!.lines!.rows[1][hsnCol])).toBe('—')      // style without hsn
    expect(doc!.amountWords).toMatch(/Rupees/i)
    expect(doc!.signatures![1]).toBe('For Buyer')
  })

  it('order: USD order prints the $ symbol, fx note and NO rupee words', async () => {
    const doc = await PRINT_DOCS.order!(ORDER_USD_NO)
    expect(doc).toBeTruthy()
    expect(doc!.meta.some(([l, v]) => l === 'Currency' && v === 'USD')).toBe(true)
    expect(doc!.meta.some(([l, v]) => l === 'FX Rate' && v.includes('83'))).toBe(true)
    const flat = JSON.stringify(doc!.lines!.rows) + JSON.stringify(doc!.totals)
    expect(flat).toContain('$')
    expect(flat).not.toContain('₹')
    expect(doc!.amountWords).toBeUndefined() // words are rupees-only — never lie for FCY
  })

  it('order: resolves by db id too (the done-card F9 door)', async () => {
    const doc = await PRINT_DOCS.order!(orderId)
    expect(doc?.docNo).toBe(ORDER_NO)
  })

  // ── (2) invoice HSN body ────────────────────────────────────────────────
  it('invoice with order: per-line body with HSN column + derived HSN summary note', async () => {
    const doc = await PRINT_DOCS.invoice!(INV_WITH)
    expect(doc).toBeTruthy()
    expect(doc!.lines!.columns.map((c) => c.label)).toContain('HSN')
    expect(doc!.lines!.rows).toHaveLength(2) // the order's two lines
    const hsnCol = doc!.lines!.columns.findIndex((c) => c.label === 'HSN')
    expect(String(doc!.lines!.rows[0][hsnCol])).toBe('610910')
    const hsnNote = doc!.notes.find((n) => n.startsWith('HSN summary'))
    expect(hsnNote).toBeTruthy()
    expect(hsnNote).toContain('610910 — 500 pcs')
    expect(hsnNote).toContain('5%')
  })

  it('invoice without order: keeps the legacy summary row (no HSN column)', async () => {
    const doc = await PRINT_DOCS.invoice!(INV_BARE)
    expect(doc).toBeTruthy()
    expect(doc!.lines!.columns.map((c) => c.label)).not.toContain('HSN')
    expect(doc!.lines!.rows).toHaveLength(1)
    expect(String(doc!.lines!.rows[0][0])).toContain('sales invoice')
    expect(doc!.notes.find((n) => n.startsWith('HSN summary'))).toBeUndefined()
  })

  // ── (3) dc cost-bearing auto-template ───────────────────────────────────
  it('dc with value: COST BEARING — value columns + words', async () => {
    const doc = await PRINT_DOCS.dc!(DC_COST)
    expect(doc).toBeTruthy()
    expect(doc!.title).toContain('COST BEARING')
    expect(doc!.title).not.toContain('NON-COST')
    expect(doc!.lines!.columns.map((c) => c.label)).toContain('Value')
    expect(doc!.amountWords).toMatch(/Rupees/i)
    expect(doc!.notes[0]).toContain('COST BEARING')
  })

  it('dc with zero value: NON-COST BEARING plain challan — no values, no words', async () => {
    const doc = await PRINT_DOCS.dc!(DC_PLAIN)
    expect(doc).toBeTruthy()
    expect(doc!.title).toContain('NON-COST BEARING')
    expect(doc!.lines!.columns.map((c) => c.label)).not.toContain('Value')
    expect(doc!.amountWords).toBeUndefined()
    expect(JSON.stringify(doc!.lines)).not.toContain('₹')
  })
})
