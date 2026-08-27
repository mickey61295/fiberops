/**
 * /dispatch/gate-pass — Gate Pass log (SPEC-M5 §7-D-28, legacy FrmGatePass).
 * VARIANT config over planGateEntry (pins gateType='out' → GP-####). Recent
 * list narrows to gateType='out'.
 */
import { db } from '@/lib/db'
import { gatePassConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function GatePassPage() {
  const recent = await db.gateEntry.findMany({
    where: { gateType: 'out' },
    orderBy: { createdAt: 'desc' },
    take: gatePassConfig.recentCount ?? 20,
  })
  const partyIds = [...new Set(recent.map((g) => g.partyId).filter((p): p is string => !!p))]
  const parties = partyIds.length
    ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } })
    : []
  const partyById = new Map(parties.map((p) => [p.id, p.name]))
  const rows = recent.map((g) => ({
    id: g.id,
    cells: {
      entryNo: g.entryNo,
      vehicleNo: g.vehicleNo ?? '—',
      partyName: g.partyId ? partyById.get(g.partyId) ?? '—' : '—',
      refDocNo: g.refDocNo ?? '—',
      status: g.status,
      gateDateTime: g.gateDateTime ? g.gateDateTime.toISOString().replace('T', ' ').slice(0, 16) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/dispatch" label="Dispatch" title="Gate Pass (new)" />
      <DocScreen
        config={toScreenConfig(gatePassConfig)}
        mode="new"
        viewRoutePattern="/dispatch/gate-pass/[id]"
      />
      <RecentDocsTable
        title="Recent gate passes (vehicles out)"
        columns={gatePassConfig.listColumns}
        rows={rows}
        hrefBase="/dispatch/gate-pass"
        empty="No gate passes yet — log the first outbound vehicle above."
      />
    </div>
  )
}
