import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/erp/app-shell'
import { getSessionUser } from '@/lib/auth/current-user'
import { computeAllowedGroupIds, firstAllowedLandingRoute } from '@/lib/auth/rights'
import { MENU_GROUPS, findGroupForPath } from '@/lib/erp/menu-registry'

/**
 * ERP route-group layout (SPEC-M1 §6): every routed page renders inside the
 * registry-driven shell. The route group adds NO url segment.
 *
 * SPEC-M7 §3 (Wave A): the layout is the SECOND guard layer — middleware
 * verifies the cookie edge-side; here the user row is re-checked (deleted /
 * deactivated mid-session → /login) and threaded into the shell for the
 * topbar user chip + logout.
 *
 * SPEC-M7 §4 (Wave C): rights enforcement, fresh layer. Allowed groups are
 * re-derived from the DB on every full load (UserGroup.rights; [] = all,
 * admin/no-group = all — ADR-018) and BOTH the sidebar is filtered AND the
 * route being rendered is re-checked against them (the middleware's
 * fo_rights pre-check may be stale; this one never is). The pathname arrives
 * via the x-pathname request header the middleware stamps.
 */
export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const allGroupIds = MENU_GROUPS.map((g) => g.id)
  const allowed = computeAllowedGroupIds({ role: user.role, rights: user.rights, allGroupIds })

  const pathname = (await headers()).get('x-pathname')
  if (pathname) {
    const group = findGroupForPath(pathname)
    if (group && !allowed.has(group.id)) {
      redirect(firstAllowedLandingRoute(allowed, MENU_GROUPS))
    }
  }

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      allowedGroupIds={[...allowed]}
    >
      {children}
    </AppShell>
  )
}
