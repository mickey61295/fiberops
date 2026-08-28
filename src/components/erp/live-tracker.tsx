'use client'

/**
 * LiveTracker — the /tracker screen client (SPEC-M9 §5, REVISED parity-style).
 *
 * PRIMARY: the Live Operations Board — the /parity scoreboard format with
 * LIVE data: summary stat tiles + per-group cards, one row per screen family
 * (records total, rows today, latest doc, ticking last-updated, Active/Idle
 * status dot). Rows flash NEW (15s) when the family's latest doc advances.
 * SECONDARY: the Wave-A panels (activity feed, approvals, agent pulse,
 * system) below the board.
 *
 * Polls /api/tracker on an interval (5/10/30s, default 10s — SPEC-M9 §3
 * polling rationale), auto-pauses while the tab is hidden, and highlights
 * feed entries that appeared since the previous snapshot (NEW chip, 15s).
 * Read-only: approvals drill to the inbox, never approve from here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Activity, RefreshCw, Pause, Play, Sparkles, CircleDot,
} from 'lucide-react'

// ── Snapshot contract (mirrors src/lib/erp/tracker.ts — SPEC-M9 §4) ──
interface TrackerFeedEntry {
  kind: string
  label: string
  docNo: string
  meta: string
  status?: string
  at: string
  href: string | null
}
interface TrackerFamilyRow {
  kind: string
  label: string
  listHref: string | null
  total: number
  today: number
  latestDocNo: string | null
  latestAt: string | null
  latestHref: string | null
  latestMeta: string | null
}
interface TrackerModuleGroup {
  id: string
  label: string
  families: TrackerFamilyRow[]
}
interface TrackerSnapshot {
  generatedAt: string
  kpis: {
    docsToday: number; prodPcsToday: number; despatchPcsToday: number
    stockMovesToday: number; gateToday: number; agentTurnsToday: number
    approvalsToday: number; pendingApprovals: number
    ordersToday: number; posToday: number; grnsToday: number
    invoicesToday: number; paymentsToday: number; cutsToday: number; jobworkToday: number
  }
  feed: TrackerFeedEntry[]
  modules: {
    activeToday: number
    familiesTotal: number
    groups: TrackerModuleGroup[]
  }
  approvals: {
    pendingByKind: { kind: string; label: string; count: number }[]
    oldestPendingMin: number | null
    recent: { kind: string; status: string; actor: string; at: string }[]
  }
  agent: {
    turns: { prompt: string; toolCalls: number; approved: boolean; user: string; at: string }[]
    approvedToday: number
  }
  system: {
    serverTime: string; usersTotal: number; usersActive: number; parties: number
    stockLedgerRows: number; flagsTotal: number; flagsOn: number
  }
}

const KIND_CHIP: Record<string, string> = {
  order: 'bg-emerald-100 text-emerald-800',
  po: 'bg-amber-100 text-amber-800',
  grn: 'bg-teal-100 text-teal-800',
  invoice: 'bg-violet-100 text-violet-800',
  payment: 'bg-rose-100 text-rose-800',
  journal: 'bg-slate-200 text-slate-700',
  cut: 'bg-orange-100 text-orange-800',
  production: 'bg-cyan-100 text-cyan-800',
  despatch: 'bg-lime-100 text-lime-800',
  jobwork: 'bg-fuchsia-100 text-fuchsia-800',
  gate: 'bg-zinc-200 text-zinc-700',
  sample: 'bg-pink-100 text-pink-800',
  labtest: 'bg-purple-100 text-purple-800',
  expense: 'bg-stone-200 text-stone-700',
  approval: 'bg-red-100 text-red-800',
  agent: 'bg-emerald-600 text-white',
}

const NEW_TTL_MS = 15_000

const maxFeedAt = (feed: TrackerFeedEntry[]): string | null =>
  feed.reduce<string | null>((m, e) => (m === null || e.at > m ? e.at : m), null)

/** kind → latestAt map off a snapshot (the board NEW-detection seed). */
const latestByKind = (snap: TrackerSnapshot | null): Map<string, string> => {
  const m = new Map<string, string>()
  if (!snap) return m
  for (const g of snap.modules.groups)
    for (const f of g.families) if (f.latestAt) m.set(f.kind, f.latestAt)
  return m
}

function rel(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function LiveTracker({ initial = null }: { initial?: TrackerSnapshot | null }) {
  const [snapshot, setSnapshot] = useState<TrackerSnapshot | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [intervalMs, setIntervalMs] = useState(10_000)
  const [lastUpdated, setLastUpdated] = useState<number | null>(initial ? Date.now() : null)
  const [nowTick, setNowTick] = useState(Date.now())
  // feed keys marked NEW → timestamp when first seen (pruned after NEW_TTL_MS)
  const [newKeys, setNewKeys] = useState<Map<string, number>>(new Map())
  // board rows whose latestAt advanced → flash NEW (same TTL, family granularity)
  const [newFamKeys, setNewFamKeys] = useState<Map<string, number>>(new Map())
  // server-seeded: entries newer than the seed's newest are NEW on the first poll
  const seenMaxRef = useRef<string | null>(initial ? maxFeedAt(initial.feed) : null)
  const seenLatestRef = useRef<Map<string, string>>(latestByKind(initial))

  const fetchSnapshot = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return // tab hidden → skip silently
    try {
      const r = await fetch('/api/tracker', { cache: 'no-store' })
      if (r.status === 401) {
        window.location.href = '/login' // the M7-B agent-panel pattern
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data: TrackerSnapshot = await r.json()
      // NEW detection (feed): entries newer than the previous snapshot's newest `at`
      const prevMax = seenMaxRef.current
      const maxAt = data.feed.reduce((m, e) => (e.at > m ? e.at : m), '')
      if (prevMax !== null && maxAt > prevMax) {
        const stamped = new Map(newKeys)
        const t = Date.now()
        for (const e of data.feed) {
          if (e.at > prevMax) stamped.set(`${e.kind}:${e.docNo}:${e.at}`, t)
        }
        setNewKeys(stamped)
      }
      if (maxAt) seenMaxRef.current = maxAt
      // NEW detection (board): a family row whose latestAt advanced
      const prevLatest = seenLatestRef.current
      if (prevLatest.size > 0) {
        const stamped = new Map(newFamKeys)
        const t = Date.now()
        for (const g of data.modules.groups) {
          for (const f of g.families) {
            const prev = prevLatest.get(f.kind)
            if (f.latestAt && prev && f.latestAt > prev) stamped.set(`fam:${f.kind}`, t)
          }
        }
        setNewFamKeys(stamped)
      }
      seenLatestRef.current = latestByKind(data)
      setSnapshot(data)
      setLastUpdated(Date.now())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [newKeys, newFamKeys])

  // initial + interval polling (SPEC-M9 §5: pause, hidden-tab auto-pause)
  useEffect(() => {
    void fetchSnapshot()
    if (paused) return
    const id = setInterval(() => void fetchSnapshot(), intervalMs)
    return () => clearInterval(id)
  }, [fetchSnapshot, intervalMs, paused])

  // 1s clock for relative timestamps + NEW-chip expiry (feed + board)
  useEffect(() => {
    const id = setInterval(() => {
      setNowTick(Date.now())
      const prune = (prev: Map<string, number>): Map<string, number> => {
        if (prev.size === 0) return prev
        const next = new Map<string, number>()
        for (const [k, t] of prev) if (Date.now() - t < NEW_TTL_MS) next.set(k, t)
        return next.size === prev.size ? prev : next
      }
      setNewKeys(prune)
      setNewFamKeys(prune)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const secsSinceUpdate = lastUpdated === null ? null : Math.floor((nowTick - lastUpdated) / 1000)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header + live controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Live Tracker
            {paused ? (
              <Badge className="bg-slate-200 text-slate-600 gap-1.5"><CircleDot className="h-3 w-3" />PAUSED</Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100" />
                </span>
                LIVE
              </Badge>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            The parity scoreboard, live — every screen's records, today's activity and latest document.
            {secsSinceUpdate !== null && (
              <span className="ml-1 text-slate-400">Updated {secsSinceUpdate}s ago.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(intervalMs)} onValueChange={(v) => setIntervalMs(Number(v))}>
            <SelectTrigger className="w-[92px] h-9 text-sm" aria-label="Refresh interval">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5000">5s</SelectItem>
              <SelectItem value="10000">10s</SelectItem>
              <SelectItem value="30000">30s</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchSnapshot()}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          Live connection lost — retrying ({error})
        </div>
      )}

      {!snapshot ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          <Activity className="h-5 w-5 mx-auto mb-2 animate-pulse text-emerald-600" />
          Connecting to live feed…
        </Card>
      ) : (
        <>
          {/* ── Summary card (the /parity look: 4 bordered stat tiles) ── */}
          <Card data-testid="summary-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Live Operations Board</CardTitle>
              <p className="text-sm text-slate-600">
                Every screen's live pulse — records, today's activity and the latest
                document per module, company-wide, as it is recorded.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Screens active today" value={`${snapshot.modules.activeToday}/${snapshot.modules.familiesTotal}`} accent />
                <Stat label="Docs recorded today" value={snapshot.kpis.docsToday.toLocaleString('en-IN')} accent />
                <Stat label="Pcs produced today" value={snapshot.kpis.prodPcsToday.toLocaleString('en-IN')} />
                <Stat label="Pending approvals" value={snapshot.kpis.pendingApprovals.toLocaleString('en-IN')} />
              </div>
            </CardContent>
          </Card>

          {/* ── The module board (PRIMARY): one card per group, parity-style table ── */}
          <div className="grid lg:grid-cols-2 gap-4 items-start" data-testid="module-board">
            {snapshot.modules.groups.map((g) => {
              const active = g.families.filter((f) => f.today > 0).length
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{g.label}</CardTitle>
                      <Badge variant={active > 0 ? 'default' : 'secondary'} className="text-xs">
                        {active}/{g.families.length} active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-y border-slate-100 text-slate-500 text-left">
                            <th className="px-4 py-2 font-medium">Screen</th>
                            <th className="px-2 py-2 font-medium text-right">Records</th>
                            <th className="px-2 py-2 font-medium text-right">Today</th>
                            <th className="px-2 py-2 font-medium">Latest</th>
                            <th className="px-2 py-2 font-medium text-right">Updated</th>
                            <th className="px-4 py-2 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.families.map((f) => (
                            <FamilyRow key={f.kind} f={f} isNew={newFamKeys.has(`fam:${f.kind}`)} now={nowTick} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* ── Live detail (secondary): the Wave-A panels ── */}
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">
            Live detail — newest events, approvals, agent pulse &amp; system
          </h3>
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Activity feed */}
            <Card className="p-4 lg:col-span-2" data-testid="activity-feed">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Activity Feed</h3>
                <span className="text-xs text-slate-400">{snapshot.feed.length} events</span>
              </div>
              <div className="max-h-[32rem] overflow-y-auto pr-1 scrollbar-thin">
                {snapshot.feed.length === 0 && (
                  <div className="text-xs text-slate-500 py-6 text-center">
                    No activity yet — create a document or ask the agent.
                  </div>
                )}
                {snapshot.feed.map((e) => {
                  const key = `${e.kind}:${e.docNo}:${e.at}`
                  const isNew = newKeys.has(key)
                  const row = (
                    <>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_CHIP[e.kind] ?? 'bg-slate-100 text-slate-600'}`}>
                        {e.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold truncate">{e.docNo}</span>
                          {isNew && <Badge className="bg-emerald-600 text-white text-[9px] px-1.5">NEW</Badge>}
                          {e.status && <Badge variant="outline" className="text-[9px] px-1.5">{e.status}</Badge>}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{e.meta}</div>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{rel(e.at, nowTick)}</span>
                    </>
                  )
                  const cls = `flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 rounded-md ${isNew ? 'bg-emerald-50 px-2 -mx-2' : ''}`
                  return e.href ? (
                    <Link key={key} href={e.href} className={`${cls} hover:bg-slate-50`}>{row}</Link>
                  ) : (
                    <div key={key} className={cls}>{row}</div>
                  )
                })}
              </div>
            </Card>

            {/* Right column */}
            <div className="space-y-4">
              {/* Approvals */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Approvals</h3>
                  <Button asChild variant="ghost" size="sm"><Link href="/approvals">Inbox</Link></Button>
                </div>
                {snapshot.approvals.pendingByKind.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">Nothing pending — all clear.</div>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    {snapshot.approvals.pendingByKind.map((k) => (
                      <div key={k.kind} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{k.label}</span>
                        <Badge className={k.count > 0 ? 'bg-amber-100 text-amber-800' : ''}>{k.count}</Badge>
                      </div>
                    ))}
                    {snapshot.approvals.oldestPendingMin !== null && (
                      <div className="text-[11px] text-slate-400 pt-1">
                        Oldest waiting {snapshot.approvals.oldestPendingMin >= 60
                          ? `${Math.floor(snapshot.approvals.oldestPendingMin / 60)}h ${snapshot.approvals.oldestPendingMin % 60}m`
                          : `${snapshot.approvals.oldestPendingMin}m`}
                      </div>
                    )}
                  </div>
                )}
                {snapshot.approvals.recent.length > 0 && (
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    {snapshot.approvals.recent.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate">{r.kind} · <span className={r.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}>{r.status}</span></span>
                        <span className="text-slate-400 whitespace-nowrap">{rel(r.at, nowTick)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Agent pulse */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />Agent Pulse
                  </h3>
                  <span className="text-xs text-slate-400">{snapshot.kpis.agentTurnsToday} today</span>
                </div>
                {snapshot.agent.turns.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">No agent turns yet. Press ⌘K to try it.</div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                    {snapshot.agent.turns.map((t, i) => (
                      <div key={i} className="text-xs border-b border-slate-100 last:border-0 pb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] px-1.5">{t.toolCalls} tools</Badge>
                          {t.approved && <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5">approved</Badge>}
                          <span className="text-slate-400 ml-auto">{rel(t.at, nowTick)}</span>
                        </div>
                        <div className="text-slate-600 truncate mt-0.5">“{t.prompt}”</div>
                        <div className="text-slate-400 text-[10px]">by {t.user}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* System */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">System</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <SysRow label="Server time" value={new Date(snapshot.system.serverTime).toLocaleTimeString('en-IN')} />
                  <SysRow label="Users" value={`${snapshot.system.usersActive} active / ${snapshot.system.usersTotal}`} />
                  <SysRow label="Parties" value={snapshot.system.parties.toLocaleString('en-IN')} />
                  <SysRow label="Ledger rows" value={snapshot.system.stockLedgerRows.toLocaleString('en-IN')} />
                  <SysRow label="Flags on" value={`${snapshot.system.flagsOn} / ${snapshot.system.flagsTotal}`} />
                  <SysRow label="Feed" value={`${snapshot.feed.length} events`} />
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FamilyRow({ f, isNew, now }: { f: TrackerFamilyRow; isNew: boolean; now: number }) {
  const active = f.today > 0
  const idle = !active && f.total > 0
  return (
    <tr className={`border-b border-slate-50 last:border-0 ${isNew ? 'bg-emerald-50/70' : 'hover:bg-slate-50/60'}`}>
      <td className="px-4 py-2">
        {f.listHref ? (
          <Link href={f.listHref} className="text-slate-800 hover:text-emerald-700 font-medium">
            {f.label}
          </Link>
        ) : (
          <span className="text-slate-800 font-medium">{f.label}</span>
        )}
        {f.listHref && <span className="block text-[10px] text-slate-400 font-mono">{f.listHref}</span>}
      </td>
      <td className="px-2 py-2 text-right text-slate-600 tabular-nums">{f.total.toLocaleString('en-IN')}</td>
      <td className={`px-2 py-2 text-right font-semibold tabular-nums ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
        {f.today}
      </td>
      <td className="px-2 py-2 max-w-[220px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {f.latestDocNo ? (
            f.latestHref ? (
              <Link href={f.latestHref} className="font-mono text-[11px] font-semibold text-slate-800 hover:text-emerald-700">
                {f.latestDocNo}
              </Link>
            ) : (
              <span className="font-mono text-[11px] font-semibold text-slate-800">{f.latestDocNo}</span>
            )
          ) : (
            <span className="text-slate-300">—</span>
          )}
          {isNew && <Badge className="bg-emerald-600 text-white text-[9px] px-1.5">NEW</Badge>}
        </div>
        {f.latestMeta && <span className="block text-[10px] text-slate-400 truncate">{f.latestMeta}</span>}
      </td>
      <td className="px-2 py-2 text-right text-slate-400 whitespace-nowrap">
        {f.latestAt ? rel(f.latestAt, now) : '—'}
      </td>
      <td className="px-4 py-2 text-right">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
            active ? 'text-emerald-600' : idle ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              active ? 'bg-emerald-400' : idle ? 'bg-slate-400' : 'bg-slate-200'
            }`}
          />
          {active ? 'Active' : idle ? 'Idle' : 'No data'}
        </span>
      </td>
    </tr>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className={`text-xl font-bold tabular-nums ${accent ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function SysRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  )
}
