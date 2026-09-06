/**
 * /accounts/final-accounts — the minimal P&L + balance sheet (SPEC-M52
 * M-03), variant-switched. P&L: income − expenses = net. Balance sheet:
 * assets vs liabilities + equity + the window's P&L as retained earnings,
 * Δ asserted 0 (structural from Dr == Cr — the trial balance's own math).
 * Same service as the get_final_accounts tool.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function FinalAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('final-accounts')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['final-accounts'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/final-accounts"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
