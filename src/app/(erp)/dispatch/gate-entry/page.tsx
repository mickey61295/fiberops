/**
 * /dispatch/gate-entry — Gate Entry log (SPEC-M5 §7-D-27, legacy
 * FrmGateEntry). VARIANT config over planGateEntry (pins gateType='in' →
 * GE-####). Recent list narrows to gateType='in'.
 */
import { db } from '@/lib/db'
import { gateEntryConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function GateEntryPage() {
  const recent = await db.gateEntry.findMany({
    where: { gateType: 'in' },
    orderBy: { createdAt: 'desc' },
    take: gateEntryConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/dispatch" label="Dispatch" title="Gate Entry (new)" />
      <DocScreen
        config={toScreenConfig(gateEntryConfig)}
        mode="new"
        viewRoutePattern="/dispatch/gate-entry/[id]"
      />
      <RecentDocsTable
        title="Recent gate entries (vehicles in)"
        columns={gateEntryConfig.listColumns}
        rows={rows}
        hrefBase="/dispatch/gate-entry"
        empty="No gate entries yet — log the first vehicle above."
      />
    </div>
  )
}
