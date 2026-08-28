'use client'

/**
 * Topbar with registry-derived breadcrumbs (SPEC-M1 §7) + session user chip
 * and logout (SPEC-M7 §3 — Wave A).
 */
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, RefreshCw, Sparkles, ChevronRight } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-panel-provider'
import {
  findItemByRoute, findGroupForPath, findItemById, groupLandingHref, isLive,
} from '@/lib/erp/menu-registry'

export type TopbarUser = { name: string; email: string; role: string }

export function Topbar({
  onMenu,
  onRefresh,
  user,
}: {
  onMenu: () => void
  onRefresh: () => void
  user?: TopbarUser
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { openAgent } = useAgent()

  const group = findGroupForPath(pathname)
  let item = findItemByRoute(pathname)
  // coming pages: /coming/<id> → the registry item
  if (!item && pathname.startsWith('/coming/')) item = findItemById(pathname.slice('/coming/'.length))
  if (pathname === '/parity' || pathname === '/live') {
    // parity + live are utility pages; show under Home
  }

  const itemLabel =
    pathname === '/parity'
      ? 'Parity Tracker'
      : pathname === '/live'
        ? 'Live Tracker'
        : item?.label ?? (group && pathname === group.landingRoute ? 'Overview' : undefined)

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        {/* Breadcrumbs: group › item */}
        <nav className="flex items-center gap-1 text-sm min-w-0" aria-label="Breadcrumb">
          {group && (
            <>
              <Link href={groupLandingHref(group)} className="text-slate-500 hover:text-slate-900 truncate max-w-[160px]">
                {group.label}
              </Link>
              {itemLabel && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
            </>
          )}
          {itemLabel && (
            <span className="font-semibold text-slate-900 truncate">
              {itemLabel}
              {item && !isLive(item) && pathname.startsWith('/coming/') && (
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                  coming {item.phase}
                </span>
              )}
            </span>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 mr-1" title={user.email}>
            <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{user.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
              {user.role}
            </span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onRefresh} title="Refresh data">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => openAgent()}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
        >
          <Sparkles className="h-4 w-4 mr-1" />
          Agent <kbd className="ml-1 text-[10px] opacity-70">⌘K</kbd>
        </Button>
        {user && (
          <Button
            variant="ghost"
            size="sm"
            title={`Sign out (${user.email})`}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
              router.replace('/login')
              router.refresh()
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
