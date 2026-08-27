/**
 * /hr/wage-payments — Wage Payments (SPEC-M5 §7-B-21, item 'wage-payments',
 * legacy FrmPaymentReg_Wages). VARIANT config over planWagePayment (pins
 * direction='out'). ERRATUM 7: the party picker is filtered server-side to
 * employee parties (partyType=employee). Views reuse /accounts/payments/[id];
 * recent list narrows to employee-party payments.
 */
import { db } from '@/lib/db'
import { wagePaymentsConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function WagePaymentsPage() {
  const recent = await db.payment.findMany({
    where: { direction: 'out', party: { partyType: 'employee' } },
    orderBy: { payDate: 'desc' },
    take: wagePaymentsConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((p) => ({
    id: p.id,
    cells: {
      voucherNo: p.voucherNo,
      partyName: p.party?.name ?? '—',
      amount: (p.amount || 0).toLocaleString('en-IN'),
      mode: p.mode,
      payDate: p.payDate ? p.payDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/hr" label="HR & Payroll" title="Wage Payments (new)" />
      <DocScreen
        config={toScreenConfig(wagePaymentsConfig)}
        mode="new"
        viewRoutePattern="/accounts/payments/[id]"
      />
      <RecentDocsTable
        title="Recent wage payments (employee parties)"
        columns={wagePaymentsConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/payments"
        empty="No wage payments yet — pay the first employee above (create employee-type parties in Masters → Parties)."
      />
    </div>
  )
}
