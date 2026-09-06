/**
 * Tally JSON export adapter — SPEC-M19 §4 Wave D, REWRITTEN by SPEC-M53 M-04
 * "Tally both sides". THE EXPORT DOCTRINE (M52's GL doctrine applied to the
 * export): every journal row renders exactly ONCE — as its document's
 * voucher or as itself — and the CONTRA row IS the reversal, so a cancelled
 * transaction exports together with its reversal and nets zero (a
 * full-window Tally import converges to the GL truth).
 *
 *   SalesInvoice (issued/paid) → Sales    Dr party · Cr Sales + Output CGST/SGST/IGST splits
 *   SupplierBill (passed/…)    → Purchase Dr Purchases + Input CGST/SGST/IGST · Cr party
 *   Payment (in/out, any*)     → Receipt/Payment — legs from the frozen JV- companion strings
 *   DebitNote (any*)           → Credit Note — legs from the JV-DN- companion
 *   Expense (any*)             → Journal — legs from the JV-EXP- companion
 *   Journal standalone (any*)  → Journal (own legs; cancelled rows say so)
 *   CN-* contras (always)      → Journal with reversalOf — the GL's reversal
 *
 *   * journal-backed classes ignore document status (the companion is the GL
 *     row and it counts); the ONLY status doors are the journal-less classes
 *     (invoice/bill draft + cancelled excluded — no GL reversal exists for
 *     them; the boundary is reported in warnings, never silent).
 *
 *   JV-* companions NEVER render as journal vouchers (their documents carry
 *     them — counted once); an orphan JV-* (document gone) falls back to
 *     journal rendering + a warning. Party legs render per-party (Tally's
 *     book); the internal GL nets them under the type control (M52
 *     day-book) — two books, one truth. Format: JSON only (Tally XML is
 *     decision §17-4, pending the owner). Read-side only (ADR-001 twin):
 *     get_tally_export delegates here.
 */
import { db } from '@/lib/db'

export interface TallyLedgerEntry {
  ledger: string
  amount: number
  isDebit: boolean
}

export type TallyVoucherType = 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Credit Note' | 'Journal'

export type TallySource = 'invoice' | 'bill' | 'payment' | 'debit-note' | 'expense' | 'journal'

export interface TallyVoucher {
  voucherType: TallyVoucherType
  source: TallySource
  date: string // ISO date
  voucherNo: string
  party: string | null
  amount: number
  narration: string | null
  ledgerEntries: TallyLedgerEntry[]
  /** CN-* rows name the voucher they reverse (the GL's reversal mechanism). */
  reversalOf?: string
}

export interface TallyExport {
  companyName: string
  fromDate: string
  toDate: string
  vouchers: TallyVoucher[]
  counts: {
    sales: number
    purchases: number
    receipts: number
    payments: number
    creditNotes: number
    journals: number
    reversals: number
  }
  /** honesty doors — unlinked-bank legs, orphan companions, stored-math
   *  mismatches, exclusion counts. Never a silent drop, never a 500. */
  warnings: string[]
  /** the doctrine lines rendered with the payload (importers read them). */
  notes: string[]
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const r2 = (n: number) => Math.round(n * 100) / 100
const WARN_CAP = 20

function legsFromCompanion(
  debitAccount: string,
  creditAccount: string,
  amount: number,
): TallyLedgerEntry[] {
  return [
    { ledger: debitAccount, amount, isDebit: true },
    { ledger: creditAccount, amount, isDebit: false },
  ]
}

export async function buildTallyExport(from: Date, to: Date): Promise<TallyExport> {
  const [invoices, bills, payments, notes, expenses, journals, companyOpt] = await Promise.all([
    db.salesInvoice.findMany({
      where: { invoiceDate: { gte: from, lte: to } },
      include: { party: true },
      orderBy: { invoiceDate: 'asc' },
      take: 2000,
    }),
    db.supplierBill.findMany({
      where: { billDate: { gte: from, lte: to } },
      orderBy: { billDate: 'asc' },
      take: 2000,
    }),
    db.payment.findMany({
      where: { payDate: { gte: from, lte: to } },
      include: { party: true },
      orderBy: { payDate: 'asc' },
      take: 2000,
    }),
    db.debitNote.findMany({
      where: { date: { gte: from, lte: to } },
      include: { party: true },
      orderBy: { date: 'asc' },
      take: 2000,
    }),
    db.expense.findMany({
      where: { expDate: { gte: from, lte: to } },
      orderBy: { expDate: 'asc' },
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

  const warnings: string[] = []
  const warn = (line: string) => {
    if (warnings.length < WARN_CAP) warnings.push(line)
    else if (warnings.length === WARN_CAP) warnings.push('…more warnings suppressed (cap 20)')
  }

  // SupplierBill/Expense carry relation-less partyIds (PITFALLS #21) — the
  // party ledger names resolve through one batched lookup.
  const partyIds = new Set<string>()
  for (const b of bills) partyIds.add(b.partyId)
  for (const e of expenses) if (e.partyId) partyIds.add(e.partyId)
  const partyNameById = new Map(
    partyIds.size ? (await db.party.findMany({ where: { id: { in: [...partyIds] } }, select: { id: true, name: true } })).map((p) => [p.id, p.name] as const) : [],
  )

  // journal index — companions resolve by voucherNo; consumed ones never
  // re-render as journal vouchers (counted once, SPEC-M53 §1).
  const journalByNo = new Map(journals.map((j) => [j.voucherNo, j]))
  const consumed = new Set<string>()

  const vouchers: TallyVoucher[] = []
  let sales = 0, purchases = 0, receipts = 0, paymentCount = 0, creditNotes = 0, journalsCount = 0, reversals = 0

  // ── SalesInvoice → Sales (issued/paid only — draft never happened,
  //    cancelled has no GL reversal; both exclusions are REPORTED).
  let cancelledInvoices = 0, draftInvoices = 0
  for (const inv of invoices) {
    if (inv.status === 'cancelled') { cancelledInvoices += 1; continue }
    if (inv.status === 'draft') { draftInvoices += 1; continue }
    sales += 1
    const partyName = inv.party?.name ?? 'Sundry Debtors'
    const cgst = inv.cgstAmt ?? 0, sgst = inv.sgstAmt ?? 0, igst = inv.igstAmt ?? 0
    const entries: TallyLedgerEntry[] = [
      { ledger: partyName, amount: inv.billAmount, isDebit: true },
      { ledger: 'Sales', amount: inv.taxableValue, isDebit: false },
    ]
    if (cgst > 0) entries.push({ ledger: 'Output CGST', amount: cgst, isDebit: false })
    if (sgst > 0) entries.push({ ledger: 'Output SGST', amount: sgst, isDebit: false })
    if (igst > 0) entries.push({ ledger: 'Output IGST', amount: igst, isDebit: false })
    if (inv.otherCharges) entries.push({ ledger: 'Other Charges', amount: inv.otherCharges, isDebit: false })
    if (inv.roundOff) entries.push({ ledger: 'Round Off', amount: inv.roundOff, isDebit: false })
    const creditTotal = r2(inv.taxableValue + cgst + sgst + igst + (inv.otherCharges ?? 0) + (inv.roundOff ?? 0))
    if (Math.abs(creditTotal - inv.billAmount) > 0.005) {
      warn(`Invoice ${inv.invoiceNo}: billAmount ${inv.billAmount} ≠ legs total ${creditTotal} (stored math mismatch — imported as-is)`)
    }
    vouchers.push({
      voucherType: 'Sales',
      source: 'invoice',
      date: iso(inv.invoiceDate),
      voucherNo: inv.invoiceNo,
      party: partyName,
      amount: inv.billAmount,
      narration: `${inv.billType} invoice${inv.orderId ? '' : ' (orderless)'}`,
      ledgerEntries: entries,
    })
  }
  if (cancelledInvoices) warn(`${cancelledInvoices} cancelled invoice(s) excluded — no GL reversal exists for them; reverse in Tally manually if already imported`)
  if (draftInvoices) warn(`${draftInvoices} draft invoice(s) excluded — never issued`)

  // ── SupplierBill → Purchase (passed/partial/paid — the pass gate is the
  //    transaction's birth; draft/cancelled excluded + reported).
  let cancelledBills = 0, draftBills = 0
  for (const bill of bills) {
    if (bill.status === 'cancelled') { cancelledBills += 1; continue }
    if (bill.status === 'draft') { draftBills += 1; continue }
    purchases += 1
    const partyName = partyNameById.get(bill.partyId) ?? 'Sundry Creditors'
    const cgst = bill.cgstAmt ?? 0, sgst = bill.sgstAmt ?? 0, igst = bill.igstAmt ?? 0
    const entries: TallyLedgerEntry[] = [
      { ledger: 'Purchases', amount: bill.taxableValue, isDebit: true },
    ]
    if (cgst > 0) entries.push({ ledger: 'Input CGST', amount: cgst, isDebit: true })
    if (sgst > 0) entries.push({ ledger: 'Input SGST', amount: sgst, isDebit: true })
    if (igst > 0) entries.push({ ledger: 'Input IGST', amount: igst, isDebit: true })
    if (bill.otherCharges) entries.push({ ledger: 'Other Charges', amount: bill.otherCharges, isDebit: true })
    if (bill.roundOff) entries.push({ ledger: 'Round Off', amount: bill.roundOff, isDebit: true })
    entries.push({ ledger: partyName, amount: bill.billAmount, isDebit: false })
    const debitTotal = r2(bill.taxableValue + cgst + sgst + igst + (bill.otherCharges ?? 0) + (bill.roundOff ?? 0))
    if (Math.abs(debitTotal - bill.billAmount) > 0.005) {
      warn(`Bill ${bill.billNo}: billAmount ${bill.billAmount} ≠ legs total ${debitTotal} (stored math mismatch — imported as-is)`)
    }
    vouchers.push({
      voucherType: 'Purchase',
      source: 'bill',
      date: iso(bill.billDate),
      voucherNo: bill.billNo,
      party: partyName,
      amount: bill.billAmount,
      narration: `supplier bill${bill.grnId ? ' (GRN-linked)' : ''}${bill.matchStatus ? ` · match ${bill.matchStatus}` : ''}`,
      ledgerEntries: entries,
    })
  }
  if (cancelledBills) warn(`${cancelledBills} cancelled bill(s) excluded — no GL reversal exists for them`)
  if (draftBills) warn(`${draftBills} draft bill(s) excluded — the pass gate has not blessed them`)

  // ── Payment → Receipt/Payment — legs from the frozen JV- companion
  //    strings (direction-aware: the door wrote Dr cash/Cr party or the
  //    mirror); ANY status (a cancelled payment exports WITH its CN- contra
  //    and nets zero — the doctrine). Legacy rows without a companion
  //    derive mode-wise + a warning.
  for (const p of payments) {
    if (p.direction === 'in') receipts += 1
    else paymentCount += 1
    const companionNo = `JV-${p.voucherNo}`
    const companion = journalByNo.get(companionNo)
    if (companion) consumed.add(companionNo)
    const partyName = p.party?.name ?? 'Sundry Parties'
    let entries: TallyLedgerEntry[]
    if (companion) {
      entries = legsFromCompanion(companion.debitAccount, companion.creditAccount, p.amount)
      const cashLeg = p.direction === 'in' ? companion.debitAccount : companion.creditAccount
      if (p.mode !== 'cash' && cashLeg === 'Cash/Bank') {
        warn(`Payment ${p.voucherNo}: bank mode posts to the Cash/Bank control — the bank has no linked GL account (link glAccount on the bank master)`)
      }
    } else {
      entries =
        p.direction === 'in'
          ? [
              { ledger: 'Cash/Bank', amount: p.amount, isDebit: true },
              { ledger: partyName, amount: p.amount, isDebit: false },
            ]
          : [
              { ledger: partyName, amount: p.amount, isDebit: true },
              { ledger: 'Cash/Bank', amount: p.amount, isDebit: false },
            ]
      if (p.mode !== 'cash') {
        warn(`Payment ${p.voucherNo}: no companion journal — cash leg defaulted to Cash/Bank`)
      }
    }
    vouchers.push({
      voucherType: p.direction === 'in' ? 'Receipt' : 'Payment',
      source: 'payment',
      date: iso(p.payDate),
      voucherNo: p.voucherNo,
      party: partyName,
      amount: p.amount,
      narration: p.reference ? `${p.mode} ref ${p.reference}` : p.mode,
      ledgerEntries: entries,
    })
  }

  // ── DebitNote → Credit Note — legs from the frozen JV-DN- companion
  //    (Dr debitAccount / Cr the party). ANY status: a cancelled note
  //    exports with its CN- contra and nets zero. Legacy notes without a
  //    companion derive the M51 default (Dr Sales / Cr party) + a warning.
  for (const note of notes) {
    creditNotes += 1
    const companionNo = `JV-${note.noteNo}`
    const companion = journalByNo.get(companionNo)
    if (companion) consumed.add(companionNo)
    const partyName = note.party?.name ?? 'Sundry Debtors'
    let entries: TallyLedgerEntry[]
    let narration: string | null
    if (companion) {
      entries = legsFromCompanion(companion.debitAccount, companion.creditAccount, note.amount)
      narration = companion.narration
    } else {
      entries = [
        { ledger: 'Sales', amount: note.amount, isDebit: true },
        { ledger: partyName, amount: note.amount, isDebit: false },
      ]
      narration = `Debit note ${note.noteNo} (${note.noteType})${note.reason ? ' — ' + note.reason : ''}`
      warn(`Debit note ${note.noteNo}: no companion journal — legs derived (Dr Sales / Cr ${partyName})`)
    }
    vouchers.push({
      voucherType: 'Credit Note',
      source: 'debit-note',
      date: iso(note.date),
      voucherNo: note.noteNo,
      party: note.party?.name ?? null,
      amount: note.amount,
      narration,
      ledgerEntries: entries,
    })
  }

  // ── Expense → Journal (source 'expense') — legs from the frozen JV-EXP-
  //    companion. ANY status (cancelled exports with its contra, net zero).
  //    Legacy rows derive: Dr Freight (transport) / Other Expenses · Cr the
  //    party or Cash/Bank.
  for (const exp of expenses) {
    journalsCount += 1
    const companionNo = `JV-${exp.expNo}`
    const companion = journalByNo.get(companionNo)
    if (companion) consumed.add(companionNo)
    const partyName = exp.partyId ? partyNameById.get(exp.partyId) ?? null : null
    let entries: TallyLedgerEntry[]
    let narration: string | null
    if (companion) {
      entries = legsFromCompanion(companion.debitAccount, companion.creditAccount, exp.amount)
      narration = companion.narration
    } else {
      const debitLeg = exp.category === 'transport' ? 'Freight' : 'Other Expenses'
      const creditLeg = partyName ?? 'Cash/Bank'
      entries = legsFromCompanion(debitLeg, creditLeg, exp.amount)
      narration = `Expense ${exp.expNo} (${exp.category})${exp.narration ? ' — ' + exp.narration : ''}`
      warn(`Expense ${exp.expNo}: no companion journal — legs derived (Dr ${debitLeg} / Cr ${creditLeg})`)
    }
    vouchers.push({
      voucherType: 'Journal',
      source: 'expense',
      date: iso(exp.expDate),
      voucherNo: exp.expNo,
      party: partyName,
      amount: exp.amount,
      narration,
      ledgerEntries: entries,
    })
  }

  // ── Journal rows — every row that is NOT a consumed companion renders
  //    exactly once (the M52 doctrine: any status; the contra IS the
  //    reversal). CN-* rows are typed reversalOf; cancelled rows say so in
  //    the narration; orphan JV-* rows (document gone) fall back here +
  //    a warning — nothing silently drops.
  for (const j of journals) {
    if (consumed.has(j.voucherNo)) continue
    const isCompanionOrphan = j.voucherNo.startsWith('JV-')
    if (isCompanionOrphan) {
      warn(`Journal ${j.voucherNo}: companion with no document — exported as a journal voucher`)
    }
    const isContra = j.voucherNo.startsWith('CN-')
    if (isContra) {
      reversals += 1
      consumed.add(j.voucherNo) // (self; harmless)
    } else {
      journalsCount += 1
    }
    const cancelled = j.status === 'cancelled'
    const baseNarration = j.narration ?? ''
    const narration = isContra
      ? `Reversal: ${j.voucherNo.replace(/^CN-/, '')}${baseNarration ? ' — ' + baseNarration : ''}`
      : `${baseNarration}${cancelled ? ' [CANCELLED]' : ''}`
    vouchers.push({
      voucherType: 'Journal',
      source: 'journal',
      date: iso(j.date),
      voucherNo: j.voucherNo,
      party: j.party?.name ?? null,
      amount: j.amount,
      narration,
      ledgerEntries: legsFromCompanion(j.debitAccount, j.creditAccount, j.amount),
      ...(isContra ? { reversalOf: j.voucherNo.replace(/^CN-/, '') } : {}),
    })
  }

  // chronological like the day-book: date, then createdAt
  vouchers.sort((a, b) => (a.date === b.date ? a.voucherNo.localeCompare(b.voucherNo) : a.date.localeCompare(b.date)))

  return {
    companyName: companyOpt?.value ?? 'FiberOps',
    fromDate: iso(from),
    toDate: iso(to),
    vouchers,
    counts: { sales, purchases, receipts, payments: paymentCount, creditNotes, journals: journalsCount, reversals },
    warnings,
    notes: [
      'Counted once: every journal row renders exactly once — as its document voucher or as itself; JV-* companions never double-export (their documents carry them).',
      'Cancels mirror the GL: the CN- contra is the reversal — a cancelled transaction appears with its reversal, net zero (the M52 doctrine).',
      'Party legs render per-party (Tally\u2019s book); the internal GL nets them under the type control (M52 day-book) — two books, one truth.',
      'Invoice/bill cancels post no GL reversal (sub-ledger-only events) — cancelled and draft documents are excluded and reported in warnings.',
      'GST splits: Output CGST/SGST/IGST on sales, Input CGST/SGST/IGST on purchases — replacing the single Output GST ledger.',
      'Format: JSON only — the Tally XML option is decision \u00a717-4, pending the owner.',
    ],
  }
}
