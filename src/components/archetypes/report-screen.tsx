/**
 * ReportScreen engine — SPEC-M6 §4. SERVER component (the table holds no
 * client state), the RH archetype: pack breadcrumb + title, param form (the
 * SAME RegisterFilterBar over the report's declared filters), summary band,
 * config-driven table with W2 drill hrefs, totals band, CSV link (sibling
 * /csv route), PrintButton (W7) + the print-only copy banner, pagination.
 * The runner page parses searchParams → REPORT_SERVICES[slug] → hands over.
 */
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import { RegisterFilterBar } from '@/components/erp/register-filter-bar'
import { PrintButton } from '@/components/erp/print-button'
import type { ReportConfig } from '@/lib/erp/report-configs/types'
import type { RegisterConfig } from '@/lib/erp/register-configs/types'
import type { RegisterResult } from '@/lib/erp/registers/types'
import { filtersAsText } from '@/lib/erp/registers/resolve'

const fmtINR = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN')
const fmtQty = (n: number) => (n ? (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 })) : '—')
const fmtDate = (d: unknown) => (d ? new Date(d as string | Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—')

const BADGE_TONE: Record<string, string> = {
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  purchase_grn: 'bg-sky-50 text-sky-700 border-sky-200',
  sales_delivery: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  invoice: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-amber-50 text-amber-700 border-amber-200',
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  issued: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  conditional: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
}

function Cell({ col, value }: { col: ReportConfig['columns'][number]; value: unknown }) {
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

export interface ReportScreenProps {
  config: ReportConfig
  result: RegisterResult
  /** canonical runner route ('/reports/order-register') for filter/pagination/csv URLs */
  route: string
  /** flattened active searchParams (values only, no page/format/copy) */
  params: Record<string, string>
  page: number
  limit: number
  /** print header (AppOption print.* — SPEC-M6 §5); null = no header line */
  printHeader?: { companyName: string; address?: string; gstin?: string } | null
}

export function ReportScreen({ config, result, route, params, page, limit, printHeader }: ReportScreenProps) {
  const withParams = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...params, ...overrides })) if (v) sp.set(k, v)
    const qs = sp.toString()
    return qs ? `${route}?${qs}` : route
  }
  const askText = [config.askPrompt, filtersAsText(config as unknown as RegisterConfig, params)].filter(Boolean).join(' — ')
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
  const copy = params.copy ?? 'original'
  const copyLabel = copy.charAt(0).toUpperCase() + copy.slice(1)

  return (
    <div className="space-y-4">
      {/* print-only header + copy banner (W7) */}
      <div className="hidden print:block print:mb-4">
        <div className="text-center">
          <div className="text-lg font-bold">{printHeader?.companyName ?? 'FiberOps'}</div>
          {printHeader?.address && <div className="text-xs">{printHeader.address}</div>}
          {printHeader?.gstin && <div className="text-xs">GSTIN: {printHeader.gstin}</div>}
          <div className="mt-1 text-sm font-semibold">{config.title}{copyLabel !== 'Original' ? ` — ${copyLabel} Copy` : ''}</div>
          <div className="text-[10px] text-slate-500">Printed {new Date().toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* breadcrumb + title (screen) */}
      <div className="print:hidden">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/reports" className="hover:text-slate-800 hover:underline">Reports</Link>
          <span>/</span>
          <Link href={`/reports/packs#${config.pack}`} className="hover:text-slate-800 hover:underline">{config.pack.replace('-', ' & ')} Pack</Link>
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
            <PrintButton route={route} />
          </div>
        </div>
        {/* P0-⑦ — agent-door tool chips removed from the operator surface
            (GAP-ANALYSIS §6; the Ask-agent button IS the agent door) */}
      </div>

      <div className="print:hidden">
        <RegisterFilterBar config={config as unknown as RegisterConfig} route={route} params={params} />
      </div>

      <div className="text-xs text-slate-500 print:text-[10px]">{result.summary}</div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm print:shadow-none print:rounded-none">
        <table className="w-full text-sm print:text-[11px]">
          <thead>
            <tr className="border-b bg-slate-50/80 print:bg-white">
              {config.columns.map((c) => (
                <th key={c.name} className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap print:text-black ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
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
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/60 print:hover:bg-white">
                    {config.columns.map((c, i) => (
                      <td key={c.name} className={`px-3 py-2 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''} ${c.mono ? 'font-mono text-[13px]' : ''} ${i === 0 && row.href ? 'font-medium' : ''}`}>
                        {i === 0 && row.href ? (
                          <Link href={row.href} className="inline-flex items-center gap-1 text-slate-800 hover:text-emerald-700 hover:underline print:text-black print:no-underline">
                            <Cell col={c} value={firstVal} />
                            <Link2 className="h-3 w-3 text-slate-300 print:hidden" />
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

      {/* totals band */}
      {result.totals && result.totals.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-lg border bg-slate-50/60 px-4 py-2.5 text-[13px] print:bg-white">
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

      {/* pagination (screen only) */}
      <div className="flex items-center justify-between text-xs text-slate-500 print:hidden">
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
