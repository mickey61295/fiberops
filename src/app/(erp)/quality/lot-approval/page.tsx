/**
 * /quality/lot-approval — Lot Approval (SPEC-M6 §2 row 33 / §6, legacy
 * frmLotApproval). APPROVAL KIND lot: kind-filtered inbox + the manual QUEUE
 * over dyeing/knitting GRN lots (GRNs with a D1/D2 dept and fabric/yarn
 * lines) that lack a lot row. Accept door: approve_lot (proposeApprovalGate).
 * Drill: /procurement/grn/[id].
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { WorkflowView } from '@/components/erp/workflow-view'
import { ApprovalQueue, type QueueCardRow } from '@/components/erp/approval-queue'
import { STAGE_DEPT } from '@/lib/erp/legacy-enums'

export const dynamic = 'force-dynamic'

export default async function LotApprovalPage() {
  // dyeing (D2) / knitting (D1) depts — the process depts producing lots
  const depts = await db.department.findMany({
    where: { code: { in: [STAGE_DEPT.dyeing, STAGE_DEPT.knitting] } },
    select: { id: true },
  })
  const deptIds = depts.map((d) => d.id)
  const recent = deptIds.length
    ? await db.gRN.findMany({
        where: { deptId: { in: deptIds } },
        orderBy: { grnDate: 'desc' },
        take: 30,
        include: { party: true, lines: true, department: true },
      })
    : []
  // "lots" = GRNs whose lines carry fabric/yarn (the lot material)
  const lotGrs = recent.filter((g) => g.lines.some((l) => l.itemType === 'fabric' || l.itemType === 'yarn'))
  const existing = await db.approval.findMany({
    where: { entity: 'lot' },
    select: { entityId: true },
  })
  const hasRow = new Set(existing.map((a) => a.entityId))
  const rows: QueueCardRow[] = lotGrs
    .filter((g) => !hasRow.has(g.id))
    .slice(0, 8)
    .map((g) => ({
      entityId: g.id,
      title: g.grnNo,
      details: [
        ['Party', g.party?.name ?? '—'],
        ['Dept', g.department?.name ?? '—'],
        ['Lot lines', String(g.lines.length)],
        ['Qty', String(g.totalQty)],
        ['Date', g.grnDate.toISOString().slice(0, 10)],
      ] as Array<[string, string]>,
      href: `/procurement/grn/${g.id}`,
    }))

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/quality" className="hover:text-slate-800 hover:underline">Quality</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Lot Approval</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Lot Approval</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Approve dyeing/knitting lots into stock — the queue over D1/D2 GRNs with fabric/yarn lot lines.
        </p>
      </div>
      <WorkflowView kind="lot" />
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Queue — dye/knit GRN lots without an approval row</h2>
        <ApprovalQueue kind="lot" title="Lot Approval" rows={rows} />
      </div>
    </div>
  )
}
