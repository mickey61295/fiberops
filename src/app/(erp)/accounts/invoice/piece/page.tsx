/**
 * /accounts/invoice/piece — Piece / Jobwork Invoice (SPEC-M5 §7-A-4, item
 * 'piece-jobwork-invoice', legacy frmPieceInv / Rpt_JobwrkInvoice). VARIANT
 * config over planInvoice (billType='jobwork' injected). Recent list narrows
 * to billType='jobwork'. Views reuse /accounts/invoice/[id] (same family).
 */
import { db } from '@/lib/db'
import { pieceJobworkInvoiceConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PieceJobworkInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.salesInvoice.findMany({
    where: { billType: 'jobwork' },
    orderBy: { invoiceDate: 'desc' },
    take: pieceJobworkInvoiceConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/accounts" label="Accounts" title="Piece / Jobwork Invoice (new)" />
      <DocScreen
        config={toScreenConfig(pieceJobworkInvoiceConfig)}
        mode="new"
        viewRoutePattern="/accounts/invoice/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent piece / jobwork invoices"
        columns={pieceJobworkInvoiceConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/invoice"
        empty="No jobwork invoices yet — bill the first lot above."
      />
    </div>
  )
}
