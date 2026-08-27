/**
 * /cutting/ack — Cutting Ack (SPEC-M6 §2 row 25 / §6, legacy frmcuttingack).
 * APPROVAL KIND cutting_ack: kind-filtered inbox + the manual QUEUE over
 * LineIssues to the cutting dept that lack an ack row. Accept door:
 * acknowledge_cutting_issue (proposeApprovalGate). No posting hook raises
 * these rows — the legacy queue was explicitly human-stepped (§6 rule 4).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { WorkflowView } from '@/components/erp/workflow-view'
import { ApprovalQueue, type QueueCardRow } from '@/components/erp/approval-queue'
import { STAGE_DEPT } from '@/lib/erp/legacy-enums'

export const dynamic = 'force-dynamic'

export default async function CuttingAckPage() {
  const cutDept = await db.department.findUnique({ where: { code: STAGE_DEPT.cutting } })
  const recent = await db.lineIssue.findMany({
    ...(cutDept ? { where: { line: { deptId: cutDept.id } } } : {}),
    orderBy: { issueDate: 'desc' },
    take: 30,
    include: { line: true, order: true },
  })
  const existing = await db.approval.findMany({
    where: { entity: 'cutting_ack' },
    select: { entityId: true },
  })
  const hasRow = new Set(existing.map((a) => a.entityId))
  const rows: QueueCardRow[] = recent
    .filter((li) => !hasRow.has(li.id))
    .slice(0, 8)
    .map((li) => ({
      entityId: li.id,
      title: li.issueNo,
      details: [
        ['Order', li.order?.orderNo ?? '—'],
        ['Line', li.line?.code ?? '—'],
        ['Qty', String(li.qty)],
        ['Date', li.issueDate.toISOString().slice(0, 10)],
      ] as Array<[string, string]>,
      // no per-issue doc view — the list anchor (§6 refResolver)
      href: '/cutting/issue',
    }))

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/cutting" className="hover:text-slate-800 hover:underline">Cutting</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Cutting Ack</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Cutting Ack</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Acknowledge that fabric issued to a cutting line reached the cutting table.
        </p>
      </div>
      <WorkflowView kind="cutting_ack" />
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Queue — cutting issues without an ack row</h2>
        <ApprovalQueue kind="cutting_ack" title="Cutting Ack" rows={rows} />
      </div>
    </div>
  )
}
