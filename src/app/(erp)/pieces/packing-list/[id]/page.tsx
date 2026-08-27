/**
 * /pieces/packing-list/[id] — Packing List view (SPEC-M5 §7-D-29). Header
 * card + carton lines table + the W6 despatch recon (§10: carton pcs vs
 * despatched pcs, rendered via the shared ReconCard).
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { ReconCard } from '@/components/erp/recon-card'
import type { ReconResult } from '@/lib/erp/registers/recon'

export const dynamic = 'force-dynamic'

export default async function PackingListViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pack = await db.packingList
    .findUnique({ where: { id }, include: { lines: true } })
    .catch(() => null)
  if (!pack) notFound()

  // despatchId/orderId/buyerId are free FK cols (PITFALLS #21) — lookups
  const despatch = pack.despatchId ? await db.pcsDespatch.findUnique({ where: { id: pack.despatchId } }).catch(() => null) : null
  const order = pack.orderId ? await db.order.findUnique({ where: { id: pack.orderId } }).catch(() => null) : null
  const buyer = pack.buyerId ? await db.buyer.findUnique({ where: { id: pack.buyerId } }).catch(() => null) : null

  // W6 recon (§10): carton pcs vs the despatch's totalPcs
  const packedPcs = pack.lines.reduce((s, l) => s + l.qty, 0)
  const despatchedPcs = despatch?.totalPcs ?? 0
  const recon: ReconResult | null = despatch
    ? {
        title: 'Cartons ↔ Despatch',
        mathLine: `packed ${packedPcs.toLocaleString('en-IN')} pcs · despatched ${despatchedPcs.toLocaleString('en-IN')} · variance ${(packedPcs - despatchedPcs).toLocaleString('en-IN')} pcs`,
        balance: packedPcs - despatchedPcs,
        balanceLabel: 'Packed minus despatched (0 = cartons match the DC)',
        rowsTitle: 'Cartons in this list',
        rows: pack.lines.map((l) => ({
          label: `${l.cartonNo} · ${l.styleNo}`,
          value: `${l.qty.toLocaleString('en-IN')} pcs · ${l.netKgs ?? 0} kgs`,
          href: null,
        })),
      }
    : null

  const colourIds = [...new Set(pack.lines.map((l) => l.colourId).filter((c): c is string => !!c))]
  const sizeIds = [...new Set(pack.lines.map((l) => l.sizeId).filter((s): s is string => !!s))]
  const colours = colourIds.length ? await db.colour.findMany({ where: { id: { in: colourIds } }, select: { id: true, name: true } }) : []
  const sizes = sizeIds.length ? await db.size.findMany({ where: { id: { in: sizeIds } }, select: { id: true, name: true } }) : []
  const colourById = new Map(colours.map((c) => [c.id, c.name]))
  const sizeById = new Map(sizes.map((s) => [s.id, s.name]))

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/pieces/packing-list" label="Packing Lists" title={`Packing List · ${pack.packNo}`} />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Pack No</div>
            <div className="font-mono font-medium">{pack.packNo}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Despatch DC</div>
            <div className="font-medium">{despatch?.dcNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Order</div>
            <div className="font-medium">{order?.orderNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Buyer</div>
            <div className="font-medium">{buyer?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Cartons</div>
            <div className="font-medium">{pack.totalCartons}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Total Pcs</div>
            <div className="font-medium">{pack.totalPcs.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Net / Gross Kgs</div>
            <div className="font-medium">{pack.netKgs ?? 0} / {pack.grossKgs ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <div className="font-medium capitalize">{pack.status}</div>
          </div>
        </div>
        {pack.notes && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{pack.notes}</div>
        )}
      </div>

      {recon && <ReconCard recon={recon} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Carton</th>
              <th className="px-4 py-2.5">Style</th>
              <th className="px-4 py-2.5">Colour</th>
              <th className="px-4 py-2.5">Size</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Net Kgs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pack.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 font-mono">{l.cartonNo}</td>
                <td className="px-4 py-2.5">{l.styleNo}</td>
                <td className="px-4 py-2.5">{l.colourId ? colourById.get(l.colourId) ?? '—' : '—'}</td>
                <td className="px-4 py-2.5">{l.sizeId ? sizeById.get(l.sizeId) ?? '—' : '—'}</td>
                <td className="px-4 py-2.5 text-right">{l.qty.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right">{l.netKgs ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
