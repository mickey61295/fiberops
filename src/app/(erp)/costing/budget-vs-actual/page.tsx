/**
 * /costing/budget-vs-actual — Budget vs Actual (SPEC-M4 §7 row 15;
 * FrmBudgetAndActualComp). Same math the get_budget_vs_actual tool froze.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function BudgetVsActualPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('budget-vs-actual')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['budget-vs-actual'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/costing/budget-vs-actual"
      groupLabel="Costing & Budgets"
      groupHref="/costing"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
