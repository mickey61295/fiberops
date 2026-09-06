import type { RegisterConfig } from './types'

/** /accounts/day-book — SPEC-M52 M-03 (Module M Batch 3): the chronological
 *  GL voucher register — every journal row, every voucherType, every status
 *  (the GL doctrine: a cancelled voucher + its CN- contra are both visible,
 *  the net honest). Dr/Cr columns carry the resolved CoA 'Name [code]';
 *  null-FK legs render UNLINKED (the honesty door). */
export const dayBookConfig: RegisterConfig = {
  slug: 'day-book',
  title: 'Day Book',
  description: 'Every journal voucher in date order — Dr account [code] / Cr account [code], party, amount, narration, status. All statuses: a cancelled voucher and its CN- contra sit together and net. Type filter + search on voucher/narration/account.',
  filters: [
    { key: 'variant', label: 'Type', type: 'select', options: [
      { value: 'all', label: 'All' }, { value: 'receipt', label: 'Receipts' }, { value: 'payment', label: 'Payments' },
      { value: 'journal', label: 'Journals' }, { value: 'contra', label: 'Contras' }, { value: 'debit-note', label: 'Debit notes' },
    ] },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'voucher / narration / account' },
  ],
  columns: [
    { name: 'date', label: 'Date', format: 'date' },
    { name: 'voucher', label: 'Voucher', mono: true },
    { name: 'type', label: 'Type' },
    { name: 'dr', label: 'Dr account' },
    { name: 'cr', label: 'Cr account' },
    { name: 'party', label: 'Party' },
    { name: 'amount', label: 'Amount ₹', align: 'right', format: 'inr' },
    { name: 'narration', label: 'Narration' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['get_day_book'],
  askPrompt: 'Show the day book for this month',
  emptyMessage: 'No journal vouchers match — the books are empty for this window/type.',
}
