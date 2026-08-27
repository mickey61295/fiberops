import type { RegisterConfig } from './types'

/** /approvals/audit — SPEC-M4 §7 row 16 (modern source: Approval + AgentTurn). */
export const approvalAuditConfig: RegisterConfig = {
  slug: 'approval-audit',
  title: 'Approval Audit Trail',
  description: 'Who approved what, when — every decision logged (agent turns included).',
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
  ],
  columns: [
    { name: 'createdAt', label: 'Raised', format: 'date' },
    { name: 'entity', label: 'Entity', format: 'badge' },
    { name: 'entityId', label: 'Ref', mono: true },
    { name: 'step', label: 'Step', align: 'right', format: 'int' },
    { name: 'requestedBy', label: 'Requested by' },
    { name: 'approvedBy', label: 'Approved by' },
    { name: 'approvedAt', label: 'Decided', format: 'date' },
    { name: 'status', label: 'Status', format: 'badge' },
    { name: 'comments', label: 'Comments' },
  ],
  agentTools: ['get_approval_audit'],
  askPrompt: 'Show me the approval audit trail',
  emptyMessage: 'No approvals for these filters.',
}
