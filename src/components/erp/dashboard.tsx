'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Package, ShoppingCart, Boxes, Scissors, FileText, GitBranch, IndianRupee, Factory } from 'lucide-react'
import type { ViewKey } from '@/app/page'
import { toast } from 'sonner'

interface DashboardProps {
  onNavigate: (v: ViewKey) => void
}

interface KpiData {
  kpis: {
    openOrders: number
    pendingPos: number
    stockValue: number
    todayPcs: number
    pendingApprovals: number
    openInvoices: number
  }
  recentOrders: any[]
  recentPos: any[]
  recentCuts: any[]
  recentInvoices: any[]
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/erp?resource=dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-slate-500">Loading dashboard...</div>
  if (!data) return <div className="text-sm text-red-600">Failed to load</div>

  const { kpis } = data

  const openAgent = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white border-slate-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-300 mb-1">Baalaji Garments · FY 26-27</div>
            <h2 className="text-2xl font-bold">Welcome to Fiberpro ERP</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-md">Modern web rebuild of the original VB.NET textile ERP, now with an AI agent harness that can drive the entire system through natural language.</p>
          </div>
          <Button onClick={openAgent} className="bg-emerald-500 hover:bg-emerald-400 text-white">
            <Sparkles className="h-4 w-4 mr-1" /> Open Agent (⌘K)
          </Button>
        </div>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiTile icon={Package} label="Open Orders" value={kpis.openOrders} color="emerald" onClick={() => onNavigate('orders')} />
        <KpiTile icon={ShoppingCart} label="Pending POs" value={kpis.pendingPos} color="amber" onClick={() => onNavigate('procurement')} />
        <KpiTile icon={Boxes} label="Stock Value" value={`₹${(kpis.stockValue / 100000).toFixed(1)}L`} color="teal" onClick={() => onNavigate('inventory')} />
        <KpiTile icon={Factory} label="Today Pcs" value={kpis.todayPcs} color="slate" onClick={() => onNavigate('production')} />
        <KpiTile icon={GitBranch} label="Pending Approvals" value={kpis.pendingApprovals} color="rose" onClick={() => onNavigate('workflow')} />
        <KpiTile icon={FileText} label="Open Invoices" value={kpis.openInvoices} color="violet" onClick={() => onNavigate('invoices')} />
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('orders')}>View all</Button>
          </div>
          <div className="space-y-2">
            {data.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <div className="font-mono font-semibold truncate">{o.orderNo}</div>
                  <div className="text-xs text-slate-500">{o.buyer?.name} · {o.style?.styleNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">{o.totalPcs} pcs</div>
                  <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                </div>
              </div>
            ))}
            {data.recentOrders.length === 0 && <div className="text-xs text-slate-500">No orders yet</div>}
          </div>
        </Card>

        {/* Recent POs */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Purchase Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('procurement')}>View all</Button>
          </div>
          <div className="space-y-2">
            {data.recentPos.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <div className="font-mono font-semibold truncate">{p.poNo} <span className="text-[10px] text-slate-500 uppercase">({p.poType})</span></div>
                  <div className="text-xs text-slate-500">{p.party?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">₹{p.totalValue.toLocaleString('en-IN')}</div>
                  <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                </div>
              </div>
            ))}
            {data.recentPos.length === 0 && <div className="text-xs text-slate-500">No POs yet</div>}
          </div>
        </Card>

        {/* Recent cuts */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Cut Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('cutting')}>View all</Button>
          </div>
          <div className="space-y-2">
            {data.recentCuts.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <div className="font-mono font-semibold truncate">{c.cutNo}</div>
                  <div className="text-xs text-slate-500">{c.order?.orderNo} · {c.order?.buyer?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">{c.totalPcs} pcs · {c.bundles?.length} bundles</div>
                  <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                </div>
              </div>
            ))}
            {data.recentCuts.length === 0 && <div className="text-xs text-slate-500">No cut orders</div>}
          </div>
        </Card>

        {/* Recent invoices */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Invoices</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('invoices')}>View all</Button>
          </div>
          <div className="space-y-2">
            {data.recentInvoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <div className="font-mono font-semibold truncate">{i.invoiceNo}</div>
                  <div className="text-xs text-slate-500">{i.party?.name} · {i.order?.orderNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">₹{i.billAmount.toLocaleString('en-IN')}</div>
                  <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                </div>
              </div>
            ))}
            {data.recentInvoices.length === 0 && <div className="text-xs text-slate-500">No invoices</div>}
          </div>
        </Card>
      </div>

      {/* Agent callouts */}
      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-emerald-900">Try the AI Agent</h3>
            <p className="text-xs text-emerald-800 mt-1">Press <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded text-[10px] font-mono">⌘K</kbd> or click the Agent button. Ask it to:</p>
            <ul className="mt-2 text-xs text-emerald-800 space-y-1">
              <li>· "Create a sales order for buyer B001 for 5000 pcs of S-1001 in red/M=1000..."</li>
              <li>· "List open purchase orders"</li>
              <li>· "Receive GRN against PO-F-001 for 300 kg into G1"</li>
              <li>· "Approve the pending yarn PO"</li>
              <li>· "Show me budget vs actual for SO-1001"</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

function KpiTile({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: any; color: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-700',
    teal: 'from-teal-500 to-teal-700',
    slate: 'from-slate-500 to-slate-700',
    rose: 'from-rose-500 to-rose-700',
    violet: 'from-violet-500 to-violet-700',
  }
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color]} text-white rounded-lg p-3 text-left hover:opacity-90 transition-opacity`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 opacity-80" />
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </button>
  )
}
