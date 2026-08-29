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
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import { RegisterFilterBar } from '@/components/erp/register-filter-bar'
import { RegisterRows } from '@/components/erp/register-rows'
import type { RegisterConfig } from '@/lib/erp/register-configs/types'
import type { RegisterResult } from '@/lib/erp/registers/types'
import { filtersAsText } from '@/lib/erp/registers/resolve'

/** Register rows (incl. Cell + badge tones) moved to the client component
 *  RegisterRows (SPEC-M17 §2-E) — full-row click + ↑↓/Enter navigation. */

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
          <RegisterRows columns={config.columns} rows={result.rows} emptyMessage={config.emptyMessage} />
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

