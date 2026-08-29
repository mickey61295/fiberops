/**
 * /notifications/digest — the daily digest screen (SPEC-M9 §9 M13): pending
 * approvals with age, low-stock alerts, today's gate movements — the same
 * data /api/cron/digest serves. Channel status comes from the notification.*
 * flags; sending is gated by them (the Send-now button just asks the API).
 */
import Link from 'next/link'
import { AlertTriangle, Bell, Clock, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import { buildDigest } from '@/lib/erp/notifications/digest'
import { getFlag } from '@/lib/erp/flags'
import { DigestSendButton } from './send-button'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [digest, enabled, url, secret, threshold] = await Promise.all([
    buildDigest(),
    getFlag('notification.digest_enabled'),
    getFlag('notification.webhook_url'),
    getFlag('notification.cron_secret'),
    getFlag('notification.low_stock_pcs'),
  ])
  const webhook = String(url ?? '').trim()
  const armed = Boolean(enabled) && webhook.length > 0

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 hover:underline">Home</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Daily Digest</span>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Daily Digest</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Pending approvals, low-stock alerts and today&apos;s gate movements — what the cron job would send.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AskAgentButton prompt="What needs my attention today — approvals, low stock, gate movements?" label="Ask about this data" />
            <DigestSendButton />
          </div>
        </div>
      </div>

      {/* channel status */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3 text-[13px] shadow-sm" data-digest-channels>
        <span className="text-slate-500">Channels:</span>
        <Badge variant={armed ? 'default' : 'secondary'}>{armed ? 'Webhook armed' : 'Webhook not armed'}</Badge>
        <span className="text-slate-500">digest_enabled: {String(Boolean(enabled))}</span>
        <span className="text-slate-500">webhook_url: {webhook ? 'set' : 'empty'}</span>
        <span className="text-slate-500">cron secret: {String(secret ?? '').trim() ? 'set' : 'session-only'}</span>
        <span className="text-slate-500">low-stock pcs threshold: {Number(threshold) || 0}</span>
      </div>

      {/* approvals */}
      <section className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b bg-slate-50/80 px-4 py-2.5">
          <Clock className="h-4 w-4 text-amber-600" />
          <h2 className="text-[13px] font-semibold text-slate-700">Pending approvals</h2>
          <Badge variant="secondary" data-digest-approvals-count>{digest.sections.approvals.rows.length}</Badge>
        </div>
        <div className="divide-y">
          {digest.sections.approvals.rows.map((a) => (
            <div key={`${a.entityId}-${a.step}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <span className="font-medium">{a.entity}</span> <span className="font-mono text-[13px]">{a.entityId}</span>
                <span className="text-slate-400"> · step {a.step} · by {a.requestedBy}</span>
              </span>
              <Badge variant={a.ageDays >= 2 ? 'destructive' : 'secondary'}>{a.ageDays}d old</Badge>
            </div>
          ))}
          {digest.sections.approvals.rows.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">Nothing waiting — inbox clear.</div>
          )}
        </div>
      </section>

      {/* low stock */}
      <section className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b bg-slate-50/80 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h2 className="text-[13px] font-semibold text-slate-700">Low stock</h2>
          <Badge variant="secondary" data-digest-lowstock-count>{digest.sections.lowStock.rows.length}</Badge>
          {digest.sections.lowStock.thresholdPcs > 0 && (
            <span className="text-[11px] text-slate-500">pcs &lt; {digest.sections.lowStock.thresholdPcs} or negative balances</span>
          )}
          {digest.sections.lowStock.thresholdPcs === 0 && (
            <span className="text-[11px] text-slate-500">negative material balances only (set notification.low_stock_pcs to arm the pcs threshold)</span>
          )}
        </div>
        <div className="divide-y">
          {digest.sections.lowStock.rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <span className="font-medium">{r.itemType}</span> <span className="font-mono text-[13px]">{r.itemCode}</span>
                <span className="text-slate-400"> · {r.godown}</span>
              </span>
              <span className="tabular-nums font-semibold text-red-700">
                {r.pcs !== null ? `${r.pcs} pcs` : `${r.kgs} kgs`}
              </span>
            </div>
          ))}
          {digest.sections.lowStock.rows.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No low-stock rows.</div>
          )}
        </div>
      </section>

      {/* gate movements */}
      <section className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b bg-slate-50/80 px-4 py-2.5">
          <Truck className="h-4 w-4 text-blue-600" />
          <h2 className="text-[13px] font-semibold text-slate-700">Gate movements today</h2>
          <Badge variant="secondary" data-digest-gate-count>{digest.sections.gate.rows.length}</Badge>
        </div>
        <div className="divide-y">
          {digest.sections.gate.rows.map((g) => (
            <div key={g.entryNo} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <Badge variant={g.gateType === 'in' ? 'default' : 'outline'}>{g.gateType.toUpperCase()}</Badge>{' '}
                <span className="font-mono text-[13px]">{g.entryNo}</span>
                {g.refDocNo && <span className="text-slate-400"> · ref {g.refDocNo}</span>}
                {g.vehicleNo && <span className="text-slate-400"> · {g.vehicleNo}</span>}
              </span>
              <span className="text-slate-500">{g.party ?? '—'}</span>
            </div>
          ))}
          {digest.sections.gate.rows.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No gate movements today.</div>
          )}
        </div>
      </section>

      {/* rendered text (what the webhook carries) */}
      <details className="rounded-lg border bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-[13px] font-semibold text-slate-700">
          <Bell className="mr-1 inline h-3.5 w-3.5" /> Digest text (what the webhook receives)
        </summary>
        <pre data-digest-text className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">{digest.text}</pre>
      </details>
    </div>
  )
}
