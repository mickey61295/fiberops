// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_debit_note.
import { z } from 'zod'

export const DEBIT_NOTE_SCHEMA = z.object({
  noteNo: z.string().optional(),
  noteType: z.string(),
  partyCode: z.string(),
  amount: z.number(),
  reason: z.string().optional(),
  date: z.string().optional(),
})

export type DebitNoteInput = z.infer<typeof DEBIT_NOTE_SCHEMA>
