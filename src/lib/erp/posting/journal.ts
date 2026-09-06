/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 16 — create_journal service. Logic extracted VERBATIM from
// tools.ts. No ledger effect (GL is out of M3 scope).
//
// SPEC-M50 M-01 (CA-04) — a journal cannot save an UNLINKED account: both
// legs resolve against the chart of accounts (exact name OR exact code) at
// plan AND at commit (the same resolution — they must agree); an unknown
// leg is a LOUD refusal naming create_account/list_accounts. The free
// strings stay on the row (voucher detail/audit); debitAccountId /
// creditAccountId are the GL classification.

import { db } from '@/lib/db'
import { activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { JournalInput } from '../schemas/journal'
import { resolveAccountPair, unlinkedAccountError, accountLabel } from '../coa'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planJournal(args: JournalInput): Promise<DocPlanResult> {
  // CA-04 — resolve BEFORE anything else: an unknown account never gets a
  // voucher number, a plan text, or a row.
  const { debit, credit, missing } = await resolveAccountPair(args.debitAccount, args.creditAccount)
  if (missing.length) return { ok: false, error: unlinkedAccountError(missing) }

  let party: any = null
  if (args.partyCode) {
    party = await db.party.findUnique({ where: { code: args.partyCode } })
    if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  }
  const finYear = await activeFinYear()
  const resolvedVoucherNo = await (async () => {
    const desired = args.voucherNo?.trim()
    if (desired) {
      const exists = await db.journal.findUnique({ where: { voucherNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.journal.findMany({ where: { voucherNo: { startsWith: 'V-' } } })
    const used = new Set(all.map((j) => j.voucherNo))
    let n = 1
    while (used.has(`V-${String(n).padStart(4, '0')}`)) n++
    return `V-${String(n).padStart(4, '0')}`
  })()
  return {
    ok: true,
    text: `Proposed ${args.voucherType} voucher ${resolvedVoucherNo} — Dr ${accountLabel(debit, args.debitAccount)} / Cr ${accountLabel(credit, args.creditAccount)} ₹${args.amount}.`,
    summary: `Post ${args.voucherType} voucher ${resolvedVoucherNo} | Dr ${accountLabel(debit, args.debitAccount)} | Cr ${accountLabel(credit, args.creditAccount)} | ₹${args.amount} | party ${party?.name || '-'} | narration: ${args.narration || '-'}`,
    creates: [{ table: 'journal', data: { voucherNo: resolvedVoucherNo, voucherType: args.voucherType, partyId: party?.id, date: dateOrIstToday(args.date), finYear, debitAccount: args.debitAccount, creditAccount: args.creditAccount, debitAccountId: debit!.id, creditAccountId: credit!.id, amount: args.amount, narration: args.narration } }],
    // HFX-08 (Phase-6B Batch 0) — sideEffects honest: only TRUE claims. The
    // journal write itself creates the voucher; a party-linked voucher shows
    // in the party ledger (totalJournal). NOTHING updates a cash/bank balance
    // (no GL exists) — the old "Cash/bank balance updated" claim was false.
    sideEffects: [
      ...(party ? ['Party ledger reflects this voucher'] : []),
      `GL legs classify to ${debit!.code} / ${credit!.code} (the chart of accounts — SPEC-M50)`,
    ],
    async commit() {
      // CA-04 — re-resolve in-commit (the same derivation the plan used);
      // a deleted account between plan and commit refuses, never saves unlinked.
      const now = await resolveAccountPair(args.debitAccount, args.creditAccount)
      if (now.missing.length) throw new Error(unlinkedAccountError(now.missing))
      const j = await db.journal.create({ data: { voucherNo: resolvedVoucherNo, voucherType: args.voucherType, partyId: party?.id, date: dateOrIstToday(args.date), finYear, debitAccount: args.debitAccount, creditAccount: args.creditAccount, debitAccountId: now.debit!.id, creditAccountId: now.credit!.id, amount: args.amount, narration: args.narration } })
      return { id: j.id, voucherNo: j.voucherNo }
    },
  }
}
