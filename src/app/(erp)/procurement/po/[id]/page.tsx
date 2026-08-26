/**
 * /procurement/po/[id] — Purchase Order view (SPEC-M3 §8 row 4 view mode).
 * Resolves by db id OR poNo. Lines flatten to the schema shape (itemType,
 * itemCode via item maps, qty, rate) for the config-driven line table.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { purchaseOrderConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PurchaseOrderViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { party: true, lines: true }
  let po = await db.purchaseOrder.findUnique({ where: { id }, include }).catch(() => null)
  if (!po) po = await db.purchaseOrder.findUnique({ where: { poNo: id }, include })
  if (!po) notFound()

  // resolve item codes for the line table (POLine carries itemType+itemId only)
  const [yarns, fabrics, accessories] = await Promise.all([
    db.yarn.findMany({ select: { id: true, code: true } }),
    db.fabric.findMany({ select: { id: true, code: true } }),
    db.accessory.findMany({ select: { id: true, code: true } }),
  ])
  const itemMaps: Record<string, Map<string, string>> = {
    yarn: new Map(yarns.map((y) => [y.id, y.code])),
    fabric: new Map(fabrics.map((f) => [f.id, f.code])),
    accessory: new Map(accessories.map((a) => [a.id, a.code])),
  }

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    poNo: po.poNo,
    poType: po.poType,
    partyCode: po.party?.code ?? '',
    orderDate: d(po.orderDate),
    deliveryDate: d(po.deliveryDate),
    notes: po.notes ?? '',
    lines: po.lines.map((l) => ({
      itemType: l.itemType,
      itemCode: itemMaps[l.itemType]?.get(l.itemId) ?? l.itemId,
      qty: l.qty,
      rate: l.rate,
    })),
  }

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/procurement/po" label="Purchase Orders" title={po.poNo} />
      <DocScreen config={toScreenConfig(purchaseOrderConfig)} mode="view" docNo={po.poNo} initial={initial} />
    </div>
  )
}
