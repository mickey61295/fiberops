/**
 * /inventory/transfer — Godown Transfer + Ack (SPEC-M3 §8 row 20, item
 * 'godown-transfer'). DocScreen New mode over the NEW transfer_stock service
 * (Wave D tool). NO [id] view — the out+in StockLedger PAIR sharing one GT-
 * #### docNo IS the record. The recent table shows the out legs with their
 * in-leg partner (matched by docNo) rendered as the from→to route.
 */
import { db } from '@/lib/db'
import { godownTransferConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function GodownTransferPage() {
  const outs = await db.stockLedger.findMany({
    where: { txnType: 'godown_transfer_out' },
    orderBy: { docDate: 'desc' },
    take: godownTransferConfig.recentCount ?? 20,
    include: { godown: true },
  })
  const docNos = outs.map((o) => o.docNo).filter((x): x is string => Boolean(x))
  const ins = docNos.length
    ? await db.stockLedger.findMany({
        where: { txnType: 'godown_transfer_in', docNo: { in: docNos } },
        include: { godown: true },
      })
    : []
  const inByDocNo = new Map(ins.map((i) => [i.docNo, i]))

  // id maps for item codes (relation-less itemId — PITFALLS #21)
  const byType: Record<string, Set<string>> = {}
  for (const r of outs) (byType[r.itemType] ??= new Set()).add(r.itemId)
  const codeMaps: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    const model = (db as any)[t]
    if (model && ids.size) {
      const items = await model.findMany({ where: { id: { in: [...ids] } }, select: { id: true, code: true } })
      codeMaps[t] = new Map(items.map((i: { id: string; code: string }) => [i.id, i.code]))
    }
  }

  const rows = outs.map((o) => {
    const partner = inByDocNo.get(o.docNo)
    return {
      id: o.id,
      cells: {
        docNo: o.docNo ?? '—',
        itemType: o.itemType,
        itemCode: codeMaps[o.itemType]?.get(o.itemId) ?? o.itemId,
        route: `${o.godown?.code ?? '?'} → ${partner?.godown?.code ?? '?'}`,
        qty: `${(o.outKgs || o.outPcs || 0).toLocaleString('en-IN')}${o.outPcs ? ' pcs' : ' kgs'}`,
        docDate: o.docDate ? o.docDate.toISOString().slice(0, 10) : '—',
      },
    }
  })
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/inventory" label="Inventory" title="Godown Transfer (new)" />
      <DocScreen
        config={toScreenConfig(godownTransferConfig)}
        mode="new"
      />
      <RecentDocsTable
        title="Recent transfers (out → in legs share one GT number)"
        columns={godownTransferConfig.listColumns}
        rows={rows}
        empty="No transfers yet — post the first one above."
      />
    </div>
  )
}
