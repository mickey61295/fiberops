// SPEC-M41 PRC-03 — purchase return (PRN-) schemas. The service lives at
// posting/purchase-return.ts; lines address GRN lines by itemType+itemCode
// (the operator/agent language — the PRC-01 convention).
import { z } from 'zod'

export const PURCHASE_RETURN_LINE_SCHEMA = z.object({
  itemType: z.enum(['yarn', 'fabric', 'accessory']).describe('The GRN line to return (matched by itemType+itemCode)'),
  itemCode: z.string().describe('Item code as written on the GRN line'),
  qty: z.number().positive().describe('Qty to return (≤ received − already-rejected/returned on the line)'),
  rate: z.number().optional().describe('Return rate (default: the GRN line rate)'),
})

export const PURCHASE_RETURN_SCHEMA = z.object({
  grnNo: z.string().describe('The purchase GRN being returned against (GRN-####)'),
  godownCode: z.string().optional().describe("Godown the goods leave from (default: the GRN's own godown)"),
  prnNo: z.string().optional().describe('PRN no (auto-assigned PRN-#### when omitted)'),
  prnDate: z.string().optional(),
  notes: z.string().optional(),
  debitNote: z.boolean().optional().describe('Also raise a linked DebitNote for the return value (ties PAY-03 — default false)'),
  lines: z.array(PURCHASE_RETURN_LINE_SCHEMA).min(1).describe('Lines to return, addressed by itemType+itemCode'),
})

export type PurchaseReturnInput = z.infer<typeof PURCHASE_RETURN_SCHEMA>
export type PurchaseReturnLineInput = z.infer<typeof PURCHASE_RETURN_LINE_SCHEMA>
