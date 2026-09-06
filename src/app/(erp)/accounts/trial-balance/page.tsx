/**
 * /accounts/trial-balance — the trial balance (SPEC-M52 M-03). One row per
 * account with activity: Dr Σ, Cr Σ, net + side; the summary ASSERTS
 * Dr == Cr (structural — every journal row counts, all statuses; the contra
 * IS the GL's reversal). Unlinked rows are reported, never dropped. Same
 * service as the get_trial_balance tool; csv twin = the accountant's export.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('trial-balance')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['trial-balance'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/trial-balance"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
