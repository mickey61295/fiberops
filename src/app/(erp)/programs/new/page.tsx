/**
 * /programs/new — Program Entry (SPEC-M3 §8 row 3, item 'program-entry').
 * DocScreen New mode + recent programs. Form door → planProgram/commitProgram
 * — the same service as create_program (ADR-001). ?order=SO-… prefills
 * orderNo (W1 chain-bar / suggest_next_step CTA target).
 */
import { db } from '@/lib/db'
import { programConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.program.findMany({
    orderBy: { createdAt: 'desc' },
    take: programConfig.recentCount ?? 20,
    include: { order: true },
  })
  const rows = recent.map((p) => ({
    id: p.id,
    cells: {
      programNo: p.programNo,
      orderNo: p.order?.orderNo ?? '—',
      stage: p.stage,
      requiredKgs: (p.requiredKgs || 0).toLocaleString('en-IN'),
      requiredMtrs: (p.requiredMtrs || 0).toLocaleString('en-IN'),
      requiredPcs: (p.requiredPcs || 0).toLocaleString('en-IN'),
      targetDate: p.targetDate ? p.targetDate.toISOString().slice(0, 10) : '—',
      status: p.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/" label="Home" title="Program Entry (new)" />
      <DocScreen
        config={toScreenConfig(programConfig)}
        mode="new"
        viewRoutePattern="/programs/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent programs"
        columns={programConfig.listColumns}
        rows={rows}
        hrefBase="/programs"
        empty="No programs yet — create the first one above."
      />
    </div>
  )
}
