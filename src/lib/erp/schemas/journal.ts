// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_journal.
// SPEC-M50 M-01 — the account fields resolve against the chart of accounts
// by EXACT name OR exact code (e.g. 'Production Wages' or '5010'); unknown
// legs are REFUSED with a create_account hint — a journal never saves
// unlinked. The stored strings stay as the voucher's detail text.
import { z } from 'zod'

export const JOURNAL_SCHEMA = z.object({
  voucherNo: z.string().optional(),
  voucherType: z.string(),
  debitAccount: z.string().describe('Debit account — exact CoA name or code (e.g. "Production Wages" / "5010"); unknown legs are refused (create_account first)'),
  creditAccount: z.string().describe('Credit account — exact CoA name or code (e.g. "Wage Payable" / "2200"); unknown legs are refused (create_account first)'),
  amount: z.number(),
  partyCode: z.string().optional(),
  narration: z.string().optional(),
  date: z.string().optional(),
})

export type JournalInput = z.infer<typeof JOURNAL_SCHEMA>
