/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M39 §1 JWL-06 — bill_jobwork: closes the jobwork money loop.
// Aggregates RECEIVED-NOT-BILLED jobwork DCs per jobworker into ONE jobwork
// invoice (SalesInvoice billType='jobwork', INV-#### space), flips the DCs to
// status 'billed' + billedInvoiceNo — retiring the HFX-09 ghost ('billed'
// gains a writer). Line value = receivedQty × rate (header-only DCs fall back
// to totalValue × received-ratio). The invoice notes carry the JW doc numbers
// (the link the legacy piece invoice needs).
//
// Honesty rules (spec §3-T2): only DCs with received qty are billable — a
// 'sent' DC has nothing to bill; an already-billed DC is skipped, not rebilled.

import { db } from '@/lib/db'
import { resolveDocNo, activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { JobworkBillInput } from '../schemas/jobwork'
import { dateOrIstToday, istDateStr } from '@/lib/erp/dates'

/** DCs eligible for billing: fully received (or GAN-accepted), never billed. */
const BILLABLE = ['received', 'accepted']

export async function planJobworkBill(args: JobworkBillInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.jobworkerCode } })
  if (!party) return { ok: false, error: `Party ${args.jobworkerCode} not found` }

  const all = await db.jobworkOrder.findMany({
    where: { jobworkerId: party.id, status: { in: BILLABLE } },
    orderBy: { outDate: 'asc' },
    include: { lines: true },
  })
  const billable = all.filter((d) => !d.billedInvoiceNo)
  if (billable.length === 0) {
    const open = await db.jobworkOrder.count({ where: { jobworkerId: party.id, status: { in: ['sent', 'partial'] } } })
    return {
      ok: false,
      error: `Nothing to bill for ${party.name}: no received-not-billed jobwork DCs${open > 0 ? ` (${open} DC(s) still sent/partial — receive them first)` : ''}`,
    }
  }

  // Value: lines (receivedQty × rate) win; header-only DCs fall back to
  // totalValue × (receivedQty/totalQty).
  const entries = billable.map((d) => {
    const qty = d.lines.length > 0 ? d.lines.reduce((s, l) => s + l.receivedQty, 0) : d.receivedQty
    const value = d.lines.length > 0
      ? d.lines.reduce((s, l) => s + l.receivedQty * l.rate, 0)
      : d.totalValue * (d.totalQty > 0 ? d.receivedQty / d.totalQty : 0)
    return { dc: d, qty, value }
  })
  const totalQty = Math.round(entries.reduce((s, e) => s + e.qty, 0) * 100) / 100
  const taxableValue = Math.round(entries.reduce((s, e) => s + e.value, 0) * 100) / 100

  const gstRate = args.gstRate ?? 18
  const isIgst = args.gstType === 'igst'
  const half = Math.round(((taxableValue * gstRate) / 100 / 2) * 100) / 100
  const cgstRate = isIgst ? 0 : gstRate
  const sgstRate = isIgst ? 0 : gstRate
  const igstRate = isIgst ? gstRate : 0
  const cgstAmt = isIgst ? 0 : half
  const sgstAmt = isIgst ? 0 : half
  const igstAmt = isIgst ? Math.round((taxableValue * gstRate / 100) * 100) / 100 : 0
  const billAmount = Math.round((taxableValue + cgstAmt + sgstAmt + igstAmt) * 100) / 100

  const invoiceNo = await resolveDocNo('salesInvoice', 'invoiceNo', 'INV-', args.invoiceNo)
  const invoiceDate = dateOrIstToday(args.invoiceDate)
  const fy = await activeFinYear()
  // the JW doc link: each DC stores billedInvoiceNo (reverse navigation);
  // the forward link rides the plan summary + audit payload (SalesInvoice has
  // no notes column — the schema stays untouched).
  const covered = billable.map((d) => d.dcNo).join(', ')

  return {
    ok: true,
    text: `Proposed jobwork invoice ${invoiceNo} → ${party.name}: ${billable.length} DC(s), ${totalQty} units, ₹${taxableValue} + GST ₹${(cgstAmt + sgstAmt + igstAmt).toFixed(2)}.`,
    summary: `Bill jobwork ${invoiceNo} | ${party.name} | ${billable.length} DCs (${billable.map((d) => d.dcNo).join(', ')}) | qty ${totalQty} | taxable ₹${taxableValue} | GST ${gstRate}% ${isIgst ? 'IGST' : 'CGST+SGST'} | bill ₹${billAmount}`,
    creates: [
      { table: 'salesInvoice', data: { invoiceNo, invoiceType: 'domestic', partyId: party.id, invoiceDate, finYear: fy, billType: 'jobwork', totalQty, taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued' } },
    ],
    updates: billable.map((d) => ({ table: 'jobworkOrder', id: d.id, data: { status: 'billed', billedInvoiceNo: invoiceNo } })),
    sideEffects: [
      `${billable.length} jobwork DC(s) flip to 'billed' (retires the HFX-09 ghost — the state finally has a writer)`,
      `SalesInvoice ${invoiceNo} (billType jobwork) — party ledger picks it up as receivable`,
      `Link: each DC stores billedInvoiceNo ${invoiceNo}; covered DCs: ${covered}`,
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const inv = await tx.salesInvoice.create({
          data: { invoiceNo, invoiceType: 'domestic', partyId: party.id, invoiceDate, finYear: fy, billType: 'jobwork', totalQty, taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, roundOff: 0, billAmount, status: 'issued' },
        })
        await tx.jobworkOrder.updateMany({ where: { id: { in: billable.map((d) => d.id) } }, data: { status: 'billed', billedInvoiceNo: invoiceNo } })
        return { id: inv.id, invoiceNo: inv.invoiceNo, dcs: billable.map((d) => d.dcNo), billAmount }
      })
    },
  }
}
