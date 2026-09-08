import type { RegisterConfig } from './types'

/** /accounts/pdc — SPEC-M56 §2 PDC-05 (PAY-08, §17-3 ADR-020, the legacy
 *  post-dated-cheque lens). Cheques in the field: issued + active
 *  cheque-mode payments, aging off the cheque's own date (PDC = post-dated
 *  at issue). Read surface only — the transitions live at the agent's
 *  post_cheque_clear / post_cheque_bounce doors; the voucher itself is the
 *  payment door's. */
export const pdcConfig: RegisterConfig = {
  slug: 'pdc',
  title: 'PDC / Cheques in Hand',
  description: 'Issued cheques not yet cleared or bounced — post-dated or not, aging off the cheque date.',
  filters: [
    { key: 'q', label: 'Party', type: 'text', placeholder: 'party code/name' },
    { key: 'direction', label: 'Direction', type: 'select', options: [
      { value: 'in', label: 'Receipts (from buyers)' },
      { value: 'out', label: 'Payments (to suppliers)' },
    ] },
    { key: 'from', label: 'Cheque date from', type: 'dateRange' },
    { key: 'to', label: 'Cheque date to', type: 'dateRange' },
  ],
  columns: [
    { name: 'voucherNo', label: 'Voucher No', mono: true },
    { name: 'direction', label: 'Dir' },
    { name: 'party', label: 'Party' },
    { name: 'amount', label: 'Amount (₹)', align: 'right', format: 'inr' },
    { name: 'reference', label: 'Cheque No', mono: true },
    { name: 'chequeDate', label: 'Cheque Date', mono: true },
    { name: 'type', label: 'Type' },
    { name: 'due', label: 'Due' },
  ],
  agentTools: ['get_pdc_register'],
  askPrompt: 'Show me the PDC register — cheques in hand',
  emptyMessage: 'No issued cheques outstanding — every cheque cleared or bounced.',
}
