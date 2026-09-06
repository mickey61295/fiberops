// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_debit_note.
// SPEC-M51 M-02 (DE-02): debitAccount added — the GL debit leg (the credit
// side is always the party-type control). Default 'Sales' [4010]: the app's
// debit note is a DEDUCTION from the buyer (all three money screens net it),
// so the companion journal reads Dr Sales / Cr Sundry Debtors.
import { z } from 'zod'

export const DEBIT_NOTE_SCHEMA = z.object({
  noteNo: z.string().optional(),
  noteType: z.string(),
  partyCode: z.string(),
  amount: z.number(),
  reason: z.string().optional(),
  date: z.string().optional(),
  debitAccount: z.string().optional().describe('GL debit leg — exact Account name or code (default Sales [4010]; the credit side is the party-type control, e.g. Sundry Debtors)'),
})

export type DebitNoteInput = z.infer<typeof DEBIT_NOTE_SCHEMA>
