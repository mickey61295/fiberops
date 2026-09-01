/**
 * /inventory/stock-take — the stock take cycle home (SPEC-M42 INV-01).
 * List of takes (ST-####, godown, status open→counting→draft→committed) +
 * the create door (snapshots the godown's CurrentStock buckets). Same
 * services as the agent's create_stock_take / advance_stock_take tools.
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { LifecycleForm } from '@/components/erp/lifecycle-form'
import { createStockTakeAction } from './actions'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  counting: 'bg-amber-100 text-amber-800',
  draft: 'bg-blue-100 text-blue-800',
  committed: 'bg-emerald-100 text-emerald-800',
}

export default async function StockTakePage() {
  const [takes, godowns] = await Promise.all([
    db.stockTake.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
    db.godown.findMany({ orderBy: { code: 'asc' }, select: { code: true, name: true } }),
  ])
  const godownIds = [...new Set(takes.map((t) => t.godownId))]
  const godownById = new Map(
    godownIds.length
      ? (await db.godown.findMany({ where: { id: { in: godownIds } }, select: { id: true, code: true } })).map((g) => [g.id, g.code])
      : [],
  )
  const lineCounts = new Map<string, number>()
  if (takes.length) {
    const rows = await db.stockTakeLine.groupBy({ by: ['takeId'], where: { takeId: { in: takes.map((t) => t.id) } }, _count: true })
    for (const r of rows) lineCounts.set(r.takeId, r._count)
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/inventory" className="hover:text-slate-800 hover:underline">Inventory</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Stock Take</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Stock Take</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Verify the ledger against physical reality: snapshot a godown, walk the floor with the count sheet, commit the
          variance (auto-drafts ADJ- referencing the ST-). Agent door:{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">create_stock_take</code>.
        </p>
      </div>

      <LifecycleForm
        action={createStockTakeAction}
        label="Start a stock take"
        docLabel="Godown code"
        docPlaceholder="G1"
        submitLabel="Create take"
      >
        <div>
          <label className="text-xs text-slate-500">Item type (optional)</label>
          <select name="itemType" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">all items</option>
            <option value="yarn">yarn</option>
            <option value="fabric">fabric</option>
            <option value="accessory">accessory</option>
            <option value="pcs">pcs</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Notes (optional)</label>
          <input name="notes" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" placeholder="Year-end count — main store" />
        </div>
      </LifecycleForm>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Take', 'Godown', 'Lines', 'Status', 'Created', 'Committed'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {takes.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">No stock takes yet — create one above.</td></tr>
            ) : takes.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono font-medium">
                  <Link href={`/inventory/stock-take/${t.id}`} className="hover:text-emerald-700 hover:underline">{t.takeNo}</Link>
                </td>
                <td className="px-3 py-2">{godownById.get(t.godownId) ?? t.godownId}</td>
                <td className="px-3 py-2">{lineCounts.get(t.id) ?? 0}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[t.status] ?? 'bg-slate-100 text-slate-700'}`}>{t.status}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{new Date(t.createdAt).toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2 text-slate-500">{t.committedAt ? new Date(t.committedAt).toISOString().slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {godowns.length > 0 && (
        <p className="text-xs text-slate-400">
          Godowns on file: {godowns.slice(0, 12).map((g) => g.code).join(', ')}{godowns.length > 12 ? ' …' : ''}
        </p>
      )}
    </div>
  )
}
