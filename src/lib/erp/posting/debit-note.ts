/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 15 — create_debit_note service. Logic extracted VERBATIM
// from tools.ts. No ledger effect (party AR is derived).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { DebitNoteInput } from '../schemas/debit-note'

export async function planDebitNote(args: DebitNoteInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const finYear = '26-27'
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
  return {
    ok: true,
    text: `Proposed debit note ${resolvedNoteNo} — ₹${args.amount} against ${party.name}.`,
    summary: `Raise debit note ${resolvedNoteNo} | ${args.noteType} | ${party.name} | ₹${args.amount} | reason: ${args.reason || '-'}`,
    creates: [{ table: 'debitNote', data: { noteNo: resolvedNoteNo, noteType: args.noteType, partyId: party.id, date: args.date ? new Date(args.date) : new Date(), finYear, amount: args.amount, reason: args.reason, status: 'raised' } }],
    sideEffects: ['Party AR increases by ₹' + args.amount],
    async commit() {
      const d = await db.debitNote.create({ data: { noteNo: resolvedNoteNo, noteType: args.noteType, partyId: party.id, date: args.date ? new Date(args.date) : new Date(), finYear, amount: args.amount, reason: args.reason, status: 'raised' } })
      return { id: d.id, noteNo: d.noteNo }
    },
  }
}
