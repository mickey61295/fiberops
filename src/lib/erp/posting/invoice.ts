/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 14 — create_sales_invoice service. Logic extracted VERBATIM
// from tools.ts. No ledger effect (status flip on despatch happens downstream).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { InvoiceInput } from '../schemas/invoice'

export async function planInvoice(args: InvoiceInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const finYear = '26-27'
  const gstAmt = (args.taxableValue * args.gstRate) / 100
  const billAmount = args.taxableValue + gstAmt
  const cgstRate = args.gstType === 'cgst_sgst' ? args.gstRate / 2 : 0
  const sgstRate = args.gstType === 'cgst_sgst' ? args.gstRate / 2 : 0
  const igstRate = args.gstType === 'igst' ? args.gstRate : 0
  const cgstAmt = (args.taxableValue * cgstRate) / 100
  const sgstAmt = (args.taxableValue * sgstRate) / 100
  const igstAmt = (args.taxableValue * igstRate) / 100

  // Resolve a free invoice number
  const resolvedInvoiceNo = await (async () => {
    const desired = args.invoiceNo?.trim()
    if (desired) {
      const exists = await db.salesInvoice.findUnique({ where: { invoiceNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.salesInvoice.findMany({ where: { invoiceNo: { startsWith: 'INV-' } } })
    const used = new Set(all.map((i) => i.invoiceNo))
    let n = 1
    while (used.has(`INV-${String(n).padStart(4, '0')}`)) n++
    return `INV-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed invoice ${resolvedInvoiceNo} for ₹${billAmount} (${args.taxableValue} + ${args.gstRate}% ${args.gstType}).`,
    summary: `Create invoice ${resolvedInvoiceNo} | ${party.name} | order ${args.orderNo} | qty ${args.totalQty} | taxable ₹${args.taxableValue} | GST ${args.gstRate}% ${args.gstType} | total ₹${billAmount}`,
    creates: [
      { table: 'salesInvoice', data: { invoiceNo: resolvedInvoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id, invoiceDate: args.invoiceDate ? new Date(args.invoiceDate) : new Date(), finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued' } },
    ],
    sideEffects: ['Party AR increases', 'GST payable will be set up', 'Stock will be reduced when despatch is created'],
    async commit() {
      const inv = await db.salesInvoice.create({
        data: {
          invoiceNo: resolvedInvoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id,
          invoiceDate: args.invoiceDate ? new Date(args.invoiceDate) : new Date(),
          finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue,
          cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued',
        },
      })
      return { id: inv.id, invoiceNo: inv.invoiceNo, billAmount: inv.billAmount }
    },
  }
}
