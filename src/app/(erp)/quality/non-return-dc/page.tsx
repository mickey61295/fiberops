/**
 * /quality/non-return-dc (SPEC-M5 §6 Wave C, item 'non-return-dc-approval',
 * arch IN) — kind-filtered view of the Approval Inbox: pending non_return_dc
 * approvals (entityId = the despatch DC id). Left by create_pcs_despatch with
 * returnable=false; approved via the approve_non_return_dc agent tool.
 * Drill: /pieces/despatch/[id].
 */
import { WorkflowView } from '@/components/erp/workflow-view'

export const dynamic = 'force-dynamic'

export default function NonReturnDcPage() {
  return <WorkflowView kind="non_return_dc" />
}
