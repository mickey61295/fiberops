/**
 * /admin/menu-rights — Menu Rights matrix (SPEC-M6 §2 row 6, legacy
 * FrmMenuRights / FrmMenuAccRights). Rows = the 17 menu groups, cols = user
 * groups; writes UserGroup.rights via the update_user_group door.
 * Enforcement is LIVE since SPEC-M7 Wave C (sidebar filter + route checks).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { MENU_GROUPS } from '@/lib/erp/menu-registry'
import { RightsMatrix } from './rights-matrix'

export const dynamic = 'force-dynamic'

export default async function MenuRightsPage() {
  const groups = await db.userGroup.findMany({ orderBy: { name: 'asc' } })
  const userGroups = groups.map((g) => {
    const rights = Array.isArray(g.rights) ? (g.rights as string[]) : []
    return { name: g.name, rights }
  })

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-800 hover:underline">Masters &amp; Admin</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Menu Rights</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Menu Rights</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Which menu groups each user group may see — the legacy FrmMenuRights matrix. Users are assigned to groups
          at <Link href="/admin/users?tab=users" className="text-emerald-700 hover:underline">/admin/users</Link>.
        </p>
      </div>

      <RightsMatrix
        menuGroups={MENU_GROUPS.map((g) => ({ id: g.id, label: g.label }))}
        userGroups={userGroups}
      />
    </div>
  )
}
