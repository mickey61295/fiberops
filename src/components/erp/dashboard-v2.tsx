'use client'

/**
 * Dashboard 2.0 (SPEC-M16) — role-aware dashboard client surface.
 * SSR page fetches the snapshot (lib/erp/dashboard.ts) and hands it over as
 * plain props; this component renders tiles (+ customize mode), the role's
 * chart picks (recharts — vendored, SPEC-M16 §3.4 deviation note) and the
 * recent lists. Tile order/visibility persists via the saveDashboardTiles
 * server action (AppOption dashboard:<role>:tiles).
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { saveDashboardTiles } from '@/app/(erp)/dashboard/actions'
import type { DashboardSnapshot } from '@/lib/erp/dashboard'
import {
  Sparkles, Package, Boxes, CalendarClock, Shirt, ShoppingCart, Truck, Warehouse,
  TriangleAlert, Scissors, Factory, ClipboardList, GitBranch, FileText,
  IndianRupee, Landmark, Users, ChevronLeft, ChevronRight, Eye, EyeOff, Save,
  RotateCcw, Pencil, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area,
  ComposedChart, Line, CartesianGrid,
} from 'recharts'

const ICONS: Record<string, LucideIcon> = {
  Package, Boxes, CalendarClock, Shirt, ShoppingCart, Truck, Warehouse,
  TriangleAlert, Scissors, Factory, ClipboardList, GitBranch, FileText,
  IndianRupee, Landmark, Users,
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', merchandiser: 'Merchandiser', storekeeper: 'Storekeeper',
  accountant: 'Accountant', production_mgr: 'Production Manager',
  cutting_mgr: 'Cutting Manager', hr: 'HR',
}

interface Dashboard2Props {
  snapshot: DashboardSnapshot
  charts: ('chain' | 'production' | 'cash')[]
  recentPicks: ('orders' | 'pos' | 'cuts' | 'invoices')[]
  defaultTiles: string[]
  /** id+label pairs for the customize panel (the registry stays server-side — no db code in the client bundle) */
  allTiles: { id: string; label: string }[]
}

export function Dashboard2({ snapshot, charts, recentPicks, defaultTiles, allTiles }: Dashboard2Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(snapshot.tiles.map((t) => t.id))
  const [pending, startTransition] = useTransition()

  const visible = snapshot.tiles
  const roleLabel = ROLE_LABELS[snapshot.role] ?? snapshot.role

  const openAgent = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))
  }

  const beginEdit = () => {
    setDraft(snapshot.tiles.map((t) => t.id))
    setEditing(true)
  }

  const persist = (tiles: string[] | null) => {
    startTransition(async () => {
      const res = await saveDashboardTiles(snapshot.role, tiles)
      if (res.ok) {
        setEditing(false)
        toast.success(tiles === null ? 'Reset to role defaults' : 'Dashboard layout saved')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    })
  }

  const move = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const i = d.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= d.length) return d
      const next = [...d]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const toggleVisible = (id: string) => {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white border-slate-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-300 mb-1">
              <span data-testid="dashboard-role-label">{roleLabel}</span> Dashboard · Baalaji Garments
            </div>
            <h2 className="text-2xl font-bold">Welcome to Fiberpro ERP</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-md">
              Every operation is reachable two ways — the working forms and the AI agent. This board is tuned to your role; customize the tiles below.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800" onClick={editing ? () => setEditing(false) : beginEdit} data-testid="dashboard-customize">
              <Pencil className="h-4 w-4 mr-1" /> {editing ? 'Cancel' : 'Customize'}
            </Button>
            <Button onClick={openAgent} className="bg-emerald-500 hover:bg-emerald-400 text-white">
              <Sparkles className="h-4 w-4 mr-1" /> Agent (⌘J)
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI tiles (SPEC-M4 §8.3 deep-link convention kept) */}
      {editing ? (
        <Card className="p-4 space-y-3" data-testid="dashboard-customize-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Arrange your tiles</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => persist(null)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
              <Button size="sm" disabled={pending} onClick={() => persist(draft)}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save layout
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            {draft.map((id) => {
              const def = allTiles.find((t) => t.id === id)
              if (!def) return null
              return (
                <div key={id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1">
                  <span className="font-medium">{def.label}</span>
                  <span className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(id, -1)} aria-label={`Move ${def.label} left`}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(id, 1)} aria-label={`Move ${def.label} right`}><ChevronRight className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleVisible(id)} aria-label={`Toggle ${def.label}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">
            Draft: {draft.length} tiles (visible). Hidden tiles can be re-added below — the registry offers all {allTiles.length} tiles; your role default is {defaultTiles.length}.
          </p>
          {allTiles.filter((t) => !draft.includes(t.id)).length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Hidden tiles (click to add):</div>
              <div className="flex flex-wrap gap-1">
                {allTiles.filter((t) => !draft.includes(t.id)).map((t) => (
                  <Button key={t.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleVisible(t.id)}>
                    <EyeOff className="h-3 w-3 mr-1" /> {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {visible.map((t) => <KpiTile key={t.id} tile={t} />)}
          {visible.length === 0 && (
            <div className="col-span-full text-xs text-slate-500">No tiles — use Customize to add some.</div>
          )}
        </div>
      )}

      {/* Charts (role picks, SPEC-M16 §3.4) */}
      <div className="grid lg:grid-cols-2 gap-4">
        {charts.includes('chain') && (
          <Card className="p-4" data-testid="dashboard-chain-chart">
            <h3 className="text-sm font-semibold mb-3">Order Chain Funnel <span className="text-xs font-normal text-slate-500">(open orders per stage)</span></h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.chainFunnel} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="label" width={78} fontSize={11} />
                  <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                  <Bar dataKey="count" name="Orders" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {charts.includes('production') && (
          <Card className="p-4" data-testid="dashboard-production-chart">
            <h3 className="text-sm font-semibold mb-3">Production Trend <span className="text-xs font-normal text-slate-500">(pcs / day, 30 days)</span></h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshot.productionTrend} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} interval={4} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="pcs" name="Pcs" stroke="#0ea5e9" fill="#0ea5e922" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {charts.includes('cash') && (
          <Card className="p-4 lg:col-span-2" data-testid="dashboard-cash-chart">
            <h3 className="text-sm font-semibold mb-3">Cash Position <span className="text-xs font-normal text-slate-500">(invoiced vs received, 30 days)</span></h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={snapshot.cashTrend} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} interval={4} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="invoiced" name="Invoiced ₹" fill="#8b5cf655" radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="received" name="Received ₹" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Recent lists (role picks) */}
      {recentPicks.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          {recentPicks.includes('orders') && <RecentList title="Recent Orders" rows={snapshot.recent.orders} emptyText="No orders yet" />}
          {recentPicks.includes('pos') && <RecentList title="Recent Purchase Orders" rows={snapshot.recent.pos} emptyText="No POs yet" />}
          {recentPicks.includes('cuts') && <RecentList title="Cut Orders" rows={snapshot.recent.cuts} emptyText="No cut orders" />}
          {recentPicks.includes('invoices') && <RecentList title="Recent Invoices" rows={snapshot.recent.invoices} emptyText="No invoices" />}
        </div>
      )}
    </div>
  )
}

function KpiTile({ tile }: { tile: DashboardSnapshot['tiles'][number] }) {
  const Icon = ICONS[tile.icon] ?? Package
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-700',
    teal: 'from-teal-500 to-teal-700',
    slate: 'from-slate-500 to-slate-700',
    rose: 'from-rose-500 to-rose-700',
    violet: 'from-violet-500 to-violet-700',
  }
  return (
    <Link
      href={tile.href}
      className={`bg-gradient-to-br ${colorMap[tile.color]} text-white rounded-lg p-3 hover:opacity-90 transition-opacity block`}
      data-testid={`dashboard-tile-${tile.id}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 opacity-80" />
        <span className="text-[10px] uppercase tracking-wider opacity-80">{tile.label}</span>
      </div>
      <div className="text-2xl font-bold mt-2">{tile.value}</div>
    </Link>
  )
}

function RecentList({ title, rows, emptyText }: { title: string; rows: DashboardSnapshot['recent']['orders']; emptyText: string }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <Link key={r.href + r.docNo} href={r.href} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 hover:bg-slate-50">
            <div className="min-w-0">
              <div className="font-mono font-semibold truncate">{r.docNo}</div>
              <div className="text-xs text-slate-500 truncate">{r.meta}</div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="text-xs">{r.right}</div>
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
            </div>
          </Link>
        ))}
        {rows.length === 0 && <div className="text-xs text-slate-500">{emptyText}</div>}
      </div>
    </Card>
  )
}
