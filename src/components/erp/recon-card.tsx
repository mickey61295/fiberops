/**
 * W6 reconciliation card — SPEC-M4 §9. SERVER component: title, math line,
 * counterpart rows with links, balance highlight. Rendered on the PO view,
 * invoice view, jobwork view and the Order Hub's despatch section.
 */
import Link from 'next/link'
import { CheckCircle2, Scale } from 'lucide-react'
import type { ReconResult } from '@/lib/erp/registers/recon'

export function ReconCard({ recon }: { recon: ReconResult }) {
  const settled = Math.abs(recon.balance) < 0.001
  const over = recon.balance < 0
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Scale className="h-3.5 w-3.5" />
          {recon.title}
        </div>
        <div
          className={[
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            settled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : over
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200',
          ].join(' ')}
        >
          {settled ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> settled
            </span>
          ) : (
            `${recon.balanceLabel}: ${recon.balance < 0 ? '' : ''}${recon.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
          )}
        </div>
      </div>
      <div className="mt-2 text-sm text-slate-700">{recon.mathLine}</div>
      {recon.rows.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{recon.rowsTitle}</div>
          <div className="mt-1.5 space-y-1">
            {recon.rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
                {r.href ? (
                  <Link href={r.href} className="min-w-0 truncate font-mono text-[13px] text-emerald-700 hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate text-slate-600">{r.label}</span>
                )}
                <span className="whitespace-nowrap text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {recon.rows.length === 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
          No counterpart rows yet.
        </div>
      )}
    </div>
  )
}
