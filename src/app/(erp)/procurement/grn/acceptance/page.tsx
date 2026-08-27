/**
 * /procurement/grn/acceptance — GRN Acceptance (SPEC-M6 §2 row 20 / §6,
 * legacy FrmPurGrnAccept / FrmProGrnAccept). APPROVAL KIND grn_acceptance:
 * kind-filtered inbox + the manual QUEUE over recent GRNs (all types) that
 * lack an acceptance row. Accept door: accept_grn (proposeApprovalGate —
 * find-or-create + approve). No posting hook raises these rows (§6 rule 4).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { WorkflowView } from '@/components/erp/workflow-view'
import { ApprovalQueue, type QueueCardRow } from '@/components/erp/approval-queue'

export const dynamic = 'force-dynamic'

export default async function GrnAcceptancePage() {
  const recent = await db.gRN.findMany({
    orderBy: { grnDate: 'desc' },
    take: 30,
    include: { party: true },
  })
  const existing = await db.approval.findMany({
    where: { entity: 'grn_acceptance' },
    select: { entityId: true },
  })
  const hasRow = new Set(existing.map((a) => a.entityId))
  const rows: QueueCardRow[] = recent
    .filter((g) => !hasRow.has(g.id))
    .slice(0, 8)
    .map((g) => ({
      entityId: g.id,
      title: g.grnNo,
      details: [
        ['Party', g.party?.name ?? '—'],
        ['Type', g.grnType],
        ['Qty', String(g.totalQty)],
        ['Value', '₹' + Math.round(g.totalValue).toLocaleString('en-IN')],
        ['Date', g.grnDate.toISOString().slice(0, 10)],
      ] as Array<[string, string]>,
      href: `/procurement/grn/${g.id}`,
    }))

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/procurement" className="hover:text-slate-800 hover:underline">Procurement</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">GRN Acceptance</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">GRN Acceptance</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Accept/reject received goods — purchase &amp; process GRN queue. The GRN gets no status column
          (SPEC-M6 §3-5): the Approval row IS the acceptance state.
        </p>
      </div>
      <WorkflowView kind="grn_acceptance" />
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Queue — recent GRNs without an acceptance row</h2>
        <ApprovalQueue kind="grn_acceptance" title="GRN Acceptance" rows={rows} />
      </div>
    </div>
  )
}
