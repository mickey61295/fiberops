/**
 * /orders/samples — Samples & Enquiry (SPEC-M5 §7-D-26, item
 * 'samples-enquiry', legacy frmOrderSample family). DocScreen New mode +
 * recent samples; the form door → planSample — the same service as the
 * create_sample tool (ADR-001).
 */
import { db } from '@/lib/db'
import { sampleConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function SamplesPage() {
  const recent = await db.sample.findMany({
    orderBy: { createdAt: 'desc' },
    take: sampleConfig.recentCount ?? 20,
  })
  // buyerId/styleId are free FK cols (PITFALLS #21) — resolve via id maps
  const buyerIds = [...new Set(recent.map((s) => s.buyerId).filter((b): b is string => !!b))]
  const styleIds = [...new Set(recent.map((s) => s.styleId).filter((s): s is string => !!s))]
  const buyers = buyerIds.length ? await db.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : []
  const styles = styleIds.length ? await db.style.findMany({ where: { id: { in: styleIds } }, select: { id: true, styleNo: true } }) : []
  const buyerById = new Map(buyers.map((b) => [b.id, b.name]))
  const styleById = new Map(styles.map((s) => [s.id, s.styleNo]))
  const rows = recent.map((s) => ({
    id: s.id,
    cells: {
      sampleNo: s.sampleNo,
      buyerName: s.buyerId ? buyerById.get(s.buyerId) ?? '—' : '—',
      sampleType: s.sampleType,
      qty: String(s.qty ?? 0),
      status: s.status,
      sampledOn: s.sampledOn ? s.sampledOn.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/orders" label="Orders" title="Samples & Enquiry (new)" />
      <DocScreen
        config={toScreenConfig(sampleConfig)}
        mode="new"
        viewRoutePattern="/orders/samples/[id]"
      />
      <RecentDocsTable
        title="Recent samples"
        columns={sampleConfig.listColumns}
        rows={rows}
        hrefBase="/orders/samples"
        empty="No samples logged yet — submit the first proto above."
      />
    </div>
  )
}
