// SPEC-M3 §8 row 9 — Issue to Line (/production/issue, item 'issue-to-line',
// legacy Rpt_IssueToLine flow). Fields mirror LINE_ISSUE_SCHEMA exactly.
// Chain step 9 of 15. Ledger: ready_to_cut_out pcs OUT of G1 (warns, never
// blocks, on negative balance — legacy behaviour).
import type { DocConfig } from './types'
import { LINE_ISSUE_SCHEMA } from '../schemas/line-issue'
import { planLineIssue } from '../posting/line-issue'

export const lineIssueConfig: DocConfig = {
  docType: 'line-issue',
  slug: 'line-issue',
  title: 'Issue to Line',
  numberPrefix: 'LI-',
  numberField: 'issueNo',
  chainStage: 9,
  schema: LINE_ISSUE_SCHEMA,
  service: { plan: (input: unknown) => planLineIssue(input as Parameters<typeof planLineIssue>[0]) },
  headerFields: [
    { name: 'issueNo', label: 'Issue No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'lineCode', label: 'Line', type: 'picker', picker: 'line', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'issueDate', label: 'Issue Date', type: 'date', colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'issueNo', label: 'Issue No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'lineName', label: 'Line' },
    { name: 'qty', label: 'Qty (pcs)', align: 'right' },
    { name: 'issueDate', label: 'Date' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['issue_to_line', 'get_line_status'],
}
