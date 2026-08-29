/**
 * SPEC-M19 §4 Wave D — closing-stock as-of + counter-book grouping + Tally
 * adapter. TS-tagged fixtures, children-first cleanup (PITFALLS #40),
 * future-dated + huge quantities (PITFALLS #41 — the dev seed must never
 * interfere).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { queryClosingStock } from '../../src/lib/erp/registers/closing-stock'
import { groupCounterBook, counterBookColumns } from '../../src/lib/erp/registers/counter-book'
import { buildTallyExport } from '../../src/lib/erp/registers/tally'
import { getRegisterConfig } from '../../src/lib/erp/register-configs'

const TS = Date.now()
const GODOWN = `RGT19D-G-${TS}`
const YARN_CODE = `RGT19D-Y-${TS}`
const PARTY = `RGT19D-P-${TS}`
const BUYER = `RGT19D-B-${TS}`

// ledger fixture: yarn 100 kgs in @10 (2026-12-01), 30 out (12-02), 50 in @12 (12-03),
// and a row AFTER the as-of date (12-10, 999 kgs @99) that must be excluded.
const IN1 = 100, OUT1 = 30, IN2 = 50
const AS_OF = '2026-12-05'

let godownId = '', yarnId = '', partyId = '', buyerId = ''

describe('SPEC-M19 §4-D1 — queryClosingStock (cumulative as-of)', () => {
  beforeAll(async () => {
    const g = await db.godown.create({ data: { code: GODOWN, name: `RGT19D GD ${TS}` } })
    godownId = g.id
    const y = await db.yarn.create({ data: { code: YARN_CODE, count: '30s', uomId: (await db.uOM.findFirst({ where: { code: 'KGS' } }))?.id ?? (await db.uOM.create({ data: { code: 'KGS', name: 'Kgs' } })).id } })
    yarnId = y.id
    await db.stockLedger.createMany({ data: [
      { txnType: 'opening', itemType: 'yarn', itemId: yarnId, godownId, docNo: `RGT19D-L1-${TS}`, docDate: new Date('2026-12-01'), finYear: 'FY26', inKgs: IN1, rate: 10 },
      { txnType: 'process_delivery', itemType: 'yarn', itemId: yarnId, godownId, docNo: `RGT19D-L2-${TS}`, docDate: new Date('2026-12-02'), finYear: 'FY26', outKgs: OUT1 },
      { txnType: 'purchase_grn', itemType: 'yarn', itemId: yarnId, godownId, docNo: `RGT19D-L3-${TS}`, docDate: new Date('2026-12-03'), finYear: 'FY26', inKgs: IN2, rate: 12 },
      { txnType: 'purchase_grn', itemType: 'yarn', itemId: yarnId, godownId, docNo: `RGT19D-L4-${TS}`, docDate: new Date('2026-12-10'), finYear: 'FY26', inKgs: 999, rate: 99 }, // AFTER as-of
    ]})
  })

  afterAll(async () => {
    await db.stockLedger.deleteMany({ where: { godownId } })
    await db.yarn.deleteMany({ where: { id: yarnId } })
    await db.godown.deleteMany({ where: { id: godownId } })
  })

  it('cumulative closing to the as-of date, per-uom, latest-rate valuation, post-cutoff rows excluded', async () => {
    const res = await queryClosingStock({ limit: 100, page: 1, to: new Date(AS_OF), godown: GODOWN })
    expect(res.rows).toHaveLength(1)
    const row = res.rows[0] as any
    expect(row.itemCode).toBe(YARN_CODE)
    expect(row.kgs).toBeCloseTo(IN1 - OUT1 + IN2, 6) // 120
    expect(row.mtrs).toBe(0)
    expect(row.pcs).toBe(0)
    expect(row.rate).toBe(12) // latest ledger rate within the window (12-03 row)
    expect(row.value).toBeCloseTo(120 * 12, 6)
    expect(row.href).toBeNull() // period-end row — no doc drill
  })

  it('no as-of date → everything cumulative (includes the 12-10 row)', async () => {
    const res = await queryClosingStock({ limit: 100, page: 1, godown: GODOWN })
    expect(res.rows).toHaveLength(1)
    expect((res.rows[0] as any).kgs).toBeCloseTo(IN1 - OUT1 + IN2 + 999, 6)
  })

  it('unknown godown → empty result, never a 500', async () => {
    const res = await queryClosingStock({ limit: 100, page: 1, godown: 'NOPE-404' })
    expect(res.rows).toEqual([])
    expect(res.summary).toContain('not found')
  })

  it('config registered: cumulative filters (to, no from), get_stock_ledger chip, menu item live', () => {
    const config = getRegisterConfig('closing-stock')!
    expect(config).toBeTruthy()
    expect(config.filters.map((f) => f.key)).toContain('to')
    expect(config.filters.map((f) => f.key)).not.toContain('from')
    expect(config.agentTools).toEqual(['get_stock_ledger'])
  })
})

describe('SPEC-M19 §4-D2 — counter-book grouping (pure function)', () => {
  const columns = [
    { name: 'docDate', label: 'Date', format: 'date' as const },
    { name: 'docNo', label: 'Doc No' },
    { name: 'inKgs', label: 'In kgs', align: 'right' as const, format: 'qty' as const },
    { name: 'outKgs', label: 'Out kgs', align: 'right' as const, format: 'qty' as const },
    { name: 'rate', label: 'Rate', align: 'right' as const, format: 'qty' as const },
  ]
  // DESC order (as the services return) — the counter book must flip to ASC
  const rows = [
    { id: '3', docDate: '2026-12-03', docNo: 'C', inKgs: 50, outKgs: 0, rate: 12 },
    { id: '2', docDate: '2026-12-02', docNo: 'B', inKgs: 0, outKgs: 30, rate: 0 },
    { id: '1', docDate: '2026-12-01', docNo: 'A', inKgs: 100, outKgs: 0, rate: 10 },
  ]

  it('subtotals numeric right-aligned columns but NOT rate; sections ascending', () => {
    expect(counterBookColumns(columns)).toEqual(['inKgs', 'outKgs']) // rate excluded by design
    const sections = groupCounterBook(rows, columns, 'docDate')
    expect(sections.map((s) => s.key)).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']) // ASC
    expect(sections[0].subtotal).toEqual({ inKgs: 100, outKgs: 0 })
    expect(sections[1].subtotal).toEqual({ inKgs: 0, outKgs: 30 })
    expect(sections[2].subtotal).toEqual({ inKgs: 50, outKgs: 0 })
  })

  it('balancePairs accumulate running in−out across ascending sections', () => {
    const sections = groupCounterBook(rows, columns, 'docDate', [
      { in: 'inKgs', out: 'outKgs', label: 'Net kgs' },
    ])
    expect(sections[0].running['Net kgs']).toBe(100)
    expect(sections[1].running['Net kgs']).toBe(70)
    expect(sections[2].running['Net kgs']).toBe(120)
  })

  it('both day-book configs declare counterBook; the flat configs do not', () => {
    expect(getRegisterConfig('stock-ledger')!.counterBook?.groupBy).toBe('docDate')
    expect(getRegisterConfig('daily-in-out')!.counterBook?.groupBy).toBe('docDate')
    expect(getRegisterConfig('yarn-stock')!.counterBook).toBeUndefined()
  })
})

describe('SPEC-M19 §4-D3 — Tally JSON adapter', () => {
  beforeAll(async () => {
    const p = await db.party.create({ data: { code: PARTY, name: `RGT19D Party ${TS}` } })
    partyId = p.id
    const b = await db.buyer.create({ data: { code: BUYER, name: `RGT19D Buyer ${TS}` } })
    buyerId = b.id
    await db.salesInvoice.create({
      data: { invoiceNo: `RGT19D-INV-${TS}`, partyId, invoiceDate: new Date('2026-12-02'), finYear: 'FY26', taxableValue: 1000, cgstRate: 2.5, sgstRate: 2.5, cgstAmt: 25, sgstAmt: 25, billAmount: 1050, status: 'issued' },
    })
    await db.payment.create({ data: { voucherNo: `RGT19D-RCP-${TS}`, partyId, direction: 'in', payDate: new Date('2026-12-03'), finYear: 'FY26', amount: 800, mode: 'bank', reference: 'UTR123' } })
    await db.payment.create({ data: { voucherNo: `RGT19D-PMT-${TS}`, partyId, direction: 'out', payDate: new Date('2026-12-03'), finYear: 'FY26', amount: 300, mode: 'cash' } })
    await db.journal.create({ data: { voucherNo: `RGT19D-JRN-${TS}`, partyId, voucherType: 'journal', date: new Date('2026-12-04'), finYear: 'FY26', debitAccount: 'Round Off', creditAccount: 'Sales', amount: 12, narration: 'rounding' } })
    await db.salesInvoice.create({
      data: { invoiceNo: `RGT19D-INVX-${TS}`, partyId, invoiceDate: new Date('2026-12-02'), finYear: 'FY26', taxableValue: 500, billAmount: 500, status: 'cancelled' }, // cancelled → excluded
    })
  })

  afterAll(async () => {
    await db.journal.deleteMany({ where: { voucherNo: `RGT19D-JRN-${TS}` } })
    await db.payment.deleteMany({ where: { voucherNo: { in: [`RGT19D-RCP-${TS}`, `RGT19D-PMT-${TS}`] } } })
    await db.salesInvoice.deleteMany({ where: { invoiceNo: { in: [`RGT19D-INV-${TS}`, `RGT19D-INVX-${TS}`] } } })
    await db.party.deleteMany({ where: { id: partyId } })
    await db.buyer.deleteMany({ where: { id: buyerId } })
  })

  it('shapes Sales/Receipt/Payment/Journal vouchers with ledger entries; cancelled excluded', async () => {
    const out = await buildTallyExport(new Date('2026-12-01'), new Date('2026-12-31'))
    const nos = out.vouchers.map((v) => v.voucherNo)
    expect(nos).toContain(`RGT19D-INV-${TS}`)
    expect(nos).toContain(`RGT19D-RCP-${TS}`)
    expect(nos).toContain(`RGT19D-PMT-${TS}`)
    expect(nos).toContain(`RGT19D-JRN-${TS}`)
    expect(nos).not.toContain(`RGT19D-INVX-${TS}`) // cancelled
    expect(out.counts).toEqual({ sales: 1, receipts: 1, payments: 1, journals: 1 })

    const inv = out.vouchers.find((v) => v.voucherNo === `RGT19D-INV-${TS}`)!
    expect(inv.voucherType).toBe('Sales')
    expect(inv.amount).toBe(1050)
    const partyDr = inv.ledgerEntries.find((e) => e.isDebit)!
    expect(partyDr.ledger).toContain('RGT19D Party')
    const salesCr = inv.ledgerEntries.find((e) => !e.isDebit && e.ledger.startsWith('Sales'))!
    expect(salesCr.amount).toBe(1000)
    const gst = inv.ledgerEntries.find((e) => e.ledger === 'Output GST')!
    expect(gst.amount).toBe(50) // 25 CGST + 25 SGST

    const rcp = out.vouchers.find((v) => v.voucherNo === `RGT19D-RCP-${TS}`)!
    expect(rcp.voucherType).toBe('Receipt')
    expect(rcp.ledgerEntries.find((e) => e.isDebit)!.ledger).toBe('Bank')
    expect(rcp.ledgerEntries.find((e) => !e.isDebit)!.ledger).toContain('RGT19D Party')
    expect(rcp.narration).toContain('UTR123')

    const pmt = out.vouchers.find((v) => v.voucherNo === `RGT19D-PMT-${TS}`)!
    expect(pmt.voucherType).toBe('Payment')
    expect(pmt.ledgerEntries.find((e) => e.isDebit)!.ledger).toContain('RGT19D Party')
    expect(pmt.ledgerEntries.find((e) => !e.isDebit)!.ledger).toBe('Cash')

    const jrn = out.vouchers.find((v) => v.voucherNo === `RGT19D-JRN-${TS}`)!
    expect(jrn.voucherType).toBe('Journal')
    expect(jrn.ledgerEntries.find((e) => e.isDebit)!.ledger).toBe('Round Off')
    expect(jrn.ledgerEntries.find((e) => !e.isDebit)!.ledger).toBe('Sales')
  })

  it('window filters by date', async () => {
    const out = await buildTallyExport(new Date('2026-12-04'), new Date('2026-12-31'))
    expect(out.vouchers.map((v) => v.voucherNo)).toEqual([`RGT19D-JRN-${TS}`])
  })
})
