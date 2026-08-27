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
