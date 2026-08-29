/**
 * /accounts/tally-export — the Tally JSON export screen (SPEC-M19 §4 Wave D).
 * Server component: date window (defaults to last 30 days), live preview
 * counts via the same buildTallyExport service, and the guarded download
 * link (/api/tally?from=&to= — the browser sends the session cookie).
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
              Sales, receipts, payments and journals for a window, shaped Tally-import-ready. Import via Tally&apos;s
              JSON import (Gateway of Tally → Import Data).
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

      {/* preview counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Sales vouchers', value: preview.counts.sales },
          { label: 'Receipts', value: preview.counts.receipts },
          { label: 'Payments', value: preview.counts.payments },
          { label: 'Journals', value: preview.counts.journals },
          { label: 'Total vouchers', value: preview.vouchers.length },
        ].map((t) => (
          <div key={t.label} data-tally-count={t.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xl font-bold tabular-nums text-slate-800">{t.value.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>

      {/* voucher preview list (first 25) */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Date', 'Type', 'Voucher No', 'Party', 'Amount', 'Entries'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.vouchers.slice(0, 25).map((v) => (
              <tr key={v.voucherNo} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-1.5 font-mono text-[13px]">{v.date}</td>
                <td className="px-3 py-1.5">{v.voucherType}</td>
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
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">No vouchers in this window.</td></tr>
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
