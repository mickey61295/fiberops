// SPEC-M3 §8 row 15 — Debit Note (/accounts/debit-note, item 'debit-note',
// legacy DebitNotePcs/Fab/Yarn, FrmDebitNote, FrmDirectDebitNote). Fields
// mirror DEBIT_NOTE_SCHEMA exactly. Not a chain stage (post-chain accounts op).
import type { DocConfig } from './types'
import { DEBIT_NOTE_SCHEMA } from '../schemas/debit-note'
import { planDebitNote } from '../posting/debit-note'

export const debitNoteConfig: DocConfig = {
  docType: 'debit-note',
  slug: 'debit-note',
  title: 'Debit Note',
  numberPrefix: 'DN-',
  numberField: 'noteNo',
  schema: DEBIT_NOTE_SCHEMA,
  service: { plan: (input: unknown) => planDebitNote(input as Parameters<typeof planDebitNote>[0]) },
  headerFields: [
    { name: 'noteNo', label: 'Note No', type: 'text', colSpan: 1 },
    { name: 'noteType', label: 'Note Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'acc', label: 'Accessory' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'yarn', label: 'Yarn' },
      { value: 'pcs', label: 'Pieces' },
      { value: 'comm', label: 'Commercial' },
    ] },
    { name: 'partyCode', label: 'Party', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
    // SPEC-M51 M-02 (DE-02) — the GL debit leg; the credit side is the
    // party-type control. Default Sales [4010] (a material deduction).
    { name: 'debitAccount', label: 'GL Debit Account', type: 'text', colSpan: 1, description: 'Optional — exact Account name or code (default Sales [4010]); the credit leg is the party control (Sundry Debtors for customers)' },
    { name: 'date', label: 'Date', type: 'date', colSpan: 1 },
    { name: 'reason', label: 'Reason', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'noteNo', label: 'Note No' },
    { name: 'noteType', label: 'Type' },
    { name: 'partyName', label: 'Party' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'date', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_debit_note'],
}
