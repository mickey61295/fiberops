'use client'

/**
 * LIVE TRACKER view (M9 Wave A) — the real-time sibling of the parity
 * tracker (/parity). Same shell (max-w-5xl card stack), same visual language
 * (Card/Badge/Stat blocks, emerald accents, text-xs tables), but the data
 * layer is live: an SSE stream (server push every 3s) with automatic
 * degradation to 5s polling, plus a pause while the tab is hidden.
 *
 * The server page passes the first snapshot (`initial`) so the SSR paint is
 * complete with zero loading flash; the hook then keeps it fresh.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Database, Inbox, Zap } from 'lucide-react'
import type { LiveSnapshot, LiveEvent } from '@/lib/erp/live-snapshot'

type ConnStatus = 'connecting' | 'live' | 'fallback'

const SSE_URL = '/api/live-tracker/stream'
const POLL_URL = '/api/live-tracker'
const POLL_MS = 5000
const SSE_RETRY_MS = 60000

// ---------------------------------------------------------------------------
// The hook — SSE first, polling fallback, hidden-tab pause.
// ---------------------------------------------------------------------------

function useLiveMetrics(initial: LiveSnapshot) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(initial)
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const [updatedAt, setUpdatedAt] = useState<number>(Date.parse(initial.ts))
  const statusRef = useRef<ConnStatus>('connecting')

  const apply = (snap: LiveSnapshot) => {
    // Pause updates while the tab is hidden — the connection stays open but
    // no state churn (no renders) happens for a backgrounded viewer.
    if (typeof document !== 'undefined' && document.hidden) return
    statusRef.current = status
    setSnapshot(snap)
    setUpdatedAt(Date.now())
  }

  useEffect(() => {
    let es: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const startPolling = () => {
      if (disposed || pollTimer) return
      setStatus('fallback')
      statusRef.current = 'fallback'
      const tick = async () => {
        if (typeof document !== 'undefined' && document.hidden) return
        try {
          const res = await fetch(POLL_URL, { cache: 'no-store' })
          if (res.ok) apply((await res.json()) as LiveSnapshot)
        } catch {
          /* transient — next tick retries */
        }
      }
      void tick()
      pollTimer = setInterval(tick, POLL_MS)

      // While polling, occasionally probe whether SSE works again.
      retryTimer = setTimeout(() => {
        if (!disposed && statusRef.current === 'fallback') {
          stopPolling()
          openStream()
        }
      }, SSE_RETRY_MS)
    }

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer)
      if (retryTimer) clearTimeout(retryTimer)
      pollTimer = null
      retryTimer = null
    }

    const openStream = () => {
      es = new EventSource(SSE_URL)
      es.onopen = () => {
        setStatus('live')
        statusRef.current = 'live'
        stopPolling()
      }
      es.onmessage = (e) => {
        try {
          apply(JSON.parse(e.data) as LiveSnapshot)
        } catch {
          /* malformed frame — wait for the next one */
        }
      }
      es.onerror = () => {
        // Server closed / network drop: EventSource would auto-reconnect,
        // but a dead server would spin the reconnect loop — degrade to
        // polling deterministically, re-probe SSE later.
        es?.close()
        es = null
        startPolling()
      }
    }

    openStream()

    // Coming back to the tab: pull one fresh snapshot immediately.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        try {
          const res = await fetch(POLL_URL, { cache: 'no-store' })
          if (res.ok) apply((await res.json()) as LiveSnapshot)
        } catch {
          /* stream will refresh anyway */
        }
      })()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      es?.close()
      stopPolling()
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { snapshot, status, updatedAt }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function fmtUptime(sec: number): string {
  if (sec < 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function num(n: number): string {
  return n < 0 ? '—' : String(n)
}

const KIND_STYLES: Record<string, { dot: string; label: string }> = {
  approval: { dot: 'bg-sky-400', label: 'text-sky-700' },
  agent: { dot: 'bg-violet-400', label: 'text-violet-700' },
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function LiveTracker({ initial }: { initial: LiveSnapshot }) {
  const { snapshot, status, updatedAt } = useLiveMetrics(initial)
  const [now, setNow] = useState<number | null>(null)

  // Ticking clock for relative times — client-only (mount flag keeps the
  // SSR HTML and hydration output identical).
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const s = snapshot
  const alerts: string[] = []
  if (!s.server.dbOk) alerts.push('Database unreachable')
  if (s.server.dbLatencyMs > 250) alerts.push(`DB latency ${s.server.dbLatencyMs}ms > 250ms`)
  if (s.workload.pendingApprovals > 50)
    alerts.push(`${s.workload.pendingApprovals} approvals pending (> 50)`)

  const docsToday = s.families.reduce((a, f) => a + Math.max(0, f.today), 0)
  const docsWeek = s.families.reduce((a, f) => a + Math.max(0, f.week), 0)
  const sortedFamilies = [...s.families].sort((a, b) => b.week - a.week || b.today - a.today)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Summary + connection status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">FiberOps 2.0 Live Tracker</CardTitle>
              <p className="text-sm text-slate-600">
                Real-time operations view — document flow, approvals and server health,
                pushed live. The real-time companion of the{' '}
                <Link href="/parity" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  parity tracker
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                  status === 'live'
                    ? 'text-emerald-600'
                    : status === 'fallback'
                      ? 'text-amber-600'
                      : 'text-slate-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                    status === 'live'
                      ? 'bg-emerald-400'
                      : status === 'fallback'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                  }`}
                />
                {status === 'live' ? 'LIVE · stream' : status === 'fallback' ? 'POLLING · 5s' : 'connecting…'}
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums" suppressHydrationWarning>
                updated {now !== null ? ago(now - updatedAt) : '—'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Docs today" value={num(docsToday)} accent icon={<Zap className="h-3.5 w-3.5" />} />
            <Stat label="Docs · 7 days" value={num(docsWeek)} />
            <Stat
              label="Pending approvals"
              value={num(s.workload.pendingApprovals)}
              accent={s.workload.pendingApprovals > 0}
              icon={<Inbox className="h-3.5 w-3.5" />}
            />
            <Stat
              label="DB latency"
              value={s.server.dbOk ? `${s.server.dbLatencyMs} ms` : 'down'}
              accent={s.server.dbOk && s.server.dbLatencyMs < 100}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alerts strip */}
      {(alerts.length > 0 || s.health !== 'ok') && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            s.health === 'down'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {alerts.length > 0 ? alerts.join(' · ') : `System health: ${s.health}`}
          </span>
        </div>
      )}

      {/* System & parity */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Database className="h-4 w-4 text-slate-400" /> Server
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="text-xs divide-y divide-slate-50">
              <Row k="Database" v={s.server.dbOk ? 'reachable' : 'unreachable'} ok={s.server.dbOk} />
              <Row k="Query latency" v={`${s.server.dbLatencyMs} ms`} ok={s.server.dbLatencyMs < 250} />
              <Row k="Process uptime" v={fmtUptime(s.server.uptimeSec)} />
              <Row k="Memory (RSS)" v={`${s.server.memoryRssMb} MB`} />
              <Row k="Environment" v={s.server.nodeEnv} />
              <Row k="Snapshot time" v={fmtTime(s.ts)} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-slate-400" /> Parity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Menu items live" value={`${s.parity.liveItems}/${s.parity.totalItems}`} accent />
              <Stat label="Modules live" value={`${s.parity.liveGroups}/${s.parity.totalGroups}`} accent />
              <Stat label="Legacy forms live" value={`${s.parity.legacyLive}/${s.parity.legacyMapped}`} />
              <Stat label="Legacy coverage" value={`${s.parity.coveragePct}%`} accent />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Open orders" value={num(s.workload.openOrders)} accent={s.workload.openOrders > 0} />
            <Stat label="Open POs" value={num(s.workload.openPOs)} accent={s.workload.openPOs > 0} />
            <Stat label="Active programs" value={num(s.workload.activePrograms)} />
            <Stat label="Draft invoices" value={num(s.workload.draftInvoices)} />
            <Stat
              label="Pending approvals"
              value={num(s.workload.pendingApprovals)}
              accent={s.workload.pendingApprovals > 0}
            />
            <Stat label="Agent turns today" value={num(s.workload.agentTurnsToday)} />
          </div>
        </CardContent>
      </Card>

      {/* Document activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Document activity · 12 flow families</CardTitle>
            <Badge variant="secondary" className="text-xs">today / 7 days</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-slate-100 text-slate-500 text-left">
                  <th className="px-4 py-2 font-medium">Family</th>
                  <th className="px-2 py-2 font-medium text-right">Today</th>
                  <th className="px-2 py-2 font-medium text-right">7 days</th>
                  <th className="px-4 py-2 font-medium text-right">Share of week</th>
                </tr>
              </thead>
              <tbody>
                {sortedFamilies.map((f) => (
                  <tr key={f.key} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-2 text-slate-800 font-medium">{f.label}</td>
                    <td className="px-2 py-2 text-right text-slate-700 tabular-nums">{num(f.today)}</td>
                    <td className="px-2 py-2 text-right text-slate-700 tabular-nums">{num(f.week)}</td>
                    <td className="px-4 py-2 text-right">
                      <ShareBar value={f.week < 0 ? 0 : f.week} total={docsWeek} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Event stream */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Recent events</CardTitle>
            <span className="text-[10px] text-slate-400">documents · approvals · agent turns</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {s.events.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-400 text-center">
              No activity yet — create a document, approval or agent turn and it appears here within seconds.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50" suppressHydrationWarning>
              {s.events.map((e, i) => (
                <EventRow key={`${e.ts}-${e.kind}-${e.ref}-${i}`} e={e} now={now} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Presentational atoms (parity-tracker style)
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string
  accent?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div
        className={`text-xl font-bold tabular-nums flex items-center gap-1.5 ${
          accent ? 'text-emerald-600' : 'text-slate-800'
        }`}
      >
        {icon}
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function Row({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className="text-slate-500">{k}</dt>
      <dd
        className={`font-medium tabular-nums ${
          ok === undefined ? 'text-slate-700' : ok ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {v}
      </dd>
    </div>
  )
}

function ShareBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <span className="inline-flex items-center justify-end gap-2 w-full">
      <span className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden inline-block">
        <span className="block h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-slate-400 tabular-nums w-8 text-right">{pct}%</span>
    </span>
  )
}

function EventRow({ e, now }: { e: LiveEvent; now: number | null }) {
  const style = KIND_STYLES[e.kind]
  return (
    <li className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-slate-50/60">
      <span className="text-slate-400 tabular-nums w-16 shrink-0">{fmtTime(e.ts)}</span>
      <span className="inline-flex items-center gap-1.5 min-w-[110px] shrink-0">
        <span className={`h-1.5 w-1.5 rounded-full ${style ? style.dot : 'bg-emerald-400'}`} />
        <span className={`font-medium ${style ? style.label : 'text-emerald-700'}`}>
          {style ? (e.kind === 'approval' ? 'Approval' : 'Agent') : e.label}
        </span>
      </span>
      <span className="font-mono text-slate-700 truncate">{e.ref}</span>
      {e.detail && <span className="text-slate-400 truncate ml-auto">{e.detail}</span>}
      {now !== null && (
        <span className="text-slate-300 tabular-nums shrink-0 hidden sm:inline">{ago(now - Date.parse(e.ts))}</span>
      )}
    </li>
  )
}
