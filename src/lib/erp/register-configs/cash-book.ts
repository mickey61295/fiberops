import type { RegisterConfig } from './types'

/** /accounts/cash-book — SPEC-M52 M-03 (Module M Batch 3): the cash-family
 *  day-book with opening/closing + running balance. The family = the 1010
 *  Cash/Bank control + its per-bank GL children (CoA topology, not prefix
 *  guessing); `variant` narrows to one family account. Counter-book mode
 *  groups by day with the in−out running balance. Cancels net via their
 *  CN- contras (every row counts). */
export const cashBookConfig: RegisterConfig = {
  slug: 'cash-book',
  title: 'Cash Book',
  description: 'The cash & bank family (1010 + per-bank accounts): opening balance, inflow/outflow per voucher (the other account as particulars), running balance, closing. Cancels net via their contras.',
  filters: [
    { key: 'variant', label: 'Account', type: 'text', placeholder: '1010 or a bank code (blank = whole family)' },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
  ],
  columns: [
    { name: 'date', label: 'Date', format: 'date' },
    { name: 'voucher', label: 'Voucher', mono: true },
    { name: 'particulars', label: 'Particulars' },
    { name: 'inflow', label: 'In ₹', align: 'right', format: 'inr' },
    { name: 'outflow', label: 'Out ₹', align: 'right', format: 'inr' },
    { name: 'balance', label: 'Balance ₹', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['get_cash_book'],
  askPrompt: 'Show the cash book with opening and closing balance',
  emptyMessage: 'No cash/bank movement in this window — the family is the 1010 control + the bank accounts under it.',
  counterBook: {
    groupBy: 'date',
    balancePairs: [{ in: 'inflow', out: 'outflow', label: 'Balance' }],
  },
}
