'use client'

/**
 * Registry-driven navigation sidebar (SPEC-M1 §7).
 * 17 groups; active group expands to show its items with live/coming dots.
 * Derives 100% from src/lib/erp/menu-registry.ts — no hardcoded nav.
 */
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, ClipboardList, Workflow, ShoppingCart, Boxes, Scissors, Shirt,
  Factory, Handshake, Truck, Receipt, Calculator, Users, FlaskConical,
  CheckCircle2, BarChart3, Database, ChevronDown, Sparkles, RefreshCw, type LucideIcon,
} from 'lucide-react'
import {
  MENU_GROUPS, itemsByGroup, isLive, getHref, groupLandingHref,
  findGroupByRoutePrefix, findGroupByLanding, parityStats,
} from '@/lib/erp/menu-registry'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, ClipboardList, Workflow, ShoppingCart, Boxes, Scissors, Shirt,
  Factory, Handshake, Truck, Receipt, Calculator, Users, FlaskConical,
  CheckCircle2, BarChart3, Database,
}

export function NavSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const activeGroup =
    findGroupByLanding(pathname) ?? findGroupByRoutePrefix(pathname)
  const openGroup = expanded ?? activeGroup?.id ?? null

  const seedDatabase = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) toast.success('Database re-seeded with sample data')
      else toast.error('Seed failed: ' + (data.error || ''))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSeeding(false)
    }
  }

  const stats = parityStats()

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
      <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Main navigation">
        {MENU_GROUPS.map((group) => {
          const Icon = ICONS[group.icon] ?? Boxes
          const items = itemsByGroup(group.id)
          const liveCount = items.filter(isLive).length
          const isActive = activeGroup?.id === group.id
          const isOpen = openGroup === group.id
          const landing = groupLandingHref(group)
          const groupLive = landing === group.landingRoute // not redirected to /coming
          return (
            <div key={group.id} className="mb-0.5">
              <div className="flex items-center">
                <Link
                  href={landing}
                  onClick={onNavigate}
                  title={group.description}
                  className={cn(
                    'flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{group.label}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full',
                      groupLive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    )}
                    title={`${liveCount} of ${items.length} screens live`}
                  >
                    {liveCount}/{items.length}
                  </span>
                </Link>
                <button
                  onClick={() => setExpanded(isOpen ? null : group.id)}
                  aria-label={isOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
                  className="p-1 text-slate-500 hover:text-slate-200"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !isOpen && '-rotate-90')} />
                </button>
              </div>

              {isOpen && (
                <div className="ml-4 pl-3 border-l border-slate-800 py-1 space-y-0.5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={getHref(item)}
                      onClick={onNavigate}
                      title={item.description}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded text-[13px] transition-colors',
                        pathname === item.route || pathname === `/coming/${item.id}`
                          ? 'bg-slate-800/70 text-white'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          isLive(item) ? 'bg-emerald-400' : 'bg-slate-600'
                        )}
                        aria-label={isLive(item) ? 'live' : 'coming soon'}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer: parity + actions */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <Link
          href="/parity"
          onClick={onNavigate}
          className="block text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <span className="text-emerald-400 font-semibold">{stats.liveItems}</span> of{' '}
          {stats.totalItems} screens live · legacy coverage{' '}
          <span className="text-emerald-400 font-semibold">{stats.coveragePct}%</span>
          <span className="block text-[10px] text-slate-500">parity tracker →</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={seedDatabase}
          disabled={seeding}
          className="w-full justify-start text-slate-400 hover:text-white"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-2', seeding && 'animate-spin')} />
          {seeding ? 'Seeding…' : 'Seed demo data'}
        </Button>
      </div>
    </div>
  )
}

export { Sparkles }
