/**
 * /pieces/gan — Pcs GRN Acceptance / GAN (SPEC-M6 §2 row 27 / §6, legacy
 * FrmProGrnAccept). APPROVAL KIND pcs_acceptance: kind-filtered inbox + the
 * manual QUEUE over JobworkOrders with status='received' that lack a GAN row.
 * PITFALLS #12 semantics documented on the page: piece receipts park pending
 * acceptance BEFORE stock posts. Accept door: accept_jobwork_pcs
 * (proposeApprovalGate). Drill: /jobwork/order/[id].
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { WorkflowView } from '@/components/erp/workflow-view'
import { ApprovalQueue, type QueueCardRow } from '@/components/erp/approval-queue'

export const dynamic = 'force-dynamic'

export default async function PcsGanPage() {
  const recent = await db.jobworkOrder.findMany({
    where: { status: 'received' },
    orderBy: { receivedDate: 'desc' },
    take: 30,
    include: { jobworker: true },
  })
  const existing = await db.approval.findMany({
    where: { entity: 'pcs_acceptance' },
    select: { entityId: true },
  })
  const hasRow = new Set(existing.map((a) => a.entityId))
  const rows: QueueCardRow[] = recent
    .filter((j) => !hasRow.has(j.id))
    .slice(0, 8)
    .map((j) => ({
      entityId: j.id,
      title: j.dcNo,
      details: [
        ['Jobworker', j.jobworker?.name ?? '—'],
        ['Process', j.processType],
        ['Qty', String(j.totalQty)],
        ['Received', j.receivedDate ? j.receivedDate.toISOString().slice(0, 10) : '—'],
      ] as Array<[string, string]>,
      href: `/jobwork/order/${j.id}`,
    }))

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/pieces" className="hover:text-slate-800 hover:underline">Pieces</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Pcs GRN Acceptance (GAN)</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Pcs GRN Acceptance (GAN)</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Goods Acceptance Note for received pieces. PITFALLS #12: piece receipts park pending
          acceptance BEFORE stock posts — the GAN row is the gate.
        </p>
      </div>
      <WorkflowView kind="pcs_acceptance" />
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Queue — received jobwork DCs pending acceptance</h2>
        <ApprovalQueue kind="pcs_acceptance" title="Pcs GAN" rows={rows} />
      </div>
    </div>
  )
}
