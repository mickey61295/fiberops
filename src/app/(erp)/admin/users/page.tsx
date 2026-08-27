/**
 * /admin/users — Users & Groups (SPEC-M6 §2 row 5, legacy FrmMasuser +
 * FrmUserGroupMas). Two MasterTables (Users | Groups) via ?tab= — both ride
 * the master-configs engine + the SAME factory tools the agent uses.
 * Menu item `users-groups` LIVE. Auth itself is a non-goal (§3-1).
 */
import Link from 'next/link'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const tab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) ?? 'users'
  const userConfig = getMasterConfig('user')!
  const groupConfig = getMasterConfig('user-group')!
  const [userRows, groupRows] = await Promise.all([
    tab === 'users' ? listMasters(userConfig) : Promise.resolve([]),
    tab === 'groups' ? listMasters(groupConfig) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-800 hover:underline">Masters &amp; Admin</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Users &amp; Groups</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Users &amp; Groups</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          User logins and their groups. Login/auth is a non-goal (SPEC-M6 §3) — this manages the data the future
          auth layer reads. Menu visibility rules live at{' '}
          <Link href="/admin/menu-rights" className="text-emerald-700 hover:underline">Menu Rights</Link>.
        </p>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-2 print:hidden">
        <Link
          href="/admin/users?tab=users"
          className={`rounded-md px-3 py-1.5 text-sm border ${tab === 'users' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          Users
        </Link>
        <Link
          href="/admin/users?tab=groups"
          className={`rounded-md px-3 py-1.5 text-sm border ${tab === 'groups' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          User Groups
        </Link>
      </div>

      {tab === 'users' ? (
        <MasterTable config={userConfig} rows={userRows} />
      ) : (
        <MasterTable config={groupConfig} rows={groupRows} />
      )}
    </div>
  )
}
