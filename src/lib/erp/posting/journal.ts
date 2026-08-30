/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 16 — create_journal service. Logic extracted VERBATIM from
// tools.ts. No ledger effect (GL is out of M3 scope).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { JournalInput } from '../schemas/journal'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planJournal(args: JournalInput): Promise<DocPlanResult> {
  let party: any = null
  if (args.partyCode) {
    party = await db.party.findUnique({ where: { code: args.partyCode } })
    if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  }
  const finYear = '26-27'
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
    text: `Proposed ${args.voucherType} voucher ${resolvedVoucherNo} — Dr ${args.debitAccount} / Cr ${args.creditAccount} ₹${args.amount}.`,
    summary: `Post ${args.voucherType} voucher ${resolvedVoucherNo} | Dr ${args.debitAccount} | Cr ${args.creditAccount} | ₹${args.amount} | party ${party?.name || '-'} | narration: ${args.narration || '-'}`,
    creates: [{ table: 'journal', data: { voucherNo: resolvedVoucherNo, voucherType: args.voucherType, partyId: party?.id, date: dateOrIstToday(args.date), finYear, debitAccount: args.debitAccount, creditAccount: args.creditAccount, amount: args.amount, narration: args.narration } }],
    // HFX-08 (Phase-6B Batch 0) — sideEffects honest: only TRUE claims. The
    // journal write itself creates the voucher; a party-linked voucher shows
    // in the party ledger (totalJournal). NOTHING updates a cash/bank balance
    // (no GL exists) — the old "Cash/bank balance updated" claim was false.
    sideEffects: party ? ['Party ledger reflects this voucher'] : [],
    async commit() {
      const j = await db.journal.create({ data: { voucherNo: resolvedVoucherNo, voucherType: args.voucherType, partyId: party?.id, date: dateOrIstToday(args.date), finYear, debitAccount: args.debitAccount, creditAccount: args.creditAccount, amount: args.amount, narration: args.narration } })
      return { id: j.id, voucherNo: j.voucherNo }
    },
  }
}
