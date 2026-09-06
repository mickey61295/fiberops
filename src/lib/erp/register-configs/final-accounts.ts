import type { RegisterConfig } from './types'

/** /accounts/final-accounts — SPEC-M52 M-03 (Module M Batch 3): the minimal
 *  P&L + balance sheet on the accountActivity math (the trial balance's own
 *  derivation — they must agree). variant pl = income − expenses → NET;
 *  variant bs = assets vs liabilities + equity + the P&L net as retained
 *  earnings — Δ asserted 0 (structural from Dr == Cr). */
export const finalAccountsConfig: RegisterConfig = {
  slug: 'final-accounts',
  title: 'Final Accounts',
  description: 'P&L (variant: P&L) — income − expenses = net profit/loss; Balance sheet (variant: Balance sheet) — assets vs liabilities + equity + the window\'s P&L as retained earnings, Δ asserted 0 (structural). Same window semantics as the trial balance.',
  filters: [
    { key: 'variant', label: 'Statement', type: 'select', options: [
      { value: 'pl', label: 'P&L' }, { value: 'bs', label: 'Balance sheet' },
    ] },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
  ],
  columns: [
    { name: 'code', label: 'Code', mono: true },
    { name: 'account', label: 'Account' },
    { name: 'head', label: 'Head' },
    { name: 'amount', label: 'Amount ₹', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_final_accounts'],
  askPrompt: 'Show the P&L for this year',
  emptyMessage: 'No income/expense (or asset/liability) activity yet — the statements list balances, not the chart.',
}
