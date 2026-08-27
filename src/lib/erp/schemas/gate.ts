// SPEC-M5 §7-D-27/28 — shared zod schema for create_gate_entry /
// create_gate_pass and the two GateEntry DocScreens (/dispatch/gate-entry
// in, /dispatch/gate-pass out — legacy FrmGateEntry / FrmGatePass). ONE
// model, ONE schema; gateType is injected by the variant configs (§4 rule 2)
// so the base schema carries it optional with a default of 'in'.
import { z } from 'zod'

export const GATE_ENTRY_SCHEMA = z.object({
  entryNo: z.string().optional().describe('GE-#### (in) / GP-#### (out) auto-assigned when omitted'),
  gateType: z.string().optional().describe('in | out (injected by the screen; default in)'),
  gateDateTime: z.string().optional().describe('ISO datetime (default now)'),
  partyCode: z.string().optional().describe('Party code (supplier/customer at the gate)'),
  vehicleNo: z.string().optional(),
  refDocNo: z.string().optional().describe('DC/GRN/PO no being gate-logged'),
  purpose: z.string().optional().describe('Purpose / remarks'),
  status: z.string().optional().describe('logged | cleared (default logged)'),
})

export type GateEntryInput = z.infer<typeof GATE_ENTRY_SCHEMA>
