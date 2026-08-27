// SPEC-M3 §8 row 17 — Journal (/accounts/journal, item 'journal', legacy
// FrmJournal). Fields mirror JOURNAL_SCHEMA exactly. GL is out of M3 scope —
// the voucher row is the record.
import type { DocConfig } from './types'
import { JOURNAL_SCHEMA } from '../schemas/journal'
import { planJournal } from '../posting/journal'

export const journalConfig: DocConfig = {
  docType: 'journal',
  slug: 'journal',
  title: 'Journal Voucher',
  numberPrefix: 'V-',
  numberField: 'voucherNo',
  schema: JOURNAL_SCHEMA,
  service: { plan: (input: unknown) => planJournal(input as Parameters<typeof planJournal>[0]) },
  headerFields: [
    { name: 'voucherNo', label: 'Voucher No', type: 'text', colSpan: 1 },
    { name: 'voucherType', label: 'Voucher Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'journal', label: 'Journal' },
      { value: 'receipt', label: 'Receipt' },
      { value: 'payment', label: 'Payment' },
      { value: 'contra', label: 'Contra' },
    ] },
    { name: 'debitAccount', label: 'Debit Account', type: 'text', required: true, colSpan: 1 },
    { name: 'creditAccount', label: 'Credit Account', type: 'text', required: true, colSpan: 1 },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'partyCode', label: 'Party (optional)', type: 'picker', picker: 'party', colSpan: 1 },
    { name: 'date', label: 'Date', type: 'date', colSpan: 1 },
    { name: 'narration', label: 'Narration', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'voucherNo', label: 'Voucher No' },
    { name: 'voucherType', label: 'Type' },
    { name: 'debitAccount', label: 'Debit' },
    { name: 'creditAccount', label: 'Credit' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'date', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_journal'],
}
