/**
 * W6 reconciliation queries — SPEC-M4 §9 (pure read fns; the card component
 * renders them). Four counterpart pairs, math test-asserted:
 *   PO ↔ GRNs · Invoice ↔ Payments · Jobwork out ↔ in · Despatch ↔ Invoice.
 * Plain-FK columns (Payment.invoiceId, PcsDespatch.orderId) resolve via
 * where-lookups, never include{} on a non-relation (PITFALLS #21).
 * GRN received uses the header totalQty (the posting contract maintains
 * totalQty = Σ line qty — same read the party-balance register uses).
 */
import { db } from '@/lib/db'

export interface ReconCounterRow {
  label: string
  value: string
  href?: string | null
}

export interface ReconResult {
  title: string
  /** e.g. "ordered 150 · received 60 · balance 90" */
  mathLine: string
  balance: number
  balanceLabel: string
  /** negative balance = counterpart ahead (over-received / over-collected) */
  rows: ReconCounterRow[]
  rowsTitle: string
}

const qty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

/** PO ↔ GRNs — ordered = Σ POLine.qty · received = Σ GRN.totalQty (poId) · balance. */
export async function poRecon(poId: string): Promise<ReconResult | null> {
  const po = await db.purchaseOrder.findUnique({
    where: { id: poId },
    include: { lines: true, grns: true },
  })
  if (!po) return null
  const ordered = po.lines.reduce((s, l) => s + l.qty, 0)
  const received = po.grns.reduce((s, g) => s + g.totalQty, 0)
  const balance = ordered - received
  return {
    title: 'PO ↔ GRNs',
    mathLine: `ordered ${qty(ordered)} · received ${qty(received)} · balance ${qty(balance)}`,
    balance,
    balanceLabel: 'Pending to receive',
    rowsTitle: 'GRNs against this PO',
    rows: po.grns.map((g) => ({
      label: `${g.grnNo} · ${new Date(g.grnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      value: `${qty(g.totalQty)} · ${inr(g.totalValue)}`,
      href: `/procurement/grn/${g.id}`,
    })),
  }
}

/** Invoice ↔ Payments — billed = billAmount · collected = Σ Payment.amount where invoiceId (PLAIN FK) · balance. */
export async function invoiceRecon(invoiceId: string): Promise<ReconResult | null> {
  const inv = await db.salesInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return null
  const payments = await db.payment.findMany({ where: { invoiceId }, orderBy: { payDate: 'desc' } })
  const collected = payments.reduce((s, p) => s + p.amount, 0)
  const balance = inv.billAmount - collected
  return {
    title: 'Invoice ↔ Payments',
    mathLine: `billed ${inr(inv.billAmount)} · collected ${inr(collected)} · balance ${inr(balance)}`,
    balance,
    balanceLabel: 'Outstanding',
    rowsTitle: 'Payments settling this invoice',
    rows: payments.map((p) => ({
      label: `${p.voucherNo} · ${new Date(p.payDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} · ${p.direction}`,
      value: inr(p.amount),
      href: `/accounts/payments/${p.id}`,
    })),
  }
}

/** Jobwork out ↔ in — sent = totalQty · status · at-party = Σ sent-status DCs for the jobworker; rows: their other DCs. */
export async function jobworkRecon(dcId: string): Promise<ReconResult | null> {
  const jw = await db.jobworkOrder.findUnique({ where: { id: dcId } })
  if (!jw) return null
  const siblings = await db.jobworkOrder.findMany({
    where: { jobworkerId: jw.jobworkerId },
    orderBy: { outDate: 'desc' },
    take: 50,
  })
  const atParty = siblings.filter((s) => s.status === 'sent').reduce((s, x) => s + x.totalQty, 0)
  const returned = jw.status === 'sent' ? 0 : jw.totalQty
  const balance = jw.totalQty - returned
  return {
    title: 'Jobwork out ↔ in',
    mathLine: `sent ${qty(jw.totalQty)} · status ${jw.status} (${jw.status === 'sent' ? 'at party' : 'returned'}) · at party (all DCs) ${qty(atParty)}`,
    balance,
    balanceLabel: jw.status === 'sent' ? 'At party (this DC)' : 'Returned',
    rowsTitle: "This jobworker's DCs",
    rows: siblings.map((s) => ({
      label: `${s.dcNo} · ${new Date(s.outDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      value: `${qty(s.totalQty)} · ${s.status}`,
      href: `/jobwork/order/${s.id}`,
    })),
  }
}

/** Despatch ↔ Invoice (order scope) — despatched = Σ PcsDespatch.totalPcs (orderId plain FK) · invoiced = Σ SalesInvoice.totalQty · balance; rows: the despatches. */
export async function despatchRecon(orderId: string): Promise<ReconResult | null> {
  const [despatches, invoices] = await Promise.all([
    db.pcsDespatch.findMany({ where: { orderId }, orderBy: { despatchDate: 'desc' } }),
    db.salesInvoice.findMany({ where: { orderId }, select: { totalQty: true } }),
  ])
  const despatched = despatches.reduce((s, d) => s + d.totalPcs, 0)
  const invoiced = invoices.reduce((s, i) => s + i.totalQty, 0)
  const balance = despatched - invoiced
  return {
    title: 'Despatch ↔ Invoice',
    mathLine: `despatched ${qty(despatched)} pcs · invoiced ${qty(invoiced)} · balance ${qty(balance)} pcs`,
    balance,
    balanceLabel: 'Despatched not yet invoiced',
    rowsTitle: 'Despatches for this order',
    rows: despatches.map((d) => ({
      label: `${d.dcNo} · ${new Date(d.despatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      value: `${qty(d.totalPcs)} pcs · ${d.status}`,
      href: `/pieces/despatch/${d.id}`,
    })),
  }
}
