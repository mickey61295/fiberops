/**
 * /accounts/bill — Supplier Bill new-doc screen (SPEC-M40 PAY-03, item
 * 'supplier-bill', SB-####). DocScreen New mode + recent bills. Form door →
 * planSupplierBill — the same service as the create_supplier_bill agent tool
 * (ADR-001). Draft until the pass gate (create_bill_pass / Bill Pass queue).
 */
import { db } from '@/lib/db'
import { supplierBillConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function SupplierBillPage() {
  const recent = await db.supplierBill.findMany({
    orderBy: { billDate: 'desc' },
    take: supplierBillConfig.recentCount ?? 20,
  })
  const partyIds = [...new Set(recent.map((b) => b.partyId))]
  const parties = partyIds.length ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } }) : []
  const partyMap = new Map(parties.map((p) => [p.id, p.name]))
  const rows = recent.map((b) => ({
    id: b.id,
    cells: {
      billNo: b.billNo,
      partyName: partyMap.get(b.partyId) ?? '—',
      grnNo: '—',
      billDate: b.billDate ? b.billDate.toISOString().slice(0, 10) : '—',
      billAmount: (b.billAmount || 0).toLocaleString('en-IN'),
      matchStatus: b.matchStatus ?? '—',
      status: b.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Supplier Bill (new)" />
      <DocScreen
        config={toScreenConfig(supplierBillConfig)}
        mode="new"
        viewRoutePattern="/accounts/bill/[id]"
      />
      <RecentDocsTable
        title="Recent supplier bills"
        columns={supplierBillConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/bill"
        empty="No supplier bills yet — raise the first one from a purchase GRN above."
      />
    </div>
  )
}
