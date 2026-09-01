/**
 * /dispatch/register — despatch-register register (SPEC-M41 PRC-05).
 * RegisterScreen over the REGISTER_SERVICES['despatch-register'] read path —
 * the SAME service the config's agentTools chip cites (read-side ADR-001
 * twin). Day-book + aging + the PRC-07 gate-pass join.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('despatch-register')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['despatch-register'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/dispatch/register"
      groupLabel="Despatch & Logistics"
      groupHref="/dispatch"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
