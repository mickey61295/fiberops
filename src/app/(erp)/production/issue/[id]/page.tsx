/**
 * /production/issue/[id] — Line Issue view (SPEC-M3 §8 row 9 view mode).
 * Resolves by db id OR issueNo.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { lineIssueConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function LineIssueViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, line: true }
  let li = await db.lineIssue.findUnique({ where: { id }, include }).catch(() => null)
  if (!li) li = await db.lineIssue.findUnique({ where: { issueNo: id }, include })
  if (!li) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    issueNo: li.issueNo,
    orderNo: li.order?.orderNo ?? '',
    lineCode: li.line?.code ?? '',
    qty: li.qty,
    issueDate: d(li.issueDate),
    styleNo: li.styleNo ?? '',
    notes: li.notes ?? '',
  }
  const state = li.order ? computeChainState(li.order) : undefined
  const chainCtx = li.order ? { orderNo: li.order.orderNo, id: li.order.id } : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/production/issue" label="Line Issues" title={li.issueNo} />
        <DocPrintLink docType="line-issue" id={li.issueNo} />
      </div>
      <DocScreen
        config={toScreenConfig(lineIssueConfig)}
        mode="view"
        docNo={li.issueNo}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
    </div>
  )
}
