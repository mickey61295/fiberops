'use client'

/**
 * RegisterRows — P0-⑤ keyboard-navigable register body (GAP-ANALYSIS §6 #6:
 * legacy operators walk ledgers with arrows + Enter, not mouse hunts).
 * Extracted from the SERVER RegisterScreen (SPEC-M4 §6) so the table body
 * can hold roving-tabindex focus state while the page stays server-rendered.
 *
 * Reflex map (the VB6 grid feel):
 *   click anywhere on a row  → open its drill-down href
 *   ↑ / ↓                    → move the row cursor (scrolls into view)
 *   Enter                    → open the href of the active row
 *   Home / End               → first / last row
 * The first-column link stays a real <Link> (Tab users keep the accessible
 * path); its click no longer double-navigates via stopPropagation.
 */
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { RegisterConfig } from '@/lib/erp/register-configs/types'
import type { RegisterRow } from '@/lib/erp/registers/types'

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
  ready_to_cut_out: 'bg-amber-50 text-amber-700 border-amber-200',
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

export function RegisterRows({ rows, columns }: { rows: RegisterRow[]; columns: RegisterConfig['columns'] }) {
  const router = useRouter()
  const [active, setActive] = useState<number | null>(null)
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([])

  function openRow(row: RegisterRow) {
    if (row.href) router.push(row.href)
  }

  function move(delta: number) {
    if (rows.length === 0) return
    setActive((prev) => {
      const base = prev ?? (delta > 0 ? -1 : rows.length)
      const next = Math.min(rows.length - 1, Math.max(0, base + delta))
      rowRefs.current[next]?.focus()
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' })
      return next
    })
  }

  if (rows.length === 0) return null

  return (
    <>
      {rows.map((row, i) => {
        const firstCol = columns[0]
        const firstVal = row[firstCol.name]
        const isActive = active === i
        return (
          <tr
            key={row.id}
            ref={(el) => { rowRefs.current[i] = el }}
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            onClick={() => { setActive(i); openRow(row) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
              else if (e.key === 'Home') { e.preventDefault(); setActive(0); rowRefs.current[0]?.focus() }
              else if (e.key === 'End') { e.preventDefault(); const last = rows.length - 1; setActive(last); rowRefs.current[last]?.focus() }
              else if (e.key === 'Enter') { e.preventDefault(); openRow(row) }
            }}
            className={`border-b last:border-0 focus:outline-none ${row.href ? 'cursor-pointer' : ''} ${
              isActive ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-300' : 'hover:bg-slate-50/60'
            }`}
          >
            {columns.map((c, ci) => (
              <td key={c.name} className={`px-3 py-2 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''} ${c.mono ? 'font-mono text-[13px]' : ''} ${ci === 0 && row.href ? 'font-medium' : ''}`}>
                {ci === 0 && row.href ? (
                  <Link
                    href={row.href}
                    onClick={(e) => { e.stopPropagation(); setActive(i) }}
                    className="inline-flex items-center gap-1 text-slate-800 hover:text-emerald-700 hover:underline"
                  >
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
      })}
    </>
  )
}
