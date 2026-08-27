/**
 * /quality/reprocess-approval (SPEC-M5 §6 Wave C, item 'reprocess-approval',
 * arch IN) — kind-filtered view of the Approval Inbox: pending reprocess
 * approvals (entityId = the GRN id). Left by receive_grn with reprocess=true;
 * approved via the approve_reprocess agent tool. Drill: /procurement/grn/[id].
 */
import { WorkflowView } from '@/components/erp/workflow-view'

export const dynamic = 'force-dynamic'

export default function ReprocessApprovalPage() {
  return <WorkflowView kind="reprocess" />
}
