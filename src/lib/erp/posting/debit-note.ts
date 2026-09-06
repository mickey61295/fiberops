/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 15 — create_debit_note service. Logic extracted VERBATIM
// from tools.ts. Writes the DebitNote row + (SPEC-M51 M-02, DE-02) a
// companion journal voucher `JV-{noteNo}` classifying the deduction to the
// chart of accounts: Dr {debitAccount — default Sales [4010]} / Cr the
// party-type control (customer → Sundry Debtors [1110]). voucherType
// 'debit-note' is deliberately OUTSIDE the party-ledger's `['journal']`
// sub-ledger filter — the DebitNote row itself IS the sub-ledger truth (the
// − debit term); counting the companion too would double-subtract. The
// app's debit note is a DEDUCTION from the buyer (the bills-register
// deduction column, the party-ledger − debit term and the outstanding math
// all agree) — the old sideEffects claim 'Party AR increases' was backwards
// and is retired with this batch.

import { db } from '@/lib/db'
import { activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { DebitNoteInput } from '../schemas/debit-note'
import { dateOrIstToday } from '@/lib/erp/dates'
import { resolveAccountByRef, partyControlName, accountLabel, unlinkedAccountError } from '../coa'

export async function planDebitNote(args: DebitNoteInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }

  // SPEC-M51 DE-02 (CA-04) — the note is a journal-writing doc now: both GL
  // legs resolve BEFORE the voucher, a miss is a LOUD refusal (the note is
  // not written either — no half-posted documents).
  const debitRef = args.debitAccount?.trim() || 'Sales'
  const controlName = partyControlName(party.partyType)
  const [debitAccount, controlAccount] = await Promise.all([
    resolveAccountByRef(debitRef),
    resolveAccountByRef(controlName),
  ])
  const missing: string[] = []
  if (!debitAccount) missing.push(debitRef)
  if (!controlAccount) missing.push(controlName)
  if (missing.length) return { ok: false, error: unlinkedAccountError(missing) }

  const finYear = await activeFinYear()
  const resolvedNoteNo = await (async () => {
    const desired = args.noteNo?.trim()
    if (desired) {
      const exists = await db.debitNote.findUnique({ where: { noteNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.debitNote.findMany({ where: { noteNo: { startsWith: 'DN-' } } })
    const used = new Set(all.map((d) => d.noteNo))
    let n = 1
    while (used.has(`DN-${String(n).padStart(4, '0')}`)) n++
    return `DN-${String(n).padStart(4, '0')}`
  })()
  const noteDate = dateOrIstToday(args.date)
  const companionVoucherNo = `JV-${resolvedNoteNo}`
  const companionExists = await db.journal.findUnique({ where: { voucherNo: companionVoucherNo } }).catch(() => null)
  if (companionExists) {
    return { ok: false, error: `Journal ${companionVoucherNo} already exists — debit note ${resolvedNoteNo} has a companion voucher; cancel the note (cancel_debit_note ${resolvedNoteNo}) to reverse both` }
  }

  const journalData = {
    voucherNo: companionVoucherNo,
    voucherType: 'debit-note', // DE-02 — outside the party-ledger ['journal'] filter by design
    partyId: party.id,
    date: noteDate,
    finYear,
    debitAccount: debitAccount!.name,
    creditAccount: party.name, // voucher detail (the sub-ledger party); the FK is the control
    debitAccountId: debitAccount!.id,
    creditAccountId: controlAccount!.id,
    amount: args.amount,
    narration: `Debit note ${resolvedNoteNo} (${args.noteType}) — deduction from ${party.name}${args.reason ? ' — ' + args.reason : ''}`,
  }

  return {
    ok: true,
    text: `Proposed debit note ${resolvedNoteNo} — ₹${args.amount} against ${party.name}.`,
    summary: `Raise debit note ${resolvedNoteNo} | ${args.noteType} | ${party.name} | ₹${args.amount} | reason: ${args.reason || '-'} | GL: Dr ${debitAccount!.name} [${debitAccount!.code}] / Cr ${controlName} [${controlAccount!.code}]`,
    creates: [
      { table: 'debitNote', data: { noteNo: resolvedNoteNo, noteType: args.noteType, partyId: party.id, date: noteDate, finYear, amount: args.amount, reason: args.reason, status: 'raised' } },
      { table: 'journal', data: journalData },
    ],
    sideEffects: [
      `Party outstanding reduces by ₹${args.amount} (a DEDUCTION — the bills register + party ledger net it)`,
      `GL legs classify to Dr ${accountLabel(debitAccount, debitRef)} / Cr ${accountLabel(controlAccount, controlName)} (SPEC-M51 M-02 — the note's GL classification)`,
      'Cancel via cancel_debit_note — the companion flips cancelled + a CN- contra mirrors the legs',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const d = await tx.debitNote.create({ data: { noteNo: resolvedNoteNo, noteType: args.noteType, partyId: party.id, date: noteDate, finYear, amount: args.amount, reason: args.reason, status: 'raised' } })
        // CA-04 discipline — re-resolve INSIDE the tx (a deleted account
        // between plan and commit aborts the whole note, not a half post).
        const [dr, cr] = await Promise.all([resolveAccountByRef(debitRef, tx), resolveAccountByRef(controlName, tx)])
        const missTx: string[] = []
        if (!dr) missTx.push(debitRef)
        if (!cr) missTx.push(controlName)
        if (missTx.length) throw new Error(unlinkedAccountError(missTx))
        const j = await tx.journal.create({
          data: {
            ...journalData,
            debitAccount: dr!.name, creditAccount: party.name,
            debitAccountId: dr!.id, creditAccountId: cr!.id,
          },
        })
        return { id: d.id, noteNo: d.noteNo, journalVoucherNo: j.voucherNo }
      })
    },
  }
}
