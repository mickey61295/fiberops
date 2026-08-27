// SPEC-M5 §7-D-34 — shared zod schema for the split_roll tool / the Roll
// Tracking DocScreen (/inventory/rolls). Rolls ≡ Lots (the §7-D-34
// convention — a roll IS a lot row in this schema). Splits mtrs OUT of the
// source lot's fabric stock INTO a new lot: RSP-#### docNo, transfer_out +
// transfer_in ledger pair in ONE transaction (stock-adjustment twin).
import { z } from 'zod'

export const ROLL_SPLIT_SCHEMA = z.object({
  docNo: z.string().optional().describe('RSP-#### auto-assigned when omitted or colliding'),
  sourceLotNo: z.string().describe('Lot no of the roll being split'),
  itemCode: z.string().describe('Fabric code held in the lot'),
  godownCode: z.string().describe('Godown the roll lives in'),
  mtrs: z.number().positive().describe('Meters to split into the new roll'),
  newLotNo: z.string().optional().describe('New lot no (auto LT-split-<n> when omitted)'),
  splitDate: z.string().optional().describe('ISO date (default today)'),
  notes: z.string().optional(),
})

export type RollSplitInput = z.infer<typeof ROLL_SPLIT_SCHEMA>
