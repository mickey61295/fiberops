import type { RegisterConfig } from './types'

/** /accounts/trial-balance — SPEC-M52 M-03 (Module M Batch 3): the trial
 *  balance. One row per account with activity in the window: Dr Σ, Cr Σ, net
 *  + side. The summary ASSERTS Dr == Cr (structural — every journal row
 *  counts, all statuses; the contra IS the GL's reversal). The unlinked total
 *  is the pre-backfill honesty door (0 on seeded dbs). */
export const trialBalanceConfig: RegisterConfig = {
  slug: 'trial-balance',
  title: 'Trial Balance',
  description: 'Per account: debit Σ, credit Σ, net + side, for the window (default all time). Dr == Cr is ASSERTED — every journal row counts (all statuses); unlinked rows (null FK) are reported, never dropped.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
  ],
  columns: [
    { name: 'code', label: 'Code', mono: true },
    { name: 'account', label: 'Account' },
    { name: 'type', label: 'Type' },
    { name: 'dr', label: 'Debit ₹', align: 'right', format: 'inr' },
    { name: 'cr', label: 'Credit ₹', align: 'right', format: 'inr' },
    { name: 'net', label: 'Net ₹', align: 'right', format: 'inr' },
    { name: 'side', label: 'Side', mono: true },
  ],
  agentTools: ['get_trial_balance'],
  askPrompt: 'Show the trial balance — is it balanced?',
  emptyMessage: 'No journal activity yet — post a payment, expense, journal or payroll run first.',
}
