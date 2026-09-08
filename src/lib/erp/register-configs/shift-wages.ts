import type { RegisterConfig } from './types'

/** /hr/shift-wages — SPEC-M55 §2 SW-06 (legacy `FrmProdShiftWagesReg`).
 *  The shift-day wage bill: piece earnings + shift wages (the M55 door) per
 *  shift × date; unattributed entries land in the honest `unassigned`
 *  bucket. Read surface only — the write door is the agent's
 *  post_shift_wages (and piece entries take shiftCode). */
export const shiftWagesConfig: RegisterConfig = {
  slug: 'shift-wages',
  title: 'Shift Wages',
  description: 'Per shift × day wage bill — piece earnings + posted shift wages.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. SO-1001' },
    { key: 'q', label: 'Dept', type: 'text', placeholder: 'dept code' },
  ],
  columns: [
    { name: 'date', label: 'Date', mono: true },
    { name: 'code', label: 'Shift', mono: true },
    { name: 'shift', label: 'Name' },
    { name: 'orders', label: 'Orders', align: 'right', format: 'int' },
    { name: 'operators', label: 'Operators', align: 'right', format: 'int' },
    { name: 'entries', label: 'Entries', align: 'right', format: 'int' },
    { name: 'qty', label: 'Qty (pcs)', align: 'right', format: 'int' },
    { name: 'piece', label: 'Piece wages (₹)', align: 'right', format: 'inr' },
    { name: 'shiftWages', label: 'Shift wages (₹)', align: 'right', format: 'inr' },
    { name: 'bill', label: 'Total bill (₹)', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_shift_wages'],
  askPrompt: 'Show me the shift wages register — wage bill per shift',
  emptyMessage: 'No production entries in this period yet.',
}
