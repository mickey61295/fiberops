/**
 * /notifications/digest — the daily digest screen (SPEC-M9 §9 M13): pending
 * approvals with age, low-stock alerts, today's gate movements, and —
 * SPEC-M35 — upcoming shutdowns (the M28 holiday read, 14-day window) — the
 * same data /api/cron/digest serves. Channel status comes from the
 * notification.* flags; sending is gated by them (the Send-now button just
 * asks the API).
 */
import Link from 'next/link'
import { AlertTriangle, Bell, CalendarClock, Clock, Database, HardDrive, Truck } from 'lucide-react'
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

      {/* SPEC-M35 — upcoming shutdowns (silent when empty, the M28 discipline) */}
      {digest.sections.shutdowns.rows.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/60 shadow-sm" data-digest-shutdowns>
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-4 py-2.5">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            <h2 className="text-[13px] font-semibold text-amber-800">Upcoming shutdowns</h2>
            <Badge variant="secondary">{digest.sections.shutdowns.rows.length}</Badge>
            <span className="text-[11px] text-amber-700/70">next {digest.sections.shutdowns.windowDays} days</span>
          </div>
          <div className="divide-y divide-amber-100">
            {digest.sections.shutdowns.rows.map((s) => (
              <div key={s.date} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="font-medium text-amber-900">{s.name}</span>
                <span className="flex items-center gap-2 text-amber-700">
                  <span className="font-mono text-[13px]">{s.date}</span>
                  <Badge variant={s.daysUntil === 0 ? 'default' : 'outline'}>{s.daysUntil === 0 ? 'TODAY' : `${s.daysUntil}d away`}</Badge>
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-amber-100 px-4 py-2 text-[11px] text-amber-700/80">
            Plan despatch &amp; production around shutdowns —{' '}
            <Link href="/masters/govt-holiday" className="underline hover:text-amber-900">full calendar</Link>
          </div>
        </section>
      )}

      {/* OPS-01 — ops & data growth: the trust infrastructure reports itself */}
      {digest.sections.ops.rows[0] && (() => {
        const o = digest.sections.ops.rows[0]
        const stale = o.lastBackupName === null || (o.lastBackupAgeHours ?? 0) > 26
        return (
          <section className="rounded-lg border bg-white shadow-sm" data-digest-ops>
            <div className="flex items-center gap-2 border-b bg-slate-50/80 px-4 py-2.5">
              <Database className="h-4 w-4 text-slate-600" />
              <h2 className="text-[13px] font-semibold text-slate-700">Ops &amp; data growth</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
              <span className="flex items-center gap-1.5 text-slate-600">
                <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                DB <span className="font-semibold tabular-nums">{o.dbSizeMb.toFixed(1)} MB</span>
              </span>
              <span className="text-slate-600">
                StockLedger <span className="font-semibold tabular-nums">{o.rows.stockLedger.toLocaleString('en-IN')}</span>
                <span className="text-slate-400"> · AuditLog <span className="tabular-nums">{o.rows.auditLog.toLocaleString('en-IN')}</span></span>
                <span className="text-slate-400"> · AgentTurn <span className="tabular-nums">{o.rows.agentTurn.toLocaleString('en-IN')}</span></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-600">Backup:</span>
                {o.lastBackupName ? (
                  <Badge variant={stale ? 'destructive' : 'default'}>{o.lastBackupName} · {o.lastBackupAgeHours === 0 ? '<1' : o.lastBackupAgeHours}h old</Badge>
                ) : (
                  <Badge variant="destructive">NONE — run scripts/backup_db.py</Badge>
                )}
              </span>
            </div>
          </section>
        )
      })()}

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
