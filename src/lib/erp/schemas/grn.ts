// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts receive_grn.
// SPEC-M41 PRC-01 — the multi-line door: `lines` (array of {itemType,
// itemCode, qty, rate?}) addresses PO lines by item code (the operator /
// agent language — poLineId cuids are invisible to both doors); each line
// increments its PO line's receivedQty and posts its own ledger row. The
// legacy header `receivedQty` path stays for single-line POs.
import { z } from 'zod'

export const GRN_LINE_INPUT = z.object({
  itemType: z.enum(['yarn', 'fabric', 'accessory']).describe('PO line item type'),
  itemCode: z.string().describe('Item code as written on the PO line'),
  qty: z.number().positive().describe('Qty received for this line (uses PO rate unless rate given)'),
  rate: z.number().optional().describe('Override rate (default: the PO line rate)'),
})

export const GRN_SCHEMA = z.object({
  grnNo: z.string().optional(),
  poNo: z.string(),
  godownCode: z.string(),
  partyDcRef: z.string().optional(),
  deptCode: z.string().optional(),
  receivedQty: z.number().optional().describe('Single-line legacy path: qty received (uses PO rate). For multi-line POs use lines[].'),
  lines: z.array(GRN_LINE_INPUT).optional().describe('Multi-line door (PRC-01): one entry per PO line being received, addressed by itemType+itemCode'),
  grnDate: z.string().optional(),
  // SPEC-M5 §6 (Wave C): when true the commit ALSO leaves a pending reprocess
  // Approval (entityId = the GRN id) — defective material routed to rework,
  // approved at /quality/reprocess-approval (approve_reprocess).
  reprocess: z.boolean().optional().describe('Flag this GRN as needing reprocess approval (default false)'),
})

export type GrnInput = z.infer<typeof GRN_SCHEMA>
export type GrnLineInput = z.infer<typeof GRN_LINE_INPUT>
