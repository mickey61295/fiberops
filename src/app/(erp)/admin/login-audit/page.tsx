/**
 * /admin/login-audit — the login/session audit register (SPEC-M60 FR-A7):
 * every auth event from both doors, with the event filter + search + csv
 * (the /admin/audit pattern). ADMIN ROLE door. Extra: a server-computed
 * "currently locked" strip — recent fails grouped by email, assessed with
 * the SAME assessLockout the login route uses, each with a client Clear
 * button (/api/auth/admin/clear-lockout).
 */
import { ShieldAlert } from 'lucide-react'
import { db } from '@/lib/db'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'
import { getSessionUser } from '@/lib/auth/current-user'
import { assessLockout, LOCKOUT_HORIZON_MS } from '@/lib/auth/security'
import { ClearLockoutButton } from './clear-lockout'

export const dynamic = 'force-dynamic'

export default async function LoginAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== 'admin') {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
        <h1 className="mt-3 text-lg font-bold">Admin role required</h1>
        <p className="mt-1 text-sm text-slate-500">
          The login audit is an admin surface — it records every auth event from both doors.
        </p>
      </div>
    )
  }

  // The currently-locked strip (SPEC-M60 §2): the same assessLockout the
  // login route applies, computed over the last hour's fails per email.
  const since = new Date(Date.now() - LOCKOUT_HORIZON_MS)
  const recent = await db.loginAttempt.findMany({
    where: { outcome: 'fail', at: { gte: since } },
    select: { email: true, at: true },
    orderBy: { at: 'desc' },
  })
  const byEmail = new Map<string, { outcome: string; at: Date }[]>()
  for (const r of recent) {
    const list = byEmail.get(r.email) ?? []
    list.push({ outcome: 'fail', at: r.at })
    byEmail.set(r.email, list)
  }
  const locked = [...byEmail.entries()]
    .map(([email, fails]) => ({ email, lock: assessLockout(fails, new Date()) }))
    .filter((e) => e.lock.locked)

  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('login-audit')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['login-audit'](query)
  const { page: _p, ...rest } = params
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-800">
          Currently locked ({locked.length}) — the lockout ledger (SPEC-M60 FR-A6: 5 fails in 15 min → 30-min lock)
        </p>
        {locked.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">No emails are locked right now.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {locked.map((e) => (
              <li key={e.email} className="flex items-center gap-2 text-xs text-amber-900">
                <span className="font-mono">{e.email}</span>
                <span>· {Math.max(1, Math.ceil(e.lock.remainingMs / 60000))} min left</span>
                <ClearLockoutButton email={e.email} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <RegisterScreen
        config={config}
        result={result}
        route="/admin/login-audit"
        groupLabel="Admin"
        groupHref="/admin"
        params={rest}
        page={query.page}
        limit={query.limit}
      />
    </div>
  )
}
