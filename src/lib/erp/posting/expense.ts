/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-31 — create_expense service. Expense row (ADR-015) — EXP-####
// auto docNo. category='stylewise' requires orderNo; partyCode is the
// paid-to party. Document-only — the expense book feeds /costing/expenses
// (and budget-vs-actual reads CostSheet, NOT Expense — expenses are the
// cash-side book).
//
// SPEC-M51 M-02 (DE-03) — the GL legs: the commit ALSO writes a companion
// journal `JV-{expNo}` classifying the expense: Dr the glAccount (default:
// transport → Freight [5020], else Other Expenses [5120]) / Cr Sundry
// Creditors [2100] when a paid-to party is given (a real payable —
// voucherType 'journal' + partyId, the wage-bill class, so the party ledger
// sees it and record_payment out settles it to 0) / Cr Cash/Bank [1010]
// otherwise (paid at record, partyId null — invisible to the sub-ledger by
// construction). The expense book + daily P&L keep reading the Expense rows
// directly (the cash-side story is unchanged).
//
// SPEC-M54 M-05 (EH-02) — THE HEAD REFINES, NEVER BLOCKS: `head` (an
// ExpenseHead name or code) sets category + the default GL debit leg; leg
// precedence: explicit glAccount > head.glAccount (when resolvable) > the
// M51 category default. A stale head.glAccount falls back to the category
// default + an honest note (the BankAccount.glAccountCode pattern); an
// unknown head is a LOUD refusal (an explicit reference); the category-only
// path stays byte-identical (M51 back-compat). Expense.headId stored
// (relation-less, PITFALLS #21 — the pages resolve via id-map).

import { db } from '@/lib/db'
import { activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { ExpenseInput } from '../schemas/expense'
import { dateOrIstToday } from '@/lib/erp/dates'
import { resolveAccountByRef, partyControlName, accountLabel, unlinkedAccountError } from '../coa'

const CATEGORIES = ['fixed', 'stylewise', 'general', 'transport', 'other']
const STATUSES = ['recorded', 'settled']

/** DE-03 — the default GL debit leg per category (SPEC-M54 M-05: the
 *  expense-head master REFINES this into per-head accounts — the head's
 *  glAccount wins over this default, an explicit glAccount beats both). */
export function defaultExpenseAccount(category: string): string {
  return category === 'transport' ? 'Freight' : 'Other Expenses'
}

export async function planExpense(args: ExpenseInput): Promise<DocPlanResult> {
  const finYear = args.finYear?.trim() || await activeFinYear()

  // SPEC-M54 M-05 (EH-02) — resolve the head FIRST: it sets category + the
  // default debit leg. Unknown head = LOUD refusal (an explicit reference —
  // no row, no voucher number burned); inactive = the reactivation hint
  // (the account-master pattern). Code first, then name (both unique).
  let headRow: { id: string; code: string; name: string; category: string; glAccount: string | null; active: boolean } | null = null
  const notes: string[] = []
  if (args.head?.trim()) {
    const ref = args.head.trim()
    headRow = (await db.expenseHead.findUnique({ where: { code: ref } }).catch(() => null))
      ?? (await db.expenseHead.findUnique({ where: { name: ref } }).catch(() => null))
    if (!headRow) {
      return {
        ok: false,
        error: `Expense head '${ref}' not found — create it first (create_expense_head, or /masters/expense-head; list_expense_heads shows the heads), or pass a category directly (fixed | stylewise | general | transport | other)`,
      }
    }
    if (!headRow.active) {
      return {
        ok: false,
        error: `Expense head '${headRow.name}' [${headRow.code}] is inactive — reactivate it (update_expense_head with active: true, or /masters/expense-head), or pass a category directly`,
      }
    }
  }

  // The head WINS over a directly-passed category (overridden + noted).
  const category = headRow ? headRow.category : args.category
  if (!category) {
    return { ok: false, error: 'category is required when no head is given (fixed | stylewise | general | transport | other), or pass a head name/code' }
  }
  if (!CATEGORIES.includes(category)) {
    return { ok: false, error: `category must be one of ${CATEGORIES.join(' | ')} (got '${category}')` }
  }
  if (headRow && args.category && args.category !== headRow.category) {
    notes.push(`head ${headRow.name} sets category '${headRow.category}' — the passed '${args.category}' is overridden`)
  }
  const status = args.status?.trim() || 'recorded'
  if (!STATUSES.includes(status)) {
    return { ok: false, error: `status must be recorded | settled (got '${args.status}')` }
  }

  let orderId: string | undefined
  if (args.orderNo?.trim()) {
    const o = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
    if (!o) return { ok: false, error: `Order ${args.orderNo} not found` }
    orderId = o.id
  }
  if (category === 'stylewise' && !orderId) {
    return { ok: false, error: 'A stylewise expense needs an orderNo' }
  }
  let partyId: string | undefined
  let partyName: string | undefined
  if (args.partyCode?.trim()) {
    const p = await db.party.findUnique({ where: { code: args.partyCode.trim() } })
    if (!p) return { ok: false, error: `Party ${args.partyCode} not found` }
    partyId = p.id
    partyName = p.name
  }

  // SPEC-M51 DE-03 (CA-04) — the GL legs resolve BEFORE the voucher; a miss
  // is a LOUD refusal (the expense row is not written either).
  // SPEC-M54 M-05 (EH-02) — THE LEG PRECEDENCE: explicit glAccount > the
  // head's glAccount (when resolvable) > the M51 category default. A stale
  // head.glAccount falls back to the category default + the honest note
  // (never a refusal — THE HEAD REFINES, NEVER BLOCKS).
  let debitRef = args.glAccount?.trim() || ''
  let debitVia: 'explicit' | 'head' | 'category' = debitRef ? 'explicit' : 'category'
  if (!debitRef && headRow?.glAccount?.trim()) {
    const pref = headRow.glAccount.trim()
    const resolvable = await resolveAccountByRef(pref)
    if (resolvable) {
      debitRef = pref
      debitVia = 'head'
    } else {
      notes.push(`head ${headRow.name} glAccount '${pref}' is not in the chart — falling back to the category default (${defaultExpenseAccount(category)})`)
    }
  }
  if (!debitRef) debitRef = defaultExpenseAccount(category)
  const creditRef = partyId ? partyControlName('supplier') : 'Cash/Bank'
  const [debitAccount, creditAccount] = await Promise.all([resolveAccountByRef(debitRef), resolveAccountByRef(creditRef)])
  const missing: string[] = []
  if (!debitAccount) missing.push(debitRef)
  if (!creditAccount) missing.push(creditRef)
  if (missing.length) return { ok: false, error: unlinkedAccountError(missing) }

  const resolvedNo = await (async () => {
    const desired = args.expNo?.trim()
    if (desired) {
      const exists = await db.expense.findUnique({ where: { expNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.expense.findMany({ where: { expNo: { startsWith: 'EXP-' } } })
    const used = new Set(all.map((e) => e.expNo))
    let n = 1
    while (used.has(`EXP-${String(n).padStart(4, '0')}`)) n++
    return `EXP-${String(n).padStart(4, '0')}`
  })()
  const companionVoucherNo = `JV-${resolvedNo}`
  const companionExists = await db.journal.findUnique({ where: { voucherNo: companionVoucherNo } }).catch(() => null)
  if (companionExists) {
    return { ok: false, error: `Journal ${companionVoucherNo} already exists — expense ${resolvedNo} has a companion voucher; cancel the expense (cancel_expense ${resolvedNo}) to reverse both` }
  }

  const expDate = dateOrIstToday(args.expDate)
  const journalData = {
    voucherNo: companionVoucherNo,
    voucherType: 'journal', // DE-03 — the wage-bill class: a party payable counts in the party ledger's − journals term
    partyId: partyId ?? null,
    date: expDate,
    finYear,
    debitAccount: debitAccount!.name,
    // the party leg's STRING is the voucher detail (WHO we owe — the partyId
    // carries the sub-ledger; the FK classifies to the control), matching the
    // payment/debit-note doors; the cash case names the GL leg itself.
    creditAccount: partyId ? partyName! : 'Cash/Bank',
    debitAccountId: debitAccount!.id,
    creditAccountId: creditAccount!.id,
    amount: args.amount,
    narration: `Expense ${resolvedNo} (${category}${headRow ? ` · ${headRow.name}` : ''})${args.narration ? ' — ' + args.narration : ''}`,
  }

  const notesSuffix = notes.length ? ` ${notes.join('; ')}` : ''
  return {
    ok: true,
    text: `Proposed expense ${resolvedNo} — ₹${args.amount} (${category}${headRow ? ` · head ${headRow.name}` : ''}).${notesSuffix}`,
    summary: `Record expense ${resolvedNo} | ${category}${headRow ? ` · head ${headRow.name} [${headRow.code}]` : ''} | ₹${args.amount}${orderId ? ` | order ${args.orderNo}` : ''}${partyId ? ` | party ${args.partyCode}` : ''} | GL: Dr ${debitAccount!.name} [${debitAccount!.code}]${debitVia === 'head' ? ' (from the head)' : debitVia === 'explicit' ? ' (explicit)' : ''} / Cr ${creditAccount!.name} [${creditAccount!.code}]`,
    creates: [
      { table: 'expense', data: { expNo: resolvedNo, finYear, category, orderId, partyId, headId: headRow?.id ?? null, amount: args.amount, narration: args.narration, status } },
      { table: 'journal', data: journalData },
    ],
    sideEffects: [
      'Expense appears in the expense book (/costing/expenses) + the daily P&L expenses leg (reads the Expense row)',
      `GL legs classify to Dr ${accountLabel(debitAccount, debitRef)} / Cr ${accountLabel(creditAccount, creditRef)} (SPEC-M51 M-02${debitVia === 'head' ? '; the head\'s account' : debitVia === 'explicit' ? '; explicit override' : ''})`,
      ...(headRow ? [`Booked under head ${headRow.name} [${headRow.code}] — category '${category}'${headRow.glAccount ? `, default leg '${headRow.glAccount}'` : ', category default leg'}`] : []),
      ...(orderId ? ['Counts in budget-vs-actual for the order (SPEC-M54 M-05 — the expense addend)'] : []),
      ...(partyId
        ? ['Paid-to party payable shows in the party ledger — settle with record_payment (out) to the party; the balance nets to 0']
        : ['Paid at record — no party payable (cash/bank leg)']),
      ...(notes.length ? [notes.join('; ')] : []),
      'Cancel via cancel_expense — the companion flips cancelled + a CN- contra mirrors the legs',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const e = await tx.expense.create({
          data: {
            expNo: resolvedNo,
            expDate,
            finYear, category, orderId, partyId, headId: headRow?.id ?? null,
            amount: args.amount, narration: args.narration, status,
          },
        })
        // CA-04 discipline — re-resolve INSIDE the tx.
        const [dr, cr] = await Promise.all([resolveAccountByRef(debitRef, tx), resolveAccountByRef(creditRef, tx)])
        const missTx: string[] = []
        if (!dr) missTx.push(debitRef)
        if (!cr) missTx.push(creditRef)
        if (missTx.length) throw new Error(unlinkedAccountError(missTx))
        const j = await tx.journal.create({
          data: {
            ...journalData,
            debitAccount: dr!.name,
            debitAccountId: dr!.id,
            creditAccountId: cr!.id,
          },
        })
        return { id: e.id, expNo: e.expNo, amount: e.amount, journalVoucherNo: j.voucherNo }
      })
    },
  }
}
