/**
 * /orders/commercial-invoice — Commercial (export) Invoice entry (SPEC-M5
 * §7-A-2, item 'commercial-invoice', legacy FrmCommericalInv_New). DocScreen
 * New mode + recent export invoices. Form door → planExportInvoice — the same
 * service as create_commercial_invoice (ADR-001). ?order=SO-… prefills.
 * Views reuse /accounts/invoice/[id] (same SalesInvoice family).
 */
import { db } from '@/lib/db'
import { commercialInvoiceConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function CommercialInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.salesInvoice.findMany({
    where: { invoiceType: 'export' },
    orderBy: { invoiceDate: 'desc' },
    take: commercialInvoiceConfig.recentCount ?? 20,
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
      ern: i.ern ?? '—',
      invoiceDate: i.invoiceDate ? new Date(i.invoiceDate).toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/orders" label="Orders & Sales" title="Commercial Invoice (new)" />
      <DocScreen
        config={toScreenConfig(commercialInvoiceConfig)}
        mode="new"
        viewRoutePattern="/accounts/invoice/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent commercial invoices"
        columns={commercialInvoiceConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/invoice"
        empty="No export invoices yet — issue the first one above."
      />
    </div>
  )
}
