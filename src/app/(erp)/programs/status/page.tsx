/**
 * /programs/status — Program Status register (SPEC-M6 §2 row 11; legacy
 * ST_ProgBalance_* family). RegisterScreen over queryProgramStatus (the
 * get_program_status tool body, extracted — one service, two doors).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function ProgramStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('program-status')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['program-status'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/programs/status"
      groupLabel="Programs & Production"
      groupHref="/programs"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
