/**
 * /accounts/production-bills — Production Bills (SPEC-M5 §7-D-33). DocScreen
 * New mode over planProductionBill (period piece-rate bill → Journal Dr
 * Production Wages / Cr Wage Payable — §7-B-20 accounts, §7-D-33 per-dept/
 * operator granularity). Recent list narrows to those wage-bill journals;
 * rows drill to /accounts/journal/[id] (W2).
 */
import { db } from '@/lib/db'
import { productionBillConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ProductionBillsPage() {
  const recent = await db.journal.findMany({
    where: { voucherType: 'journal', debitAccount: 'Production Wages' },
    orderBy: { createdAt: 'desc' },
    take: productionBillConfig.recentCount ?? 20,
  })
  const rows = recent.map((j) => {
    // narration carries "N entries · N pcs" from the service
    const m = j.narration?.match(/(\d+) entries · (\d+) pcs/)
    return {
      id: j.id,
      cells: {
        voucherNo: j.voucherNo,
        amount: (j.amount || 0).toLocaleString('en-IN'),
        entries: m?.[1] ?? '—',
        qty: m?.[2] ?? '—',
        narration: j.narration ?? '—',
        date: j.date ? j.date.toISOString().slice(0, 10) : '—',
      },
    }
  })
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Production Bills (piece-rate)" />
      <DocScreen
        config={toScreenConfig(productionBillConfig)}
        mode="new"
        viewRoutePattern="/accounts/journal/[id]"
      />
      <RecentDocsTable
        title="Recent production bills (Dr Production Wages / Cr Wage Payable)"
        columns={productionBillConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/journal"
        empty="No production bills yet — compute the period bill above (defaults to the last 30 days)."
      />
    </div>
  )
}
