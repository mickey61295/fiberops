/**
 * /accounts/tally-export — the Tally JSON export screen (SPEC-M19 §4 Wave D,
 * rewritten by SPEC-M53 M-04 "Tally both sides"). THE EXPORT DOCTRINE: every
 * journal row renders exactly once — as its document's voucher or as itself;
 * the CN- contra IS the reversal (cancels export as net-zero pairs); party
 * legs render per-party; GST splits Output/Input CGST/SGST/IGST. Server
 * component: date window (defaults to last 30 days), live preview counts via
 * the same buildTallyExport service (ADR-001 twin with get_tally_export),
 * warnings + doctrine notes, and the guarded download link (/api/tally —
 * the browser sends the session cookie).
 */
import Link from 'next/link'
import { Download, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import { buildTallyExport } from '@/lib/erp/registers/tally'
import { flattenSearchParams } from '@/lib/erp/registers/resolve'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = flattenSearchParams(await searchParams)
  const to = sp.to ? new Date(sp.to) : new Date()
  const from = sp.from ? new Date(sp.from) : new Date(to.getTime() - 30 * 24 * 3600 * 1000)
  const preview = await buildTallyExport(
    isNaN(from.getTime()) ? new Date(to.getTime() - 30 * 24 * 3600 * 1000) : from,
    isNaN(to.getTime()) ? new Date() : to,
  )
  const qs = `from=${preview.fromDate}&to=${preview.toDate}`

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/accounts" className="hover:text-slate-800 hover:underline">Accounts</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Tally Export</span>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tally Export</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              BOTH sides — sales, purchases, receipts, payments, credit notes and journals for a window, counted once
              (companions never double-export; cancels ride their CN- reversals, net zero). Import via Tally&apos;s JSON
              import (Gateway of Tally → Import Data). Tally XML is decision §17-4, pending the owner.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AskAgentButton prompt="Show me invoices and payments for this month" label="Ask about this data" />
            <Button asChild size="sm">
              <Link href={`/api/tally?${qs}`} data-tally-download>
                <Download className="h-3.5 w-3.5 mr-1" /> Download JSON
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* date window (GET form — no client state needed) */}
      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</label>
          <input type="date" name="from" defaultValue={preview.fromDate} className="mt-1 rounded-md border px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</label>
          <input type="date" name="to" defaultValue={preview.toDate} className="mt-1 rounded-md border px-2.5 py-1.5 text-sm" />
        </div>
        <Button type="submit" size="sm" variant="outline">Preview</Button>
      </form>

      {/* preview counts — both sides (SPEC-M53) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { label: 'Sales', value: preview.counts.sales },
          { label: 'Purchases', value: preview.counts.purchases },
          { label: 'Receipts', value: preview.counts.receipts },
          { label: 'Payments', value: preview.counts.payments },
          { label: 'Credit notes', value: preview.counts.creditNotes },
          { label: 'Journals', value: preview.counts.journals },
          { label: 'Reversals', value: preview.counts.reversals },
          { label: 'Total', value: preview.vouchers.length },
        ].map((t) => (
          <div key={t.label} data-tally-count={t.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xl font-bold tabular-nums text-slate-800">{t.value.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>

      {/* warnings — the honesty doors (never a silent drop) */}
      {preview.warnings.length > 0 && (
        <div data-tally-warnings className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="text-xs font-semibold uppercase tracking-wide">Warnings ({preview.warnings.length})</div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {preview.warnings.map((w, i) => (
              <li key={i} className="text-[13px]">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* doctrine notes — ride the payload too */}
      <details className="rounded-lg border bg-white p-4 shadow-sm" data-tally-notes>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">Export doctrine ({preview.notes.length} notes — included in the JSON)</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-slate-600">
          {preview.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </details>

      {/* voucher preview list (first 25) */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Date', 'Type', 'Source', 'Voucher No', 'Party', 'Amount', 'Entries'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.vouchers.slice(0, 25).map((v) => (
              <tr key={v.voucherNo} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-1.5 font-mono text-[13px]">{v.date}</td>
                <td className="px-3 py-1.5">{v.voucherType}{v.reversalOf ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">rev {v.reversalOf}</span> : null}</td>
                <td className="px-3 py-1.5 text-xs text-slate-500">{v.source}</td>
                <td className="px-3 py-1.5 font-mono text-[13px]">{v.voucherNo}</td>
                <td className="px-3 py-1.5">{v.party ?? '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">₹{Math.round(v.amount).toLocaleString('en-IN')}</td>
                <td className="px-3 py-1.5 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {v.ledgerEntries.map((e) => `${e.isDebit ? 'Dr' : 'Cr'} ${e.ledger} ₹${Math.round(e.amount).toLocaleString('en-IN')}`).join(' · ')}
                  </span>
                </td>
              </tr>
            ))}
            {preview.vouchers.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">No vouchers in this window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {preview.vouchers.length > 25 && (
        <div className="text-xs text-slate-500">Showing first 25 of {preview.vouchers.length} — download the JSON for the full set.</div>
      )}
    </div>
  )
}
