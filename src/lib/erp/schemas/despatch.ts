// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_pcs_despatch.
import { z } from 'zod'

export const DESPATCH_SCHEMA = z.object({
  dcNo: z.string().optional(),
  orderNo: z.string(),
  totalPcs: z.number(),
  vehicleNo: z.string().optional(),
  courierName: z.string().optional(),
  despatchDate: z.string().optional(),
  lines: z.array(z.object({
    styleNo: z.string(),
    colourName: z.string().optional(),
    sizeName: z.string().optional(),
    qty: z.number(),
    rate: z.number().optional(),
  })).optional(),
  // SPEC-M5 §6 (Wave C): returnable defaults to TRUE (legacy behaviour). When
  // explicitly false the commit ALSO leaves a pending non_return_dc Approval
  // (entityId = the DC id) — approved at /quality/non-return-dc
  // (approve_non_return_dc tool).
  returnable: z.boolean().optional().describe('Material will return (default true). Set false to raise a non-return DC approval'),
  // SPEC-M6 §7-B (Wave B): despatch VARIANTS — mode 'courier' (courierName
  // required, vehicle optional) and 'loading' (LAD-#### docNo space, status
  // starts 'loading' instead of 'despatched'; ledger identical).
  mode: z.enum(['despatch', 'courier', 'loading']).optional().describe('despatch (default) | courier | loading challan'),
  // SPEC-M41 PRC-08 — logistics fields (legacy FrmPcsDespatch Lorry/AWB
  // block). All optional; print shows '—' when absent.
  lrNo: z.string().optional().describe('LR / AWB / docket number'),
  transporter: z.string().optional().describe('Transport company / driver'),
  freight: z.number().optional().describe('Freight ₹'),
  cartons: z.number().int().optional().describe('Carton count'),
  grossWeightKg: z.number().optional().describe('Gross weight (kg)'),
})

export type DespatchInput = z.infer<typeof DESPATCH_SCHEMA>
