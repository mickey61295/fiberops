import type { RegisterConfig } from './types'

/** /accounts/party-ledger — SPEC-M4 §7 row 14 (FrmPartyBalanceRegister). */
export const partyLedgerConfig: RegisterConfig = {
  slug: 'party-ledger',
  title: 'Party Ledger',
  description: 'Party-wise ledger: billed, debit notes, journals, receipts/payments, balance.',
  filters: [
    { key: 'party', label: 'Party', type: 'party', placeholder: 'code or name' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'party name' },
  ],
  columns: [
    { name: 'code', label: 'Code', mono: true },
    { name: 'party', label: 'Party' },
    { name: 'opening', label: 'Opening', align: 'right', format: 'inr' },
    { name: 'billed', label: 'Billed', align: 'right', format: 'inr' },
    { name: 'debit', label: 'Debit notes', align: 'right', format: 'inr' },
    { name: 'journals', label: 'Journals', align: 'right', format: 'inr' },
    { name: 'received', label: 'Received', align: 'right', format: 'inr' },
    { name: 'paid', label: 'Paid', align: 'right', format: 'inr' },
    { name: 'balance', label: 'Balance', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_party_ledger'],
  askPrompt: 'Show me a party ledger with balances',
  emptyMessage: 'No ledger activity yet.',
}
