/**
 * /programs/[id] — Program view (SPEC-M3 §8 row 3 view mode).
 * Resolves by db id OR programNo. DocScreen view mode + chain bar with the
 * parent order's state (W1) — unknown id → 404.
 * SPEC-M43 PRG-03 — the knitting-spec section: the LIVE ProgBalanceFabric
 * spec + the correction form (same planProgramSpecCorrection service as the
 * correct_program_spec tool — ADR-001).
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { programConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { ProgramSpecForm } from './spec-forms'
import { correctProgramSpecAction } from './spec-actions'

export const dynamic = 'force-dynamic'

export default async function ProgramViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, department: true, yarn: true, fabric: true }
  let program = await db.program.findUnique({ where: { id }, include }).catch(() => null)
  if (!program) program = await db.program.findUnique({ where: { programNo: id }, include })
  if (!program) notFound()

  // PRG-03 — the live knitting spec on the balance row (display + correction).
  // ProgBalanceFabric carries relation-less FK columns (PITFALLS #21 reflex):
  // colour/design/dia resolve via id-maps, never include.
  const specRow = program.fabricId
    ? await db.progBalanceFabric.findFirst({
        where: { orderId: program.orderId, fabricId: program.fabricId },
      }).catch(() => null)
    : null
  const [specColour, specDesign, specDia] = specRow
    ? await Promise.all([
        specRow.colourId ? db.colour.findUnique({ where: { id: specRow.colourId } }).catch(() => null) : null,
        specRow.designId ? db.design.findUnique({ where: { id: specRow.designId } }).catch(() => null) : null,
        specRow.finDiaId ? db.dia.findUnique({ where: { id: specRow.finDiaId } }).catch(() => null) : null,
      ])
    : [null, null, null]
  const current = {
    colour: specColour?.name ?? '',
    design: specDesign?.name ?? '',
    dia: specDia?.value ?? '',
    gsm: specRow?.finGsm != null ? String(specRow.finGsm) : '',
    ll: specRow?.ll ?? '',
  }

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    programNo: program.programNo,
    orderNo: program.order?.orderNo ?? '',
    stage: program.stage,
    yarnCode: program.yarn?.code ?? '',
    fabricCode: program.fabric?.code ?? '',
    colourCode: current.colour,
    designCode: current.design,
    finDiaCode: current.dia,
    finGsm: current.gsm,
    ll: current.ll,
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
      {/* SPEC-M43 PRG-03 — the knitting spec (colour/design/dia/GSM/LL) */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" data-testid="program-spec-section">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold">Knitting spec</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            ProgBalanceFabric · {program.fabric?.code ?? '—'}
          </span>
          <div className="flex-1" />
          <span className="text-xs text-slate-500">
            Feeds 4-point grading later (Phase-6 F)
          </span>
        </div>
        <ProgramSpecForm
          action={correctProgramSpecAction}
          programNo={program.programNo}
          programId={program.id}
          isFabric={!!program.fabricId}
          current={current}
          testId="program-spec-form"
        />
      </section>
    </div>
  )
}
