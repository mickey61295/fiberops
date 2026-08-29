/**
 * /programs/[id] — Program view (SPEC-M3 §8 row 3 view mode).
 * Resolves by db id OR programNo. DocScreen view mode + chain bar with the
 * parent order's state (W1) — unknown id → 404.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { programConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ProgramViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, department: true, yarn: true, fabric: true }
  let program = await db.program.findUnique({ where: { id }, include }).catch(() => null)
  if (!program) program = await db.program.findUnique({ where: { programNo: id }, include })
  if (!program) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    programNo: program.programNo,
    orderNo: program.order?.orderNo ?? '',
    stage: program.stage,
    yarnCode: program.yarn?.code ?? '',
    fabricCode: program.fabric?.code ?? '',
    requiredKgs: program.requiredKgs,
    requiredMtrs: program.requiredMtrs,
    requiredPcs: program.requiredPcs,
    deptCode: program.department?.code ?? '',
    targetDate: d(program.targetDate),
    notes: program.notes ?? '',
    status: program.status, // SPEC-M18 §4-C1 — drives the Cancel/Duplicate action row
  }
  const state = program.order ? computeChainState(program.order) : undefined
  const chainCtx = program.order ? { orderNo: program.order.orderNo, id: program.order.id } : undefined

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/programs/new" label="Programs" title={program.programNo} />
      <DocScreen
        config={toScreenConfig(programConfig)}
        mode="view"
        docNo={program.programNo}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
    </div>
  )
}
