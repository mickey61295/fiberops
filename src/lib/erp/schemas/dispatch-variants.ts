// SPEC-M6 §7-D-1 (Wave D) — the jobwork-DC family VARIANT schemas.
// planJobworkOut / planJobworkIn + JOBWORK_OUT_SCHEMA stay VERBATIM (§4 rule 1);
// planMaterialDc is the generalized sibling (§4 rule 2) serving BOTH doors:
//   dc-entry    (/dispatch/dc)          — single material DC, MDC-#### space
//   process-dc  (/dispatch/dc/process)  — multi-component process DC, PDC-####
// ONE create_dc tool feeds both (the lines array present = the PDC door).
// Ledger: process_delivery OUT per material line (legacy DC TrType 1 (P) →
// CurrentStock −; the jobwork-pcs-return precedent for material lines).
import { z } from 'zod'

const DC_LINE = z.object({
  itemType: z.enum(['yarn', 'fabric', 'accessory']),
  itemCode: z.string(),
  qty: z.number().describe('Qty out (kgs for yarn/fabric, pcs for accessory).'),
  rate: z.number().optional().describe('Rate — default 0 (process material often unvalued on the DC).'),
})

/** The create_dc TOOL schema — both doors (single-material keys OR lines[]).
 *  planMaterialDc validates that exactly one shape is present. The two CONFIG
 *  schemas below are the per-screen mirrors (the schema-mirror rule: every
 *  config field set == its schema key set exactly). */
export const MATERIAL_DC_SCHEMA = z.object({
  dcNo: z.string().optional().describe('DC no — auto-assigned MDC-#### (single) / PDC-#### (multi-line) when blank.'),
  partyCode: z.string().describe('ANY party code — processor, jobworker, buyer (generalized; not jobworker-only).'),
  processType: z.string().optional().describe('Process (washing|dyeing|printing|embroidery) — default "general".'),
  godownCode: z.string().optional().describe('Godown the material leaves — default G1 (Main Store).'),
  dcDate: z.string().optional(),
  vehicleNo: z.string().optional(),
  notes: z.string().optional(),
  // single-material shortcut (the MDC door) — ignored when lines[] present
  itemType: z.enum(['yarn', 'fabric', 'accessory']).optional(),
  itemCode: z.string().optional(),
  qty: z.number().optional(),
  rate: z.number().optional(),
  // multi-component lines (the PDC door)
  lines: z.array(DC_LINE).optional().describe('Multi-component lines (PDC door). Present → PDC-#### numbering.'),
})

export type MaterialDcInput = z.infer<typeof MATERIAL_DC_SCHEMA>

/** The dc-entry CONFIG schema (/dispatch/dc — the single-material MDC door). */
export const DC_ENTRY_SCHEMA = MATERIAL_DC_SCHEMA.omit({ lines: true }).extend({
  itemType: z.enum(['yarn', 'fabric', 'accessory']),
  itemCode: z.string(),
  qty: z.number(),
})

export type DcEntryInput = z.infer<typeof DC_ENTRY_SCHEMA>

/** The process-dc CONFIG schema (/dispatch/dc/process — multi-component PDC door). */
export const PROCESS_DC_SCHEMA = MATERIAL_DC_SCHEMA.omit({
  itemType: true, itemCode: true, qty: true, rate: true,
}).extend({
  lines: z.array(DC_LINE).min(1, 'At least one component line is required'),
})

export type ProcessDcInput = z.infer<typeof PROCESS_DC_SCHEMA>
