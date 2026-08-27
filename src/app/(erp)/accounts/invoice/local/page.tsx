/**
 * /accounts/invoice/local — Local Invoice (SPEC-M5 §7-A-3, item
 * 'local-invoice', legacy FrmLocalInvoice). VARIANT config over planInvoice
 * (billType='sales' injected, gstType defaults cgst_sgst — intra-state).
 * Recent list narrows to domestic sales invoices with igstRate=0 (local ≈
 * intra-state). Views reuse /accounts/invoice/[id] (same family).
 */
import { db } from '@/lib/db'
import { localInvoiceConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function LocalInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.salesInvoice.findMany({
    where: { invoiceType: 'domestic', billType: 'sales', igstRate: 0 },
    orderBy: { invoiceDate: 'desc' },
    take: localInvoiceConfig.recentCount ?? 20,
    include: { party: true, order: true },
  })
  const rows = recent.map((i) => ({
    id: i.id,
    cells: {
      invoiceNo: i.invoiceNo,
      partyName: i.party?.name ?? '—',
      orderNo: i.order?.orderNo ?? '—',
      totalQty: (i.totalQty || 0).toLocaleString('en-IN'),
      billAmount: (i.billAmount || 0).toLocaleString('en-IN'),
      status: i.status,
      invoiceDate: i.invoiceDate ? new Date(i.invoiceDate).toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Local Invoice (new)" />
      <DocScreen
        config={toScreenConfig(localInvoiceConfig)}
        mode="new"
        viewRoutePattern="/accounts/invoice/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent local invoices"
        columns={localInvoiceConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/invoice"
        empty="No local invoices yet — bill the first one above."
      />
    </div>
  )
}
