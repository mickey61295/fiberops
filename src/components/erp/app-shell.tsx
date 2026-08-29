'use client'

/**
 * App shell (SPEC-M1 §7): sidebar (desktop + mobile Sheet), topbar,
 * keyed content area (remount on agent commit / manual refresh), parity footer,
 * and the global AgentPanelProvider. Mounted once by src/app/(erp)/layout.tsx.
 *
 * SPEC-M7 §4 (Wave C): allowedGroupIds (menu group ids from the fresh
 * UserGroup.rights derivation in the layout) filters the NavSidebar; the
 * admin role flag gates the destructive Seed button.
 *
 * P0-⑧ (GAP-ANALYSIS §7-G): the global `/` reflex — one keystroke lands the
 * cursor in the screen's search/filter box, the way legacy operators jump
 * straight into a lookup. Opt-in targets carry data-slash; fallback: the
 * first visible search-flavoured input. The full cmdk jump bar is M13.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NavSidebar } from '@/components/erp/nav-sidebar'
import { Topbar, type TopbarUser } from '@/components/erp/topbar'
import { ParityFooter } from '@/components/erp/parity-footer'
import { AgentPanelProvider } from '@/components/agent/agent-panel-provider'

export function AppShell({
  children,
  user,
  allowedGroupIds,
}: {
  children: ReactNode
  user?: TopbarUser
  allowedGroupIds?: string[]
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    router.refresh()
  }, [router])

  // P0-⑧ — `/` focuses the screen's search/filter input (never while typing
  // in another field, never with modifiers, never inside overlays).
  useEffect(() => {
    function isEditable(el: Element | null): boolean {
      return el instanceof HTMLElement && (
        el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
      )
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      if (isEditable(e.target instanceof Element ? e.target : null)) return
      const explicit = document.querySelector<HTMLInputElement>('input[data-slash]')
      const fallback = [...document.querySelectorAll('input[type="search"], input:not([type="hidden"])')]
        .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement)
        .find((el) => {
          if (el.type === 'hidden' || el.disabled || el.readOnly) return false
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return false
          const hint = `${el.placeholder} ${el.getAttribute('aria-label') ?? ''}`.toLowerCase()
          return hint.includes('search') || hint.includes('filter')
        })
      const target: HTMLInputElement | null | undefined = explicit ?? fallback
      if (target) {
        e.preventDefault()
        target.focus()
        target.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AgentPanelProvider onCommitted={refresh}>
      <div className="min-h-screen flex bg-slate-50 text-slate-900">
        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-slate-900">
            <NavSidebar onNavigate={() => setSidebarOpen(false)} allowedGroupIds={allowedGroupIds} isAdmin={user?.role === 'admin'} />
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-64 bg-slate-900 text-slate-100 flex-shrink-0">
          <NavSidebar allowedGroupIds={allowedGroupIds} isAdmin={user?.role === 'admin'} />
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0">
          <Topbar onMenu={() => setSidebarOpen(true)} onRefresh={refresh} user={user} />
          <div className="flex-1 overflow-auto p-4 md:p-6" key={refreshKey}>
            {children}
          </div>
          <ParityFooter />
        </main>
      </div>
    </AgentPanelProvider>
  )
}
