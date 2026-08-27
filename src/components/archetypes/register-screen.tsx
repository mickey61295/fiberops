/**
 * RegisterScreen engine — SPEC-M4 §6. SERVER component (the table holds no
 * client state): title + breadcrumb, filter bar (client, pushes searchParams),
 * summary, Ask-about-this-data (W5(b)), CSV export link, config-driven table
 * with W2 drill-down hrefs, totals band, pagination. The page (route file)
 * parses searchParams → calls the REGISTER_SERVICES entry → hands over here;
 * CSV export is a sibling `<register>/csv/route.ts` (pages cannot return
 * Responses — Next.js rule, hit in Wave A).
 */
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import { RegisterFilterBar } from '@/components/erp/register-filter-bar'
import type { RegisterConfig } from '@/lib/erp/register-configs/types'
import type { RegisterResult } from '@/lib/erp/registers/types'
import { filtersAsText } from '@/lib/erp/registers/resolve'

const fmtINR = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN')
const fmtQty = (n: number) => (n ? (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 })) : '—')
const fmtDate = (d: unknown) => (d ? new Date(d as string | Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—')

const BADGE_TONE: Record<string, string> = {
  // greens
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'godown_transfer_in': 'bg-sky-50 text-sky-700 border-sky-200',
  'stock_adjustment_add': 'bg-sky-50 text-sky-700 border-sky-200',
  purchase_grn: 'bg-sky-50 text-sky-700 border-sky-200',
  process_receipt: 'bg-sky-50 text-sky-700 border-sky-200',
  ready_to_cut_in: 'bg-sky-50 text-sky-700 border-sky-200',
  sales_delivery: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  // ambers
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-amber-50 text-amber-700 border-amber-200',
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  issued: 'bg-amber-50 text-amber-700 border-amber-200',
  planned: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  'process_delivery': 'bg-amber-50 text-amber-700 border-amber-200',
  'godown_transfer_out': 'bg-amber-50 text-amber-700 border-amber-200',
  'stock_adjustment_less': 'bg-amber-50 text-amber-700 border-amber-200',
  'ready_to_cut_out': 'bg-amber-50 text-amber-700 border-amber-200',
  // reds
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  sales_return: 'bg-red-50 text-red-700 border-red-200',
  cut_ack: 'bg-red-50 text-red-700 border-red-200',
}

function Cell({ col, value }: { col: RegisterConfig['columns'][number]; value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-300">—</span>
  switch (col.format) {
    case 'date':
      return <>{fmtDate(value)}</>
    case 'inr':
      return <>{fmtINR(Number(value))}</>
    case 'qty':
      return <>{fmtQty(Number(value))}</>
    case 'int':
      return <>{Number(value).toLocaleString('en-IN')}</>
    case 'badge':
      return (
        <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${BADGE_TONE[String(value)] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {String(value).replaceAll('_', ' ')}
        </Badge>
      )
    default:
      return <>{String(value)}</>
  }
}

export interface RegisterScreenProps {
  config: RegisterConfig
  result: RegisterResult
  /** canonical route ('/inventory/ledger') for filter/pagination/csv URLs */
  route: string
  groupLabel: string
  groupHref: string
  /** flattened active searchParams (values only, no page/format) */
  params: Record<string, string>
  page: number
  limit: number
}

export function RegisterScreen({ config, result, route, groupLabel, groupHref, params, page, limit }: RegisterScreenProps) {
  const withParams = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...params, ...overrides })) if (v) sp.set(k, v)
    const qs = sp.toString()
    return qs ? `${route}?${qs}` : route
  }
  const askText = [config.askPrompt, filtersAsText(config, params)].filter(Boolean).join(' — ')
  const csvHref = (() => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    sp.set('limit', '500')
    const qs = sp.toString()
    return qs ? `${route}/csv?${qs}` : `${route}/csv`
  })()
  const shown = result.rows.length
  const from = result.count === 0 ? 0 : (page - 1) * limit + 1
  const to = (page - 1) * limit + shown
  const hasNext = to < result.count

  return (
    <div className="space-y-4">
      {/* breadcrumb + title */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href={groupHref} className="hover:text-slate-800 hover:underline">{groupLabel}</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{config.title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{config.title}</h1>
            {config.description && <p className="text-sm text-slate-500 mt-0.5">{config.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <AskAgentButton prompt={askText} label="Ask about this data" />
            <Button asChild size="sm" variant="outline">
              <Link href={csvHref}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Link>
            </Button>
          </div>
        </div>
        {config.agentTools.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Agent door:</span>
            {config.agentTools.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      <RegisterFilterBar config={config} route={route} params={params} />

      <div className="text-xs text-slate-500">{result.summary}</div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {config.columns.map((c) => (
                <th key={c.name} className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length} className="px-3 py-12 text-center text-sm text-slate-400">
                  {config.emptyMessage ?? 'Nothing to show.'}
                </td>
              </tr>
            ) : (
              result.rows.map((row) => {
                const firstCol = config.columns[0]
                const firstVal = row[firstCol.name]
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/60">
                    {config.columns.map((c, i) => (
                      <td key={c.name} className={`px-3 py-2 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''} ${c.mono ? 'font-mono text-[13px]' : ''} ${i === 0 && row.href ? 'font-medium' : ''}`}>
                        {i === 0 && row.href ? (
                          <Link href={row.href} className="inline-flex items-center gap-1 text-slate-800 hover:text-emerald-700 hover:underline">
                            <Cell col={c} value={firstVal} />
                            <Link2 className="h-3 w-3 text-slate-300" />
                          </Link>
                        ) : (
                          <Cell col={c} value={row[c.name]} />
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* totals band (SPEC-M4 §6): label: value chips, inr-formatted where numeric */}
      {result.totals && result.totals.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-lg border bg-slate-50/60 px-4 py-2.5 text-[13px]">
          {result.totals.map((t) => (
            <div key={t.label} className="whitespace-nowrap">
              <span className="text-slate-500">{t.label}: </span>
              <span className="font-semibold text-slate-800">
                {typeof t.value === 'number' ? t.value.toLocaleString('en-IN') : t.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* pagination */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>Rows {from}–{to} of {result.count}</div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8" disabled={page <= 1}>
            <Link href={withParams({ page: String(page - 1) })} aria-disabled={page <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8" disabled={!hasNext}>
            <Link href={withParams({ page: String(page + 1) })} aria-disabled={!hasNext}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

