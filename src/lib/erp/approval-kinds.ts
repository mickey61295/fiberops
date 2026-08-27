/**
 * Approval kinds registry — SPEC-M5 §6 (Wave C).
 *
 * The M1 Approval Inbox renders ANY `Approval` row; Wave C gives the four
 * legacy approval-type screens their own kind-filtered inbox views + W2 drill
 * links to the underlying document. The kind === the `Approval.entity` string
 * the posting hooks write, so the inbox filter is a plain entity equality —
 * no new inbox code paths (§6 rule 3: the approve/reject door stays the
 * existing approve_pending tool + /api/agent/approve).
 *
 * Kinds and their creation hooks (§6 rule 2):
 *  - supplier_bill   : create_bill_pass tool (hooks supplier-bill-register rows;
 *                      approve → GRN shows bill-passed in the register)
 *  - godown_transfer : planTransfer leaves a row when input.requiresAck
 *  - reprocess       : planGrn leaves a row when input.reprocess
 *  - non_return_dc   : planPcsDespatch leaves a row when input.returnable === false
 */

export interface ApprovalKind {
  /** === the Approval.entity value the hooks write (the inbox filter key). */
  entity: string
  label: string
  description: string
  /** The kind's IN screen (a filtered view of the /approvals inbox). */
  route: string
  /** The agent door for this kind (wrapper over the approve door). */
  tool: string
  /** W2 drill: Approval.entityId → underlying doc view href (null = no view). */
  refResolver: (entityId: string) => string | null
}

export const APPROVAL_KINDS: ApprovalKind[] = [
  {
    entity: 'supplier_bill',
    label: 'Bill Pass',
    description: 'Approve supplier bills for payment',
    route: '/accounts/bill-pass',
    tool: 'create_bill_pass',
    refResolver: (grnId) => `/procurement/grn/${grnId}`,
  },
  {
    entity: 'godown_transfer',
    label: 'Unit Transfer Ack',
    description: 'Acknowledge inter-unit godown transfers',
    route: '/dispatch/unit-transfer-ack',
    tool: 'acknowledge_unit_transfer',
    // The GT-#### pair lives in the StockLedger — no own doc view; drill to IO History.
    refResolver: () => '/inventory/io-history',
  },
  {
    entity: 'reprocess',
    label: 'Reprocess Approval',
    description: 'Approve reprocessing of defective material',
    route: '/quality/reprocess-approval',
    tool: 'approve_reprocess',
    refResolver: (grnId) => `/procurement/grn/${grnId}`,
  },
  {
    entity: 'non_return_dc',
    label: 'Non-Return DC Approval',
    description: 'Approve DCs whose material will not return',
    route: '/quality/non-return-dc',
    tool: 'approve_non_return_dc',
    refResolver: (dcId) => `/pieces/despatch/${dcId}`,
  },
]

export const APPROVAL_KIND_ENTITIES = APPROVAL_KINDS.map((k) => k.entity)

export function findApprovalKind(entity: string): ApprovalKind | undefined {
  return APPROVAL_KINDS.find((k) => k.entity === entity)
}

/** W2 drill link for any Approval row (null when the entity has no doc view). */
export function approvalRefHref(entity: string, entityId: string): string | null {
  return findApprovalKind(entity)?.refResolver(entityId) ?? null
}
