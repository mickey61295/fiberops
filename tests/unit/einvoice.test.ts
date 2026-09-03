/**
 * SPEC-M23 — the mock e-invoice handshake (Gap D #11 closure): determinism
 * and formats (64-hex IRN over the REAL input tuple, 10-digit ack, 12-digit
 * EWB), the workflow guards (issued-only, one IRN per invoice), the ₹50k
 * e-Way threshold, the commit stamping, the print rows, and the tool.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { mockIrnFor, mockAckNoFor, mockEwbNoFor, planGenerateIrn, planCancelIrn, IRN_CANCEL_WINDOW_MS } from '@/lib/erp/einvoice'
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

  it('the agent tool is registered (write, accounting) — registry 226 → 227 (M26 adds cancel)', async () => {
    const tool = getTool('generate_einvoice_irn')
    expect(tool).toBeTruthy()
    expect(tool!.isWrite).toBe(true)
    expect(tool!.domain).toBe('accounting')
    expect(allTools.length).toBe(253) // M44 CST: +create/update/list_cost_component +get_order_cost // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
  })
})

describe('SPEC-M26 — the IRN cancellation workflow', () => {
  const CANCEL_INV = `M26-INV-${Date.now()}`
  let cancelInvId = ''
  let cancelPartyId = ''

  beforeAll(async () => {
    const party = await db.party.create({ data: { code: `M26-P-${Date.now()}`, name: 'M26 Cancel Party', partyType: 'supplier' } })
    cancelPartyId = party.id
    const inv = await db.salesInvoice.create({
      data: {
        invoiceNo: CANCEL_INV, partyId: party.id, finYear: '26-27',
        billAmount: 80000, status: 'issued', invoiceDate: new Date(),
      },
    })
    cancelInvId = inv.id
  })

  afterAll(async () => {
    await db.salesInvoice.deleteMany({ where: { id: cancelInvId } }).catch(() => {})
    await db.party.deleteMany({ where: { id: cancelPartyId } }).catch(() => {})
  })

  it('guards: unknown invoice / no live IRN / window expired', async () => {
    const unknown = await planCancelIrn({ invoiceNo: 'NOPE-404', reason: 'typo' })
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error).toContain('not found')

    const none = await planCancelIrn({ invoiceNo: CANCEL_INV, reason: 'typo' })
    expect(none.ok).toBe(false)
    if (!none.ok) expect(none.error).toContain('no live IRN')

    // stamp, then age the stamp beyond the 24h window
    const gen = await planGenerateIrn({ invoiceNo: CANCEL_INV })
    expect(gen.ok).toBe(true)
    if (gen.ok) await gen.commit()
    await db.salesInvoice.update({
      where: { id: cancelInvId },
      data: { irnGeneratedAt: new Date(Date.now() - IRN_CANCEL_WINDOW_MS - 3600_000) },
    })
    const expired = await planCancelIrn({ invoiceNo: CANCEL_INV, reason: 'typo' })
    expect(expired.ok).toBe(false)
    if (!expired.ok) expect(expired.error).toContain('24h')
  })

  it('the happy path: cancel clears the trio, stamps the history slot (pre-M26 fallback works)', async () => {
    // reset the stamp to NOW via the updatedAt fallback path: clear generatedAt so
    // the pre-M26 approximation (updatedAt) applies — updatedAt was just touched
    await db.salesInvoice.update({ where: { id: cancelInvId }, data: { irnGeneratedAt: null } })
    const res = await planCancelIrn({ invoiceNo: CANCEL_INV, reason: 'wrong_entry' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      const r = await res.commit()
      expect(r.irnCancelledIrn).toMatch(/^[0-9a-f]{64}$/)
    }
    const inv = await db.salesInvoice.findUnique({ where: { id: cancelInvId } })
    expect(inv?.irn).toBeNull()
    expect(inv?.irnAckNo).toBeNull()
    expect(inv?.ewbNo).toBeNull()
    expect(inv?.irnCancelledAt).toBeInstanceOf(Date)
    expect(inv?.irnCancelledIrn).toMatch(/^[0-9a-f]{64}$/)
  })

  it('regeneration after cancellation succeeds (the M23 promise closed) — same deterministic IRN', async () => {
    const again = await planCancelIrn({ invoiceNo: CANCEL_INV, reason: 'typo' })
    expect(again.ok).toBe(false) // no live IRN anymore — already cancelled
    const regen = await planGenerateIrn({ invoiceNo: CANCEL_INV })
    expect(regen.ok).toBe(true)
    if (regen.ok) {
      const r = await regen.commit()
      expect(r.irn).toMatch(/^[0-9a-f]{64}$/)
      // deterministic tuple ⇒ same invoice yields the SAME IRN as the first stamp
      const inv = await db.salesInvoice.findUnique({ where: { id: cancelInvId } })
      expect(inv?.irn).toBe(inv?.irnCancelledIrn)
      // the fresh generation re-stamps the window anchor
      expect(inv?.irnGeneratedAt).toBeInstanceOf(Date)
    }
  })

  it('generation stamps irnGeneratedAt (the window anchor)', async () => {
    const inv = await db.salesInvoice.findUnique({ where: { id: cancelInvId } })
    expect(inv?.irnGeneratedAt).toBeInstanceOf(Date)
    // within the window now: cancellation is allowed again
    const res = await planCancelIrn({ invoiceNo: CANCEL_INV, reason: 'order_cancelled' })
    expect(res.ok).toBe(true)
    if (res.ok) await res.commit()
  })

  it('the cancel agent tool is registered (write, accounting) — 228 total after M31', async () => {
    const tool = getTool('cancel_einvoice_irn')
    expect(tool).toBeTruthy()
    expect(tool!.isWrite).toBe(true)
    expect(tool!.domain).toBe('accounting')
  })
})
