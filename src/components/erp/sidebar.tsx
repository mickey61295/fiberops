'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, ShoppingCart, Boxes, Scissors,
  Factory, FileText, Calculator, Users, GitBranch, Database,
  Sparkles, RefreshCw, Shirt
} from 'lucide-react'
import type { ViewKey } from '@/app/page'

interface SidebarProps {
  view: ViewKey
  onView: (v: ViewKey) => void
  onSeed: () => void
}

const NAV: Array<{ key: ViewKey; label: string; icon: any; group?: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { key: 'orders', label: 'Orders / Sales', icon: Package, group: 'Operations' },
  { key: 'procurement', label: 'Procurement', icon: ShoppingCart, group: 'Operations' },
  { key: 'inventory', label: 'Inventory', icon: Boxes, group: 'Operations' },
  { key: 'cutting', label: 'Cutting', icon: Scissors, group: 'Production' },
  { key: 'production', label: 'Production', icon: Factory, group: 'Production' },
  { key: 'invoices', label: 'Invoices / GST', icon: FileText, group: 'Finance' },
  { key: 'costing', label: 'Costing / Budget', icon: Calculator, group: 'Finance' },
  { key: 'workflow', label: 'Approvals', icon: GitBranch, group: 'Admin' },
  { key: 'hr', label: 'HR / Payroll', icon: Users, group: 'Admin' },
  { key: 'masters', label: 'Masters', icon: Database, group: 'Admin' },
]

export function Sidebar({ view, onView, onSeed }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Shirt className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold tracking-tight">Fiberpro</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Garment ERP</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map((item, idx) => {
          const Icon = item.icon
          const showGroup = idx === 0 ? true : NAV[idx - 1].group !== item.group
          return (
            <div key={item.key}>
              {showGroup && (
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-2 pt-3 pb-1">
                  {item.group}
                </div>
              )}
              <button
                onClick={() => onView(item.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
                  view === item.key
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-2 space-y-1">
        <button
          onClick={onSeed}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Re-seed demo data</span>
        </button>
        <div className="px-2 pt-1 text-[10px] text-slate-500">
          FY 26-27 • Baalaji Garments
        </div>
      </div>
    </div>
  )
}
