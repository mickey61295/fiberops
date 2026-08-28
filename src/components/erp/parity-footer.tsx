import Link from 'next/link'
import { parityStats } from '@/lib/erp/menu-registry'

/**
 * Parity tracker footer strip (SPEC-M1 §7). One line, derived from the registry.
 */
export function ParityFooter() {
  const s = parityStats()
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-2 hidden print:hidden">
      <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500">
        <span>
          <span className="font-semibold text-slate-700">{s.totalItems}</span> menu items ·{' '}
          <span className="font-semibold text-emerald-600">{s.liveItems} live</span> ·{' '}
          {s.comingItems} coming ·{' '}
          <span className="font-semibold text-emerald-600">{s.liveGroups}</span>/{s.totalGroups} modules
        </span>
        <span>
          Legacy Fiberpro coverage:{' '}
          <span className="font-semibold text-emerald-600">{s.coveragePct}%</span>{' '}
          ({s.legacyLive}/{s.legacyMapped} forms)
        </span>
        <span className="flex items-center gap-3">
          <Link href="/live" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Live tracker
          </Link>
          <Link href="/parity" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Parity tracker →
          </Link>
        </span>
      </div>
    </footer>
  )
}
