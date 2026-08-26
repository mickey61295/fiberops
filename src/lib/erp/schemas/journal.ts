// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_journal.
import { z } from 'zod'

export const JOURNAL_SCHEMA = z.object({
  voucherNo: z.string().optional(),
  voucherType: z.string(),
  debitAccount: z.string(),
  creditAccount: z.string(),
  amount: z.number(),
  partyCode: z.string().optional(),
  narration: z.string().optional(),
  date: z.string().optional(),
})

export type JournalInput = z.infer<typeof JOURNAL_SCHEMA>
