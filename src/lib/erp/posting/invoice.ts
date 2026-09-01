/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 14 — create_sales_invoice service. Logic extracted VERBATIM
// from tools.ts. No ledger effect (status flip on despatch happens downstream).
// SPEC-M5 §7-A-2 adds the SIBLING planExportInvoice (commercial invoice,
// invoiceType='export' + ern) — planInvoice and its tool stay byte-identical
// (VERBATIM rule); the sibling shares the number space INV-####.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { InvoiceInput } from '../schemas/invoice'
import type { CommercialInvoiceInput } from '../schemas/commercial-invoice'
import { dateOrIstToday } from '@/lib/erp/dates'

/** Shared INV-#### allocator (M5 §4 rule 2: one number space per family). */
async function nextInvoiceNo(desired?: string): Promise<string> {
  if (desired?.trim()) {
    const exists = await db.salesInvoice.findUnique({ where: { invoiceNo: desired } }).catch(() => null)
    if (!exists) return desired
  }
  const all = await db.salesInvoice.findMany({ where: { invoiceNo: { startsWith: 'INV-' } } })
  const used = new Set(all.map((i) => i.invoiceNo))
  let n = 1
  while (used.has(`INV-${String(n).padStart(4, '0')}`)) n++
  return `INV-${String(n).padStart(4, '0')}`
}

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

  // PAY-07 — dueDate: explicit wins; else invoiceDate + creditDays; else null
  // (the aging anchor falls back to invoiceDate when null).
  const invoiceDate = dateOrIstToday(args.invoiceDate)
  const creditDays = args.creditDays ?? null
  const dueDate = args.dueDate
    ? dateOrIstToday(args.dueDate)
    : creditDays != null && creditDays > 0
      ? new Date(invoiceDate.getTime() + creditDays * 86_400_000)
      : null

  return {
    ok: true,
    text: `Proposed invoice ${resolvedInvoiceNo} for ₹${billAmount} (${args.taxableValue} + ${args.gstRate}% ${args.gstType})${dueDate ? ` · due ${dueDate.toISOString().slice(0, 10)}` : ''}.`,
    summary: `Create invoice ${resolvedInvoiceNo} | ${party.name} | order ${args.orderNo} | qty ${args.totalQty} | taxable ₹${args.taxableValue} | GST ${args.gstRate}% ${args.gstType} | total ₹${billAmount}${creditDays ? ` | credit ${creditDays}d` : ''}${dueDate ? ` | due ${dueDate.toISOString().slice(0, 10)}` : ''}`,
    creates: [
      { table: 'salesInvoice', data: { invoiceNo: resolvedInvoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id, invoiceDate, dueDate, creditDays, finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued' } },
    ],
    sideEffects: ['Party AR increases', 'GST payable will be set up', 'Stock will be reduced when despatch is created', ...(dueDate ? [`Aging anchors on due ${dueDate.toISOString().slice(0, 10)} (PAY-07)`] : [])],
    async commit() {
      const inv = await db.salesInvoice.create({
        data: {
          invoiceNo: resolvedInvoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id,
          invoiceDate, dueDate, creditDays,
          finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue,
          cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued',
        },
      })
      return { id: inv.id, invoiceNo: inv.invoiceNo, billAmount: inv.billAmount, dueDate: inv.dueDate }
    },
  }
}

// SPEC-M5 §7-A-2 — create_commercial_invoice service (export variant).
// Same tables/number space as planInvoice; differences: invoiceType='export',
// ern (Export Report Number), gstType defaults to igst. planInvoice above is
// untouched (VERBATIM); this sibling reuses its helpers.
export async function planExportInvoice(args: CommercialInvoiceInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const finYear = '26-27'

  const gstType = args.gstType?.trim() || 'igst'
  const gstRate = args.gstRate ?? 0
  const gstAmt = (args.taxableValue * gstRate) / 100
  const billAmount = args.taxableValue + gstAmt
  const cgstRate = gstType === 'cgst_sgst' ? gstRate / 2 : 0
  const sgstRate = gstType === 'cgst_sgst' ? gstRate / 2 : 0
  const igstRate = gstType === 'igst' ? gstRate : 0
  const cgstAmt = (args.taxableValue * cgstRate) / 100
  const sgstAmt = (args.taxableValue * sgstRate) / 100
  const igstAmt = (args.taxableValue * igstRate) / 100
  const billType = args.billType?.trim() || 'sales'
  const ern = args.ern?.trim() || null

  const resolvedInvoiceNo = await nextInvoiceNo(args.invoiceNo)

  const data = {
    invoiceNo: resolvedInvoiceNo, invoiceType: 'export', orderId: order.id, partyId: party.id,
    invoiceDate: dateOrIstToday(args.invoiceDate),
    finYear, billType, totalQty: args.totalQty, taxableValue: args.taxableValue,
    cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount,
    ern, status: 'issued',
  }

  return {
    ok: true,
    text: `Proposed commercial (export) invoice ${resolvedInvoiceNo} for ₹${billAmount}${ern ? ` · ERN ${ern}` : ''}.`,
    summary: `Create commercial invoice ${resolvedInvoiceNo} | ${party.name} | order ${args.orderNo} | qty ${args.totalQty} | taxable ₹${args.taxableValue} | GST ${gstRate}% ${gstType} | total ₹${billAmount}${ern ? ` | ERN ${ern}` : ''}`,
    creates: [
      { table: 'salesInvoice', data: { ...data } },
    ],
    sideEffects: ['Party AR increases', 'Export invoices are zero-rated unless GST keyed — verify shipping bill', 'Stock will be reduced when despatch is created'],
    async commit() {
      const inv = await db.salesInvoice.create({ data })
      return { id: inv.id, invoiceNo: inv.invoiceNo, billAmount: inv.billAmount, ern: inv.ern }
    },
  }
}
