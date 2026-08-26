import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/**
 * SPEC-M3 §8 — shared presentational pieces for the doc screens' New-mode
 * pages (server-rendered): the breadcrumb strip and the "recent docs" table.
 * The Wave B /orders/new page inlined these; Wave C's 11 screens extract them
 * so every doc family renders identically (config-driven columns).
 */

export function DocBreadcrumb({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href={href} className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700">
        <ChevronLeft className="h-4 w-4" /> {label}
      </Link>
      <span className="text-slate-300">/</span>
      <h1 className="text-base font-semibold">{title}</h1>
    </div>
  )
}

export interface RecentDocRow {
  /** db id — used to build the view link */
  id: string
  /** pre-formatted display values keyed by listColumns name */
  cells: Record<string, string>
  /** optional per-row action target (e.g. Receive → ?dcNo=…) */
  actionHref?: string
}

export interface RecentDocsTableProps {
  title: string
  columns: { name: string; label: string; align?: 'left' | 'right' }[]
  rows: RecentDocRow[]
  /** view-route base for the first column link ('/programs' → /programs/<id>) */
  hrefBase?: string
  empty: string
  /** optional trailing action column (e.g. 'Receive') */
  actionLabel?: string
}

export function RecentDocsTable({ title, columns, rows, hrefBase, empty, actionLabel }: RecentDocsTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold">
        {title} <span className="ml-1 text-xs font-normal text-slate-400">last {rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.name} className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.label}
                </th>
              ))}
              {actionLabel && <th className="px-3 py-2 font-medium text-right">{actionLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                {columns.map((c, idx) => (
                  <td
                    key={c.name}
                    className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${idx === 0 ? 'font-mono text-xs' : ''}`}
                  >
                    {idx === 0 && hrefBase ? (
                      <Link href={`${hrefBase}/${r.id}`} className="text-emerald-700 hover:underline">
                        {r.cells[c.name]}
                      </Link>
                    ) : (
                      r.cells[c.name]
                    )}
                  </td>
                ))}
                {actionLabel && (
                  <td className="px-3 py-2 text-right">
                    {r.actionHref ? (
                      <Link
                        href={r.actionHref}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        {actionLabel}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actionLabel ? 1 : 0)} className="px-3 py-8 text-center text-sm text-slate-500">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
