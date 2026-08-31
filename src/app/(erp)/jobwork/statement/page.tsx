/**
 * /jobwork/statement — Jobworker Material Statement (SPEC-M39 §1 JWL-07,
 * Phase-6B Batch 3). Per party × item: kgs out / in, loss %, WIP + aging from
 * the StockLedger process rows (both process doors carry partyId).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function JobworkerStatementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('jobworker-statement')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['jobworker-statement'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/jobwork/statement"
      groupLabel="Job Work"
      groupHref="/jobwork/order"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
