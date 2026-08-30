/** /hr/attendance — Attendance day-book register (SPEC-M20 §5, gap-audit
 *  Gap D closure). The READ surface; posting/correcting a day is the
 *  post_attendance agent tool (plan→approve→commit — the HR view's "Post
 *  Attendance via Agent" button finally has its backing). Default window =
 *  today; widen via From/To; status + employee/dept filters. */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('attendance')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['attendance'](query)
  const { page: _p, ...rest } = params

  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/hr/attendance"
      groupLabel="HR & Payroll"
      groupHref="/hr"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
