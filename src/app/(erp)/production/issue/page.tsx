/**
 * /production/issue — Issue to Line (SPEC-M3 §8 row 9, item 'issue-to-line').
 * DocScreen New mode + recent issues. Form door → planLineIssue — the same
 * service as issue_to_line (ADR-001). ?order=SO-… prefills orderNo.
 */
import { db } from '@/lib/db'
import { lineIssueConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function IssueToLinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.lineIssue.findMany({
    orderBy: { issueDate: 'desc' },
    take: lineIssueConfig.recentCount ?? 20,
    include: { order: true, line: true },
  })
  const rows = recent.map((li) => ({
    id: li.id,
    cells: {
      issueNo: li.issueNo,
      orderNo: li.order?.orderNo ?? '—',
      lineName: li.line ? `${li.line.code}${li.line.name ? ' · ' + li.line.name : ''}` : '—',
      qty: (li.qty || 0).toLocaleString('en-IN'),
      issueDate: li.issueDate ? li.issueDate.toISOString().slice(0, 10) : '—',
      status: li.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/production" label="Production" title="Issue to Line (new)" />
      <DocScreen
        config={toScreenConfig(lineIssueConfig)}
        mode="new"
        viewRoutePattern="/production/issue/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent line issues"
        columns={lineIssueConfig.listColumns}
        rows={rows}
        hrefBase="/production/issue"
        empty="No line issues yet — issue cut pieces above."
      />
    </div>
  )
}
