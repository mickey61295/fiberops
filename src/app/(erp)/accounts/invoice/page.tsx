/**
 * /accounts/invoice — Sales Invoice (SPEC-M3 §8 row 14, item 'sales-invoice').
 * DocScreen New mode + recent invoices. Form door → planInvoice — the same
 * service as create_sales_invoice (ADR-001). ?order=SO-… prefills orderNo.
 * Chain step 13 of 15.
 */
import { db } from '@/lib/db'
import { invoiceConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function SalesInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.salesInvoice.findMany({
    orderBy: { invoiceDate: 'desc' },
    take: invoiceConfig.recentCount ?? 20,
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
      invoiceDate: i.invoiceDate ? i.invoiceDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Sales Invoice (new)" />
      <DocScreen
        config={toScreenConfig(invoiceConfig)}
        mode="new"
        viewRoutePattern="/accounts/invoice/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent invoices"
        columns={invoiceConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/invoice"
        empty="No invoices yet — issue the first one above."
      />
    </div>
  )
}
