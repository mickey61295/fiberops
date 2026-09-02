/**
 * /hr/operator-statement — Operator Statement (SPEC-M45 L-01, Module L
 * Batch 1). Per operator: earned (piece-rate entries) − paid (wage payments
 * to the 1:1 employee-party) = owed. All-time by default; from/to window
 * both legs on their own date columns.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function OperatorStatementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('operator-statement')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['operator-statement'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/hr/operator-statement"
      groupLabel="HR"
      groupHref="/hr/attendance"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
