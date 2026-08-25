'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Sidebar } from '@/components/erp/sidebar'
import { Dashboard } from '@/components/erp/dashboard'
import { OrdersView } from '@/components/erp/orders-view'
import { ProcurementView } from '@/components/erp/procurement-view'
import { InventoryView } from '@/components/erp/inventory-view'
import { CuttingView } from '@/components/erp/cutting-view'
import { ProductionView } from '@/components/erp/production-view'
import { InvoicesView } from '@/components/erp/invoices-view'
import { CostingView } from '@/components/erp/costing-view'
import { HrView } from '@/components/erp/hr-view'
import { WorkflowView } from '@/components/erp/workflow-view'
import { MastersView } from '@/components/erp/masters-view'
import { AgentPanel } from '@/components/agent/agent-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sparkles, Menu, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export type ViewKey =
  | 'dashboard' | 'orders' | 'procurement' | 'inventory' | 'cutting'
  | 'production' | 'invoices' | 'costing' | 'hr' | 'workflow' | 'masters'

export default function Home() {
  const [view, setView] = useState<ViewKey>('dashboard')
  const [agentOpen, setAgentOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Cmd+K to open agent
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAgentOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const seedDatabase = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('Database re-seeded with sample data')
        refresh()
      } else {
        toast.error('Seed failed: ' + (data.error || ''))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar - hidden on mobile, toggled by Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar
            view={view}
            onView={(v) => { setView(v); setSidebarOpen(false) }}
            onSeed={seedDatabase}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 bg-slate-900 text-slate-100 flex-shrink-0">
        <Sidebar
          view={view}
          onView={(v) => setView(v)}
          onSeed={seedDatabase}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold capitalize">
              {view.replace('_', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setAgentOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Agent <kbd className="ml-1 text-[10px] opacity-70">⌘K</kbd>
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6" key={refreshKey}>
          {view === 'dashboard' && <Dashboard onNavigate={setView} />}
          {view === 'orders' && <OrdersView />}
          {view === 'procurement' && <ProcurementView />}
          {view === 'inventory' && <InventoryView />}
          {view === 'cutting' && <CuttingView />}
          {view === 'production' && <ProductionView />}
          {view === 'invoices' && <InvoicesView />}
          {view === 'costing' && <CostingView />}
          {view === 'hr' && <HrView />}
          {view === 'workflow' && <WorkflowView />}
          {view === 'masters' && <MastersView />}
        </div>
      </main>

      {/* Agent Panel - right side sheet */}
      <AgentPanel open={agentOpen} onOpenChange={setAgentOpen} onCommitted={refresh} />
    </div>
  )
}
