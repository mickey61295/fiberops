// SPEC-M6 §7-D-1 (Wave D) — the transfer-family VARIANT schemas.
// planTransfer + TRANSFER_SCHEMA stay VERBATIM (§4 rule 1); two §4 rule-2
// siblings serve the Wave D screens:
//   pcs-transfer  (/pieces/transfer)  — PT-#### pcs godown transfer. The base
//     planTransfer CANNOT take itemType 'pcs' (pcs buckets key itemId = the
//     ORDER id — no item master) → planPcsTransfer sibling (ERRATUM: the frozen
//     mechanism said "transfer_stock schema takes itemType"; it does not).
//   ready-to-cut  (/cutting/ready-to-cut) — RTC-#### move of program stock
//     into the virtual Cutting dept (PITFALLS #12 legacy DeptID −7): a
//     dept-keyed CurrentStock bucket in the SAME godown (our virtual-dept
//     representation) — ready_to_cut_out (null-dept bucket −) +
//     ready_to_cut_in (D3-keyed bucket +), both legacy TrType 20 txnTypes.
import { z } from 'zod'

export const PCS_TRANSFER_SCHEMA = z.object({
  docNo: z.string().optional().describe('PT-#### auto when blank.'),
  orderNo: z.string().describe('Order whose pieces move (pcs stock keys on the order).'),
  fromGodownCode: z.string().describe('Default G2 (Finished Goods).'),
  toGodownCode: z.string().describe('Receiving godown / unit.'),
  qty: z.number().describe('Pcs to transfer (positive).'),
  notes: z.string().optional(),
  transferDate: z.string().optional(),
})

export type PcsTransferInput = z.infer<typeof PCS_TRANSFER_SCHEMA>

export const READY_TO_CUT_SCHEMA = z.object({
  docNo: z.string().optional().describe('RTC-#### auto when blank.'),
  itemType: z.enum(['yarn', 'fabric']).optional().describe('Material stage — default fabric (knit panels).'),
  itemCode: z.string().describe('Yarn / fabric item code (the program output).'),
  fromGodownCode: z.string().optional().describe('Store the material leaves — default G1 (Main Store).'),
  orderNo: z.string().optional().describe('Program stock flag — rides the ledger rows (orderId) + notes.'),
  qty: z.number().describe('Kgs moved into the ready-to-cut pool (positive).'),
  notes: z.string().optional(),
  transferDate: z.string().optional(),
})

export type ReadyToCutInput = z.infer<typeof READY_TO_CUT_SCHEMA>
