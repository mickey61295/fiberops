/**
 * /pieces/transfer — Pcs Transfer (SPEC-M6 §2 row 28, legacy FrmPcsGodTransfer).
 * transfer VARIANT: itemType 'pcs' fixed, PT-#### docNo (planPcsTransfer —
 * pcs buckets key itemId = the ORDER id; the base planTransfer takes
 * item-master codes). Godown_transfer_out/in pair — net zero across godowns.
 * NO [id] view — the StockLedger pair IS the record.
 */
import { db } from '@/lib/db'
import { pcsTransferConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PcsTransferPage() {
  const outs = await db.stockLedger.findMany({
    where: { txnType: 'godown_transfer_out', itemType: 'pcs', docNo: { startsWith: 'PT-' } },
    orderBy: { docDate: 'desc' },
    take: pcsTransferConfig.recentCount ?? 20,
    include: { godown: true },
  })
  const docNos = outs.map((r) => r.docNo).filter(Boolean) as string[]
  const ins = docNos.length
    ? await db.stockLedger.findMany({
        where: { txnType: 'godown_transfer_in', docNo: { in: docNos } },
        include: { godown: true },
      })
    : []
  const inByDoc = new Map(ins.map((r) => [r.docNo, r]))
  const orderIds = [...new Set(outs.map((r) => r.orderId).filter(Boolean))] as string[]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const orderById = new Map(orders.map((o) => [o.id, o.orderNo]))
  const rows = outs.map((r) => {
    const inn = inByDoc.get(r.docNo)
    return {
      id: r.id,
      cells: {
        docNo: r.docNo ?? '—',
        orderNo: r.orderId ? orderById.get(r.orderId) ?? '—' : '—',
        from: r.godown?.code ?? '—',
        to: inn?.godown?.code ?? '—',
        qty: String(r.outPcs || 0),
        docDate: r.docDate ? r.docDate.toISOString().slice(0, 10) : '—',
      },
    }
  })
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/pieces" label="Pieces" title="Pcs Transfer (new)" />
      <DocScreen config={toScreenConfig(pcsTransferConfig)} mode="new" />
      <RecentDocsTable
        title="Recent pcs transfers"
        columns={pcsTransferConfig.listColumns}
        rows={rows}
        empty="No pcs transfers yet — move the first finished pieces above."
      />
    </div>
  )
}
