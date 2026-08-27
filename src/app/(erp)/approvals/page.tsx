/**
 * /approvals route (SPEC-M1 §9): re-homes the existing WorkflowView view.
 * SPEC-M5 §6 (Wave C): gains the kind filter tab via `?kind=` searchParam
 * (default: all kinds). Approval Inbox note: this screen is tool-backed
 * (get_pending_approvals + /api/agent/approve) — it IS the M1 Approval Inbox shell.
 */
import { WorkflowView } from '@/components/erp/workflow-view'
import { APPROVAL_KIND_ENTITIES } from '@/lib/erp/approval-kinds'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  // Unknown kinds degrade to "all" — the inbox never 500s on a bad param.
  const safeKind = kind && APPROVAL_KIND_ENTITIES.includes(kind) ? kind : undefined
  return <WorkflowView kind={safeKind} />
}
