// SPEC-M3 §11 — shared zod schema for the NEW transfer_stock tool (Wave D).
// One item, two godowns, one qty — the service writes the out+in ledger PAIR
// in a single transaction sharing one GT-#### doc number.
import { z } from 'zod'

export const TRANSFER_SCHEMA = z.object({
  docNo: z.string().optional(),
  itemType: z.string().describe('yarn | fabric | accessory'),
  itemCode: z.string(),
  fromGodownCode: z.string(),
  toGodownCode: z.string(),
  qty: z.number().describe('Quantity to transfer (positive number; kgs for yarn/fabric, pcs for accessory)'),
  notes: z.string().optional(),
  transferDate: z.string().optional(),
  // SPEC-M5 §6 (Wave C): when true the commit ALSO leaves a pending
  // godown_transfer Approval row (entityId = the GT-#### docNo) for the
  // receiving unit to acknowledge via /dispatch/unit-transfer-ack.
  requiresAck: z.boolean().optional().describe('Leave a pending unit-transfer approval to acknowledge (default false)'),
})

export type TransferInput = z.infer<typeof TRANSFER_SCHEMA>
