/**
 * /inventory/rolls — Roll Tracking / Split (SPEC-M5 §7-D-34). The WRITE
 * door: DocScreen New mode over planRollSplit (RSP-#### out+in pair — the
 * stock-adjustment twin). Below it, the read side: fabric lots holding mtrs
 * (CurrentStock rollup per lot, the lots-register view scoped to rolls).
 */
import { db } from '@/lib/db'
import { rollSplitConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function RollsPage() {
  // Recent splits: StockLedger RSP rows grouped by docNo (transfer_out carries the pair)
  const splitRows = await db.stockLedger.findMany({
    where: { docNo: { startsWith: 'RSP-' }, txnType: 'transfer_out' },
    orderBy: { docDate: 'desc' },
    take: rollSplitConfig.recentCount ?? 20,
  })
  const inRows = await db.stockLedger.findMany({
    where: { docNo: { in: splitRows.map((r) => r.docNo).filter((d): d is string => !!d) }, txnType: 'transfer_in' },
    select: { docNo: true, lotId: true, inMtrs: true },
  })
  const inByDocNo = new Map(inRows.map((r) => [r.docNo, r]))
  const [outLots, inLots, fabricIds] = await Promise.all([
    db.lot.findMany({ where: { id: { in: splitRows.map((r) => r.lotId ?? '') } }, select: { id: true, lotNo: true } }),
    db.lot.findMany({ where: { id: { in: inRows.map((r) => r.lotId ?? '') } }, select: { id: true, lotNo: true } }),
    db.fabric.findMany({ where: { id: { in: splitRows.map((r) => r.itemId) } }, select: { id: true, code: true } }),
  ])
  const lotNoById = new Map([...outLots, ...inLots].map((l) => [l.id, l.lotNo]))
  const fabricById = new Map(fabricIds.map((f) => [f.id, f.code]))

  // Read side: fabric lots holding mtrs (the rolls to split)
  const stocks = await db.currentStock.findMany({
    where: { itemType: 'fabric', mtrs: { gt: 0 }, lotId: { not: null } },
    include: { godown: true },
    take: 100,
  })
  const lotIds = [...new Set(stocks.map((s) => s.lotId!))]
  const lots = lotIds.length ? await db.lot.findMany({ where: { id: { in: lotIds } }, include: { party: true } }) : []
  const rollup = new Map<string, { lotNo: string; party: string; mtrs: number; kgs: number; godowns: Set<string> }>()
  for (const s of stocks) {
    const lot = lots.find((l) => l.id === s.lotId)
    if (!lot) continue
    const acc = rollup.get(lot.id) ?? {
      lotNo: lot.lotNo, party: lot.party?.name ?? '—', mtrs: 0, kgs: 0, godowns: new Set<string>(),
    }
    acc.mtrs += s.mtrs
    acc.kgs += s.kgs
    if (s.godown?.code) acc.godowns.add(s.godown.code)
    rollup.set(lot.id, acc)
  }
  const lotRows = [...rollup.values()].sort((a, b) => b.mtrs - a.mtrs)

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/inventory" label="Inventory" title="Roll Tracking / Split (new)" />
      <DocScreen
        config={toScreenConfig(rollSplitConfig)}
        mode="new"
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Recent splits</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Split No</th>
              <th className="px-4 py-2.5">Source Lot</th>
              <th className="px-4 py-2.5">New Lot</th>
              <th className="px-4 py-2.5">Fabric</th>
              <th className="px-4 py-2.5 text-right">Mtrs</th>
              <th className="px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {splitRows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">No splits yet — pick a lot with mtrs below and split it above.</td></tr>
            ) : splitRows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-mono">{r.docNo}</td>
                <td className="px-4 py-2.5">{r.lotId ? lotNoById.get(r.lotId) ?? '—' : '—'}</td>
                <td className="px-4 py-2.5">{inByDocNo.get(r.docNo)?.lotId ? lotNoById.get(inByDocNo.get(r.docNo)!.lotId!) ?? '—' : '—'}</td>
                <td className="px-4 py-2.5">{fabricById.get(r.itemId) ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">{r.outMtrs?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5">{r.docDate ? r.docDate.toISOString().slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Lots holding mtrs (the rolls)</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Lot / Roll</th>
              <th className="px-4 py-2.5">Party</th>
              <th className="px-4 py-2.5 text-right">Mtrs</th>
              <th className="px-4 py-2.5 text-right">Kgs</th>
              <th className="px-4 py-2.5">Godowns</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lotRows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No lot-keyed fabric stock yet — receive fabric with a lot to track rolls.</td></tr>
            ) : lotRows.map((l) => (
              <tr key={l.lotNo}>
                <td className="px-4 py-2.5 font-mono">{l.lotNo}</td>
                <td className="px-4 py-2.5">{l.party}</td>
                <td className="px-4 py-2.5 text-right">{l.mtrs.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right">{l.kgs.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5">{[...l.godowns].join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
