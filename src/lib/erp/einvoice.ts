/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M23 — the e-Invoice / e-Way Bill MOCK handshake (gap-audit Gap D #11:
// the v1-promised mock IRN, previously zero code). DETERMINISTIC offline
// mock: no portal, no signing — but the real workflow's RULES hold (issued
// invoices only, one IRN per invoice, e-Way only >₹50k) and the formats are
// faithful (IRN = 64-hex SHA-256 over the REAL input tuple; Ack 10 digits;
// EWB 12 digits). Same invoice ⇒ same mock IRN (deterministic ⇒ testable).
//
// The REAL IRN input tuple (govt spec): seller GSTIN | buyer GSTIN |
// invoice no | invoice date (dd/mm/yyyy) | invoice value.

import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import type { DocPlanResult } from './posting/types'

const EWB_THRESHOLD = 50000 // the real consignment-value threshold (₹)

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function ddmmyyyy(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** The canonical IRN input tuple for an invoice (govt fields, our data). */
export function irnTuple(inv: {
  invoiceNo: string
  invoiceDate: Date
  billAmount: number
  sellerGstin?: string | null
  buyerGstin?: string | null
}): string {
  return [
    inv.sellerGstin?.trim() || '33UNREGISTERED',
    inv.buyerGstin?.trim() || 'UNREGISTERED',
    inv.invoiceNo,
    ddmmyyyy(new Date(inv.invoiceDate)),
    String(Math.round(inv.billAmount)),
  ].join('|')
}

/** The mock IRN — SHA-256 hex over the input tuple (the real format). */
export function mockIrnFor(inv: Parameters<typeof irnTuple>[0]): string {
  return sha256(irnTuple(inv))
}

/** The mock IRN acknowledgement no — 10 digits derived from the same hash. */
export function mockAckNoFor(inv: Parameters<typeof irnTuple>[0]): string {
  return digitsFrom('ack|' + irnTuple(inv), 10)
}

/** The mock e-Way Bill no — 12 digits (only granted >₹50k consignments). */
export function mockEwbNoFor(inv: Parameters<typeof irnTuple>[0]): string {
  return digitsFrom('ewb|' + irnTuple(inv), 12)
}

/** N decimal digits derived deterministically from a string's hash (no
 *  BigInt — the tsconfig target predates ES2020 literals). */
function digitsFrom(s: string, n: number): string {
  const h = sha256(s)
  let out = ''
  for (let i = 0; i < h.length && out.length < n; i++) {
    out += String(parseInt(h[i], 16) % 10)
  }
  return out.slice(0, n)
}

/**
 * planGenerateIrn — the mock handshake for ONE invoice. Guards (the real
 * workflow's rules): invoice exists · status 'issued' · no IRN yet.
 * Commit stamps irn + irnAckNo + ewbNo (ewb only >₹50k) in ONE update.
 */
export async function planGenerateIrn(args: { invoiceNo: string }): Promise<DocPlanResult> {
  const inv = await db.salesInvoice.findUnique({
    where: { invoiceNo: args.invoiceNo },
    include: { party: true },
  })
  if (!inv) return { ok: false, error: `Invoice ${args.invoiceNo} not found` }
  if (inv.status !== 'issued') {
    return { ok: false, error: `Invoice ${args.invoiceNo} is '${inv.status}' — the e-invoice workflow needs an ISSUED invoice (draft/cancelled/paid are out)` }
  }
  if (inv.irn) {
    return { ok: false, error: `Invoice ${args.invoiceNo} already carries an IRN (${inv.irn.slice(0, 12)}…) — regeneration is the cancellation workflow (not in the mock scope)` }
  }

  const seller = await db.appOption.findUnique({ where: { key: 'print.gstin' } })
  const base = {
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    billAmount: inv.billAmount,
    sellerGstin: seller?.value,
    buyerGstin: inv.party?.gstin,
  }
  const irn = mockIrnFor(base)
  const ackNo = mockAckNoFor(base)
  const ewbEligible = inv.billAmount > EWB_THRESHOLD
  const ewbNo = ewbEligible ? mockEwbNoFor(base) : null

  return {
    ok: true,
    text: `Proposed mock e-invoice for ${inv.invoiceNo}: IRN ${irn.slice(0, 16)}…${ewbEligible ? ` + e-Way Bill ${ewbNo}` : ' (no e-Way Bill — consignment ≤ ₹50,000)'}.`,
    summary: `Generate mock IRN | ${inv.invoiceNo} | ₹${inv.billAmount.toLocaleString('en-IN')} | ack ${ackNo}${ewbEligible ? ` | e-Way ${ewbNo}` : ' | no e-Way (≤₹50k)'}`,
    updates: [
      { table: 'salesInvoice', id: inv.id, data: { irn, irnAckNo: ackNo, ...(ewbNo ? { ewbNo } : {}) } },
    ],
    sideEffects: [
      'Invoice print + view show the IRN / Ack / e-Way rows (mock handshake, SPEC-M23)',
      ...(ewbEligible ? ['Transporter copy: the e-Way Bill no is valid for the mock workflow'] : []),
    ],
    async commit() {
      const updated = await db.salesInvoice.update({
        where: { id: inv.id },
        data: { irn, irnAckNo: ackNo, ...(ewbNo ? { ewbNo } : {}) },
      })
      return { id: updated.id, invoiceNo: updated.invoiceNo, irn: updated.irn, irnAckNo: updated.irnAckNo, ewbNo: updated.ewbNo }
    },
  }
}
