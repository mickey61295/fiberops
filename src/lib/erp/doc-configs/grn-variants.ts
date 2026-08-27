// SPEC-M5 §7-B-18 — jobwork pcs return DocConfig (/jobwork/pcs-return, item
// 'jobwork-pcs-return', legacy frmJobWorkPcsReturn). Fields mirror
// JOBWORK_PCS_RETURN_SCHEMA exactly. GRN row (grnType='process_return') +
// StockLedger OUT of the pcs godown — views reuse /procurement/grn/[id]
// (a return IS a GRN row; §4 rule 2 keeps the shared GRN-#### space).
import type { DocConfig } from './types'
import { JOBWORK_PCS_RETURN_SCHEMA } from '../schemas/grn-variants'
import { planJobworkPcsReturn } from '../posting/grn'

export const jobworkPcsReturnConfig: DocConfig = {
  docType: 'jobwork-pcs-return',
  slug: 'jobwork-pcs-return',
  title: 'Jobwork Pcs Return',
  numberPrefix: 'GRN-',
  numberField: 'retNo',
  schema: JOBWORK_PCS_RETURN_SCHEMA,
  service: { plan: (input: unknown) => planJobworkPcsReturn(input as Parameters<typeof planJobworkPcsReturn>[0]) },
  headerFields: [
    { name: 'retNo', label: 'Return GRN No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Jobworker', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'qty', label: 'Returned Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'From Godown (G2 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'retDate', label: 'Return Date', type: 'date', colSpan: 1 },
    { name: 'reason', label: 'Reason (rework / damage / …)', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'grnNo', label: 'Return No' },
    { name: 'partyName', label: 'Jobworker' },
    { name: 'totalQty', label: 'Pcs', align: 'right' },
    { name: 'grnType', label: 'Type' },
    { name: 'grnDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['return_jobwork_pcs'],
}
