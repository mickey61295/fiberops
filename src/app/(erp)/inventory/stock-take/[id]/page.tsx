/**
 * /inventory/stock-take/[id] — one take (SPEC-M42 INV-01): the count grid
 * (system snapshot vs counted, enterable while open/counting), the variance
 * preview, the advance door (open→counting→draft→committed — committing
 * posts the ADJ- variance legs), and the count-sheet print link.
 * Same services as the record_stock_counts / advance_stock_take tools.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { recordCountsAction, advanceStockTakeAction } from '../actions'
import { StockTakeForm } from '../count-forms'
import { DocPrintLink } from '@/components/erp/doc-print-button'

export const dynamic = 'force-dynamic'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style' }
const UOMS = ['kgs', 'mtrs', 'pcs', 'bags'] as const
const NEXT_STATUS: Record<string, string | null> = { open: 'counting', counting: 'draft', draft: 'committed', committed: null }
const EPS = 1e-9

export default async function StockTakeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let take = await db.stockTake.findUnique({ where: { id } }).catch(() => null)
  if (!take) take = await db.stockTake.findUnique({ where: { takeNo: decodeURIComponent(id) } }).catch(() => null)
  if (!take) notFound()

  const [lines, godown] = await Promise.all([
    db.stockTakeLine.findMany({ where: { takeId: take.id } }),
    db.godown.findUnique({ where: { id: take.godownId } }),
  ])

  // item codes once (StockTakeLine carries itemId — PITFALLS #44; per-model
  // select: only the STYLE master carries styleNo — asking yarn/fabric for it
  // throws Prisma validation, which the catch would swallow into raw cuids)
  const byType: Record<string, Set<string>> = {}
  for (const l of lines) (byType[l.itemType] ??= new Set()).add(l.itemId)
  const codeByItemId = new Map<string, string>()
  for (const [t, ids] of Object.entries(byType)) {
    const model = ITEM_MODELS[t] ? (db as unknown as Record<string, { findMany: (a: unknown) => Promise<Array<{ id: string; code?: string; styleNo?: string }>> }>)[ITEM_MODELS[t]] : null
    if (!model || !ids.size) continue
    const select = t === 'pcs' ? { id: true, styleNo: true } : { id: true, code: true }
    const items = await model.findMany({ where: { id: { in: [...ids] } }, select }).catch(() => [])
    for (const i of items) codeByItemId.set(i.id, (i.code ?? i.styleNo) ?? i.id)
  }

  const editable = take.status === 'open' || take.status === 'counting'
  const next = NEXT_STATUS[take.status]

  const varianceOf = (l: (typeof lines)[number], uom: (typeof UOMS)[number]) => {
    const cap = uom[0].toUpperCase() + uom.slice(1)
    const counted = l[`counted${cap}` as `counted${'Kgs' | 'Mtrs' | 'Pcs' | 'Bags'}`]
    const system = l[`system${cap}` as `system${'Kgs' | 'Mtrs' | 'Pcs' | 'Bags'}`]
    if (counted == null) return null
    return (counted as number) - (system as number)
  }

  let legs = 0
  for (const l of lines) for (const u of UOMS) if (varianceOf(l, u) != null && Math.abs(varianceOf(l, u)!) > EPS) legs++

  // the count grid (shared by the editable form and the frozen read view)
  const countGrid = (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-slate-50/80">
          {['Item', 'Sys kgs', 'Count kgs', 'Var', 'Sys mtrs', 'Count mtrs', 'Var', 'Sys pcs', 'Count pcs', 'Var'].map((h, i) => (
            <th key={`h-${i}-${h}`} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => {
          const code = codeByItemId.get(l.itemId) ?? l.itemId
          return (
            <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50/60">
              <td className="px-3 py-2 font-mono">
                <span className="font-medium">{code}</span>
                <span className="ml-1 text-[10px] text-slate-400">{l.itemType}</span>
                <input type="hidden" name={`code.${l.id}`} value={code} />
                <input type="hidden" name={`type.${l.id}`} value={l.itemType} />
              </td>
              {(['kgs', 'mtrs', 'pcs'] as const).map((uom) => {
                const cap = uom[0].toUpperCase() + uom.slice(1)
                const system = l[`system${cap}` as `system${'Kgs' | 'Mtrs' | 'Pcs' | 'Bags'}`] as number
                const counted = l[`counted${cap}` as `counted${'Kgs' | 'Mtrs' | 'Pcs' | 'Bags'}`]
                const v = varianceOf(l, uom)
                return (
                  <td key={uom} className="whitespace-nowrap">
                    <span className={Math.abs(system) > EPS ? 'px-3 py-2' : 'px-3 py-2 text-slate-300'}>
                      {Math.abs(system) > EPS ? Math.round(system * 100) / 100 : '—'}
                    </span>
                    {Math.abs(system) > EPS && (
                      <>
                        {editable ? (
                          <input
                            name={`${uom}.${l.id}`}
                            defaultValue={counted == null ? '' : String(counted)}
                            inputMode="decimal"
                            className="h-8 w-20 rounded border border-input bg-transparent px-2 text-sm"
                            placeholder="count"
                            data-testid={`count-${uom}`}
                          />
                        ) : (
                          <span className="px-1 py-2 text-sm">{counted == null ? '—' : Math.round(counted * 100) / 100}</span>
                        )}
                        <span className={`px-1 text-[11px] ${v == null ? 'text-slate-300' : Math.abs(v) <= EPS ? 'text-slate-400' : v > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {v == null ? '' : v > 0 ? `+${Math.round(v * 100) / 100}` : Math.round(v * 100) / 100}
                        </span>
                      </>
                    )}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/inventory" className="hover:text-slate-800 hover:underline">Inventory</Link>
          <span>/</span>
          <Link href="/inventory/stock-take" className="hover:text-slate-800 hover:underline">Stock Take</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{take.takeNo}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">{take.takeNo} · {godown?.code ?? take.godownId}</h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">{take.status}</span>
          <DocPrintLink docType="stock-take" id={take.takeNo} label="Count sheet" />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          {lines.length} line{lines.length === 1 ? '' : 's'} · created {new Date(take.createdAt).toISOString().slice(0, 10)}
          {take.committedAt ? ` · committed ${new Date(take.committedAt).toISOString().slice(0, 10)}` : ''}
          {take.status === 'draft' ? ` · ${legs} variance leg${legs === 1 ? '' : 's'} will post on commit` : ''}
          {take.notes ? ` · ${take.notes}` : ''}
        </p>
      </div>

      {/* advance door — the state graph, one legal step at a time */}
      {next && (
        <StockTakeForm
          action={advanceStockTakeAction}
          submitLabel={next === 'counting' ? 'Start counting' : next === 'draft' ? 'Freeze as draft' : 'Commit variance (ADJ-)'}
          className="rounded-lg border bg-white p-4 shadow-sm"
          footerClassName="flex flex-wrap items-center gap-3 pt-3"
          submitClassName="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          testId="st-advance-form"
        >
          <input type="hidden" name="takeNo" value={take.takeNo} />
          <input type="hidden" name="to" value={next} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-slate-700">Advance</div>
            <div className="text-xs text-slate-500">
              {next === 'counting' ? 'Begin the physical count (lines stay editable).' :
               next === 'draft' ? 'Freeze the counts — requires every system-non-zero uom counted.' :
               `Commit: post ${legs} ADJ- variance leg${legs === 1 ? '' : 's'} and make the take terminal.`}
            </div>
          </div>
        </StockTakeForm>
      )}

      {/* the count grid — editable while open|counting (the form), frozen after */}
      {editable ? (
        <StockTakeForm
          action={recordCountsAction}
          submitLabel="Save counts"
          className="overflow-x-auto rounded-lg border bg-white shadow-sm"
          hint="Only the rows you fill are recorded (per uom)."
          testId="st-count-form"
        >
          <input type="hidden" name="takeNo" value={take.takeNo} />
          {countGrid}
        </StockTakeForm>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">{countGrid}</div>
      )}
    </div>
  )
}
