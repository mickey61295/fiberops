/**
 * /accounts/bill-pass (SPEC-M5 §6 Wave C, item 'bill-pass', arch IN) —
 * kind-filtered view of the Approval Inbox: pending supplier_bill approvals
 * (one per GRN awaiting bill pass). Raised by the create_bill_pass agent tool
 * (which also creates the row when the GRN lacks one); approve → the GRN shows
 * bill-passed in /accounts/supplier-bills. Drill: /procurement/grn/[id].
 */
import { WorkflowView } from '@/components/erp/workflow-view'

export const dynamic = 'force-dynamic'

export default function BillPassPage() {
  return <WorkflowView kind="supplier_bill" />
}
