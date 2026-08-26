'use client'

/**
 * /approvals route (SPEC-M1 §9): re-homes the existing WorkflowView view.
 * Approval Inbox note: this screen is tool-backed (get_pending_approvals +
 * /api/agent/approve) — it IS the M1 Approval Inbox shell.
 */
import { WorkflowView } from '@/components/erp/workflow-view'

export default function Page() {
  return <WorkflowView />
}
