/**
 * /admin/audit — the audit-log viewer (SPEC-M9 §9 M15): every committed plan
 * (who, what, when, source) written by the engine-level runCommit executor.
 * ADMIN ROLE door (the /admin/users pattern — non-admins get the notice
 * card, zero rows). RegisterScreen over the audit-log read service.
 */
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'
import { getSessionUser } from '@/lib/auth/current-user'

export const dynamic = 'force-dynamic'

export default async function AuditPage({
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
          The audit log is an admin surface — it records every committed plan across both doors.
        </p>
      </div>
    )
  }

  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('audit-log')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['audit-log'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/admin/audit"
      groupLabel="Admin"
      groupHref="/admin/users"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
