// SPEC-M6 §7-C — shared zod schemas for the lifecycle tools (Wave C).
import { z } from 'zod'

export const CLOSE_ORDER_SCHEMA = z.object({
  orderNo: z.string().describe('Order no like SO-1001'),
  force: z.boolean().optional().describe('Override the 95%-despatched + invoice-exists guards'),
  notes: z.string().optional().describe('Closing note (appended to order notes)'),
})

export const CANCEL_PROGRAM_SCHEMA = z.object({
  programNo: z.string().describe('Program no like PGM-1001'),
  force: z.boolean().optional().describe('Override the ledger net-zero guard'),
  notes: z.string().optional(),
})

export const COMPLETE_PROGRAM_SCHEMA = z.object({
  programNo: z.string().describe('Program no like PGM-1001'),
  force: z.boolean().optional().describe('Override the balance<=0 guard'),
  notes: z.string().optional(),
})

export const PO_LIFECYCLE_SCHEMA = z.object({
  poNo: z.string().describe('PO no like PO-1001'),
  action: z.enum(['cancel', 'complete']).describe('cancel (no receipts allowed) or complete (receipts required)'),
  reason: z.string().optional(),
})

export const ORDER_AMEND_SCHEMA = z.object({
  orderNo: z.string(),
  deliveryDate: z.string().optional(),
  status: z.string().optional().describe('open | in_progress | completed | cancelled'),
  notes: z.string().optional(),
  totalPcs: z.number().optional().describe('Amended order qty (history = updatedAt + notes)'),
})

// ───────────── SPEC-M41 (Phase-6B Batch 5, PRC) — procurement & dispatch ─────────────

export const PO_LINE_AMEND_SCHEMA = z.object({
  itemType: z.enum(['yarn', 'fabric', 'accessory']).describe('The PO line to amend (matched by itemType+itemCode)'),
  itemCode: z.string().describe('Item code as written on the PO line'),
  qty: z.number().positive().optional().describe('Amended qty (refused if below the already-received qty)'),
  rate: z.number().optional().describe('Amended rate (₹)'),
})

export const PO_AMEND_SCHEMA = z.object({
  poNo: z.string().describe('PO no like PO-Y-001'),
  deliveryDate: z.string().optional().describe('Amended delivery date'),
  status: z.string().optional().describe('open | partial | received (cancelled/completed refused here — use the lifecycle door)'),
  notes: z.string().optional().describe('Amendment reason — appended to the PO notes trail'),
  lines: z.array(PO_LINE_AMEND_SCHEMA).optional().describe('Line revisions: qty and/or rate per PO line (itemType+itemCode addressing)'),
})

export const DC_TRANSITION_SCHEMA = z.object({
  dcNo: z.string().describe('DC no like DC-0001 or LAD-0001'),
  to: z.enum(['despatched', 'delivered']).describe('despatched = LAD conversion (loading → shipped); delivered = the buyer-side terminal state'),
  date: z.string().optional().describe('Transition date (default today; stamps deliveredAt when delivered)'),
  notes: z.string().optional().describe('Transition note (appended to nothing — audit log carries it)'),
})

export const GATE_CLEAR_SCHEMA = z.object({
  entryNo: z.string().describe('Gate entry/pass no like GE-0001 / GP-0001'),
  notes: z.string().optional().describe('Clearing note'),
})
