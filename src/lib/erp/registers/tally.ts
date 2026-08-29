/**
 * Tally JSON export adapter — SPEC-M19 §4 Wave D (audit §3-C1-10, open
 * decision #3 resolved as "JSON adapter"). Reads the money documents for a
 * window and shapes them Tally-import-style: SalesInvoice → Sales voucher
 * (party Dr / Sales Cr + GST split), Payment → Receipt (in) / Payment (out),
 * Journal → Journal (debitAccount Dr / creditAccount Cr). Read-side only
 * (ADR-001 twin): the agent's list_invoices / get_party_ledger doors read the
 * same rows.
 */
import { db } from '@/lib/db'

export interface TallyLedgerEntry {
  ledger: string
  amount: number
  isDebit: boolean
}

export interface TallyVoucher {
  voucherType: 'Sales' | 'Receipt' | 'Payment' | 'Journal'
  date: string // ISO date
  voucherNo: string
  party: string | null
  amount: number
  narration: string | null
  ledgerEntries: TallyLedgerEntry[]
}

export interface TallyExport {
  companyName: string
  fromDate: string
  toDate: string
  vouchers: TallyVoucher[]
  counts: { sales: number; receipts: number; payments: number; journals: number }
}

const MODE_LEDGER: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank',
  cheque: 'Bank',
  rtgs: 'Bank',
  upi: 'Bank',
}

export async function buildTallyExport(from: Date, to: Date): Promise<TallyExport> {
  const [invoices, payments, journals, companyOpt] = await Promise.all([
    db.salesInvoice.findMany({
      where: { invoiceDate: { gte: from, lte: to }, status: { not: 'cancelled' } },
      include: { party: true },
      orderBy: { invoiceDate: 'asc' },
      take: 2000,
    }),
    db.payment.findMany({
      where: { payDate: { gte: from, lte: to } },
      include: { party: true },
      orderBy: { payDate: 'asc' },
      take: 2000,
    }),
    db.journal.findMany({
      where: { date: { gte: from, lte: to } },
      include: { party: true },
      orderBy: { date: 'asc' },
      take: 2000,
    }),
    db.appOption.findUnique({ where: { key: 'print.companyName' } }),
  ])

  const vouchers: TallyVoucher[] = []
  let sales = 0, receipts = 0, paymentCount = 0, journalCount = 0

  for (const inv of invoices) {
    sales += 1
    const gst = (inv.cgstAmt ?? 0) + (inv.sgstAmt ?? 0) + (inv.igstAmt ?? 0)
    const entries: TallyLedgerEntry[] = [
      { ledger: inv.party?.name ?? 'Sundry Debtors', amount: inv.billAmount, isDebit: true },
      { ledger: `Sales (${inv.billType})`, amount: inv.taxableValue, isDebit: false },
    ]
    if (gst > 0) entries.push({ ledger: 'Output GST', amount: gst, isDebit: false })
    if (inv.otherCharges) entries.push({ ledger: 'Other Charges', amount: inv.otherCharges, isDebit: false })
    if (inv.roundOff) entries.push({ ledger: 'Round Off', amount: inv.roundOff, isDebit: false })
    vouchers.push({
      voucherType: 'Sales',
      date: inv.invoiceDate.toISOString().slice(0, 10),
      voucherNo: inv.invoiceNo,
      party: inv.party?.name ?? null,
      amount: inv.billAmount,
      narration: `${inv.billType} invoice${inv.orderId ? '' : ' (orderless)'}`,
      ledgerEntries: entries,
    })
  }

  for (const p of payments) {
    const isReceipt = p.direction === 'in'
    if (isReceipt) receipts += 1
    else paymentCount += 1
    const bankLedger = MODE_LEDGER[p.mode] ?? 'Bank'
    const partyLedger = p.party?.name ?? 'Sundry Parties'
    vouchers.push({
      voucherType: isReceipt ? 'Receipt' : 'Payment',
      date: p.payDate.toISOString().slice(0, 10),
      voucherNo: p.voucherNo,
      party: p.party?.name ?? null,
      amount: p.amount,
      narration: p.reference ? `${p.mode} ref ${p.reference}` : p.mode,
      ledgerEntries: isReceipt
        ? [
            { ledger: bankLedger, amount: p.amount, isDebit: true },
            { ledger: partyLedger, amount: p.amount, isDebit: false },
          ]
        : [
            { ledger: partyLedger, amount: p.amount, isDebit: true },
            { ledger: bankLedger, amount: p.amount, isDebit: false },
          ],
    })
  }

  for (const j of journals) {
    journalCount += 1
    vouchers.push({
      voucherType: 'Journal',
      date: j.date.toISOString().slice(0, 10),
      voucherNo: j.voucherNo,
      party: j.party?.name ?? null,
      amount: j.amount,
      narration: j.narration,
      ledgerEntries: [
        { ledger: j.debitAccount, amount: j.amount, isDebit: true },
        { ledger: j.creditAccount, amount: j.amount, isDebit: false },
      ],
    })
  }

  return {
    companyName: companyOpt?.value ?? 'FiberOps',
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    vouchers,
    counts: { sales, receipts, payments: paymentCount, journals: journalCount },
  }
}
