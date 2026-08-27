/**
 * /accounts/payments — Payments & Receipts (SPEC-M3 §8 row 16, item
 * 'payments-receipts'). DocScreen New mode + recent vouchers. Form door →
 * planPayment — the same service as record_payment (ADR-001). ?invoice=INV-…
 * prefills invoiceNo (chain stage-15 CTA from an invoice view).
 */
import { db } from '@/lib/db'
import { paymentConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const invoice = typeof sp.invoice === 'string' ? sp.invoice : undefined
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.payment.findMany({
    orderBy: { payDate: 'desc' },
    take: paymentConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((p) => ({
    id: p.id,
    cells: {
      voucherNo: p.voucherNo,
      partyName: p.party?.name ?? '—',
      direction: p.direction === 'in' ? 'Receipt' : 'Payment',
      amount: (p.amount || 0).toLocaleString('en-IN'),
      mode: p.mode,
      payDate: p.payDate ? p.payDate.toISOString().slice(0, 10) : '—',
    },
  }))
  const prefill: Record<string, string> = {}
  if (invoice) prefill.invoiceNo = invoice
  if (order) prefill.orderNo = order
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Payment / Receipt (new)" />
      <DocScreen
        config={toScreenConfig(paymentConfig)}
        mode="new"
        viewRoutePattern="/accounts/payments/[id]"
        prefill={Object.keys(prefill).length > 0 ? prefill : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent payments & receipts"
        columns={paymentConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/payments"
        empty="No vouchers yet — record the first one above."
      />
    </div>
  )
}
