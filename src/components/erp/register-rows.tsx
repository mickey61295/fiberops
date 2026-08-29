'use client'

/**
 * RegisterRows — SPEC-M17 §2-E: the register tbody as a CLIENT component.
 * Full-row click opens the doc (W2 drill-down used to be first-column-only);
 * rows are keyboard-navigable (roving tabindex: ↑/↓ move focus, Enter opens).
 * RegisterScreen itself stays a server component — only the rows went client.
 */
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { RegisterConfig } from '@/lib/erp/register-configs/types'
import type { RegisterResult } from '@/lib/erp/registers/types'

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

export function RegisterRows({
  columns, rows, emptyMessage,
}: {
  columns: RegisterConfig['columns']
  rows: RegisterResult['rows']
  emptyMessage?: string
}) {
  const router = useRouter()

  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-slate-400">
            {emptyMessage ?? 'Nothing to show.'}
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {rows.map((row) => {
        const firstCol = columns[0]
        const firstVal = row[firstCol.name]
        return (
          <tr
            key={row.id}
            tabIndex={row.href ? 0 : -1}
            onClick={row.href ? () => router.push(row.href!) : undefined}
            onKeyDown={(e) => {
              if (!row.href) return
              if (e.key === 'Enter') {
                e.preventDefault()
                router.push(row.href)
              } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                const siblings = Array.from(
                  (e.currentTarget.parentElement as HTMLTableSectionElement | null)?.querySelectorAll<HTMLTableRowElement>('tr[tabindex="0"]') ?? [],
                )
                const i = siblings.indexOf(e.currentTarget)
                siblings[i + (e.key === 'ArrowDown' ? 1 : -1)]?.focus()
              }
            }}
            className={`border-b last:border-0 hover:bg-slate-50/60 ${row.href ? 'cursor-pointer focus-visible:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-400' : ''}`}
            title={row.href ? 'Open (Enter)' : undefined}
          >
            {columns.map((c, i) => (
              <td key={c.name} className={`px-3 py-2 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''} ${c.mono ? 'font-mono text-[13px]' : ''} ${i === 0 && row.href ? 'font-medium' : ''}`}>
                {i === 0 && row.href ? (
                  <Link
                    href={row.href}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-slate-800 hover:text-emerald-700 hover:underline"
                  >
                    <Cell col={c} value={firstVal} />
                  </Link>
                ) : (
                  <Cell col={c} value={row[c.name]} />
                )}
              </td>
            ))}
          </tr>
        )
      })}
    </tbody>
  )
}
