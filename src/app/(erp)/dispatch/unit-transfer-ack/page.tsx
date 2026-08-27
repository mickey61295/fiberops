/**
 * /dispatch/unit-transfer-ack (SPEC-M5 §6 Wave C, item 'unit-transfer-ack',
 * arch IN) — kind-filtered view of the Approval Inbox: pending
 * godown_transfer approvals (entityId = the GT-#### docNo). Left by
 * transfer_stock with requiresAck=true; acknowledged via the
 * acknowledge_unit_transfer agent tool. Drill: /inventory/io-history.
 */
import { WorkflowView } from '@/components/erp/workflow-view'

export const dynamic = 'force-dynamic'

export default function UnitTransferAckPage() {
  return <WorkflowView kind="godown_transfer" />
}
