/**
 * SPEC-M23 — the mock e-invoice handshake (Gap D #11 closure): determinism
 * and formats (64-hex IRN over the REAL input tuple, 10-digit ack, 12-digit
 * EWB), the workflow guards (issued-only, one IRN per invoice), the ₹50k
 * e-Way threshold, the commit stamping, the print rows, and the tool.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { mockIrnFor, mockAckNoFor, mockEwbNoFor, planGenerateIrn } from '@/lib/erp/einvoice'
import { getTool, allTools } from '@/lib/agent/tools'
import { fetchInvoicePrint } from '@/lib/erp/print/fetchers'

const TS = Date.now()
const PARTY = `M23-P-${TS}`
const BIG = `M23-INV-BIG-${TS}`   // ₹100,000 — e-Way eligible
const SMALL = `M23-INV-SML-${TS}` // ₹40,000 — below the threshold
const DRAFT = `M23-INV-DRF-${TS}` // draft — workflow rejected

let partyId = '', bigId = '', smallId = ''

const base = (invoiceNo: string, billAmount: number, sellerGstin = '33ABCDE1234F1Z5', buyerGstin = '33XYZWVU6789K1Z2') => ({
  invoiceNo, invoiceDate: new Date('2026-08-30'), billAmount, sellerGstin, buyerGstin,
})

describe('SPEC-M23 §2 — mock formats & determinism', () => {
  it('IRN is 64-hex over the REAL input tuple (seller|buyer|no|date|value)', () => {
    const irn = mockIrnFor(base('INV-0001', 100000))
    expect(irn).toMatch(/^[0-9a-f]{64}$/)
  })

  it('deterministic: same invoice → same IRN; any input tweak changes it', () => {
    const a = base('INV-0002', 100000)
    expect(mockIrnFor(a)).toBe(mockIrnFor({ ...a }))
    expect(mockIrnFor(a)).not.toBe(mockIrnFor(base('INV-0003', 100000))) // invoice no
    expect(mockIrnFor(a)).not.toBe(mockIrnFor(base('INV-0002', 100001))) // value
    expect(mockIrnFor(a)).not.toBe(mockIrnFor(base('INV-0002', 100000, '33OTHER'))) // seller GSTIN
  })

  it('ack = 10 digits; ewb = 12 digits; both deterministic', () => {
    const inv = base('INV-0004', 100000)
    expect(mockAckNoFor(inv)).toMatch(/^\d{10}$/)
    expect(mockEwbNoFor(inv)).toMatch(/^\d{12}$/)
    expect(mockAckNoFor(inv)).toBe(mockAckNoFor({ ...inv }))
    expect(mockAckNoFor(inv)).not.toBe(mockEwbNoFor(inv))
  })
})

describe('SPEC-M23 §2 — planGenerateIrn (guards + thresholds + commit)', () => {
  beforeAll(async () => {
    const p = await db.party.create({ data: { code: PARTY, name: `M23 Party ${TS}`, gstin: '33XYZWVU6789K1Z2' } })
    partyId = p.id
    const big = await db.salesInvoice.create({
      data: { invoiceNo: BIG, partyId, invoiceDate: new Date(), finYear: '26-27', billAmount: 100000, status: 'issued' },
    })
    bigId = big.id
    const small = await db.salesInvoice.create({
      data: { invoiceNo: SMALL, partyId, invoiceDate: new Date(), finYear: '26-27', billAmount: 40000, status: 'issued' },
    })
    smallId = small.id
    await db.salesInvoice.create({
      data: { invoiceNo: DRAFT, partyId, invoiceDate: new Date(), finYear: '26-27', billAmount: 100000, status: 'draft' },
    })
  })

  afterAll(async () => {
    await db.salesInvoice.deleteMany({ where: { partyId } }).catch(() => {})
    await db.party.deleteMany({ where: { id: partyId } }).catch(() => {})
    await db.$disconnect()
  })

  it('unknown invoice → error', async () => {
    const res = await planGenerateIrn({ invoiceNo: 'NOPE-404' })
    expect(res.ok).toBe(false)
  })

  it('non-issued invoices are rejected (the real workflow rule)', async () => {
    const res = await planGenerateIrn({ invoiceNo: DRAFT })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('ISSUED')
  })

  it('the plan carries an UPDATE (the stamp), not a create', async () => {
    const res = await planGenerateIrn({ invoiceNo: BIG })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.updates?.length).toBe(1)
      expect(res.updates?.[0].table).toBe('salesInvoice')
      expect(String(res.updates?.[0].data.irn)).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('commit stamps IRN + ack; e-Way ONLY over the ₹50k threshold', async () => {
    const big = await planGenerateIrn({ invoiceNo: BIG })
    expect(big.ok).toBe(true)
    if (big.ok) {
      const r = await big.commit()
      expect(r.irn).toMatch(/^[0-9a-f]{64}$/)
      expect(r.ewbNo).toMatch(/^\d{12}$/)
    }
    const small = await planGenerateIrn({ invoiceNo: SMALL })
    expect(small.ok).toBe(true)
    if (small.ok) {
      const r = await small.commit()
      expect(r.ewbNo).toBeNull() // ₹40,000 ≤ threshold — no e-Way Bill
    }
    const stamped = await db.salesInvoice.findUnique({ where: { id: bigId } })
    expect(stamped?.irn).toMatch(/^[0-9a-f]{64}$/)
    expect(stamped?.irnAckNo).toMatch(/^\d{10}$/)
    expect(stamped?.ewbNo).toMatch(/^\d{12}$/)
  })

  it('one IRN per invoice — already-stamped is rejected (no silent re-issue)', async () => {
    const res = await planGenerateIrn({ invoiceNo: BIG })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('already carries an IRN')
  })

  it('the print doc carries the IRN / Ack / e-Way rows when stamped', async () => {
    const doc = await fetchInvoicePrint(bigId)
    const meta = (doc.meta ?? []) as [string, string][]
    const keys = meta.map(([k]) => k)
    expect(keys).toContain('IRN')
    expect(keys).toContain('IRN Ack No')
    expect(keys).toContain('e-Way Bill No')
    // the small invoice: IRN + ack, NO e-Way row
    const docS = await fetchInvoicePrint(smallId)
    const keysS = ((docS.meta ?? []) as [string, string][]).map(([k]) => k)
    expect(keysS).toContain('IRN')
    expect(keysS).toContain('IRN Ack No')
    expect(keysS).not.toContain('e-Way Bill No')
  })

  it('the agent tool is registered (write, accounting) — registry 225 → 226', async () => {
    const tool = getTool('generate_einvoice_irn')
    expect(tool).toBeTruthy()
    expect(tool!.isWrite).toBe(true)
    expect(tool!.domain).toBe('accounting')
    expect(allTools.length).toBe(226)
  })
})
