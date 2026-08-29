/**
 * /cutting/register — cutting-register register (SPEC-M19 §2 Wave B). RegisterScreen over the
 * REGISTER_SERVICES['cutting-register'] read path — the SAME service the config's
 * agentTools chip cites (read-side ADR-001 twin).
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
  const config = getRegisterConfig('cutting-register')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['cutting-register'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/cutting/register"
      groupLabel="Cutting & Panels"
      groupHref="/cutting"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
