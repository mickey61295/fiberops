// SPEC-M5 §7-B-18 — variant schema for jobwork pcs returns (frmJobWorkPcsReturn).
// A GRN row with grnType='process_return' + pcs lines; StockLedger OUT of the
// pcs godown (default G2 — Finished Goods; overridable).
import { z } from 'zod'

export const JOBWORK_PCS_RETURN_SCHEMA = z.object({
  retNo: z.string().optional().describe('GRN no — auto-assigned GRN-#### (shared GRN space) when blank.'),
  partyCode: z.string().describe('Jobworker party code.'),
  orderNo: z.string(),
  qty: z.number().describe('Pcs returned to the jobworker.'),
  godownCode: z.string().optional().describe('Pcs godown the pieces leave — default G2 (Finished Goods).'),
  reason: z.string().optional(),
  retDate: z.string().optional(),
})

export type JobworkPcsReturnInput = z.infer<typeof JOBWORK_PCS_RETURN_SCHEMA>

// ───────── SPEC-M6 §7-D-1 (Wave D) — the two GRN-family variants ─────────
// Base GRN_SCHEMA + planGrn stay VERBATIM (§4 rule 1); these are §4 rule-2
// variant shapes for the process-return screens. Both share the M5
// jobwork-pcs-return semantics: grnType='process_return', the ledger row IS
// the line record for relation-less itemIds (PITFALLS #21).

/** frmPrsGRNMulti / frmPrsGRNMulti_Compwise — Multi-Process GRN
 *  (/procurement/grn/multi-process). Returns components (fabric/yarn/
 *  accessory) to a processor across MULTIPLE lines in ONE MP-#### GRN;
 *  StockLedger process_delivery OUT per component line (the jobwork-pcs-return
 *  direction — material goes BACK to the processor). */
export const MULTI_PROCESS_GRN_SCHEMA = z.object({
  grnNo: z.string().optional().describe('GRN no — auto-assigned MP-#### when blank.'),
  partyCode: z.string().describe('Processor / jobworker party code.'),
  godownCode: z.string().optional().describe('Godown the material leaves — default G1 (Main Store).'),
  grnDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemType: z.enum(['yarn', 'fabric', 'accessory']),
    itemCode: z.string(),
    qty: z.number().describe('Qty returned (kgs for yarn/fabric, pcs for accessory).'),
    rate: z.number().optional().describe('Rate for the return value — default 0.'),
  })).min(1, 'At least one component line is required'),
})

export type MultiProcessGrnInput = z.infer<typeof MULTI_PROCESS_GRN_SCHEMA>

/** FrmFabDel_Return / FrmAccDel_Return — DC Return (/dispatch/dc-return).
 *  Books material that went out on a DC back INTO stock: one RTN-#### GRN
 *  (grnType='process_return') against the DC number; StockLedger
 *  process_receipt IN per line (the mirror of the DC's process_delivery OUT). */
export const DC_RETURN_SCHEMA = z.object({
  grnNo: z.string().optional().describe('GRN no — auto-assigned RTN-#### when blank.'),
  partyCode: z.string().describe('Party the material returns from (the DC party).'),
  dcNo: z.string().describe('The DC number being returned against (MDC-/PDC-/JW-####).'),
  godownCode: z.string().optional().describe('Godown the material re-enters — default G1 (Main Store).'),
  grnDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemType: z.enum(['yarn', 'fabric', 'accessory']),
    itemCode: z.string(),
    qty: z.number().describe('Qty returned (kgs for yarn/fabric, pcs for accessory).'),
    rate: z.number().optional().describe('Rate for the return value — default 0.'),
  })).min(1, 'At least one line is required'),
})

export type DcReturnInput = z.infer<typeof DC_RETURN_SCHEMA>
