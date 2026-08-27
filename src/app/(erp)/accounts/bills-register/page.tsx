/**
 * /accounts/bills-register — Bills Register (SPEC-M4 §7 row 12; FrmBillsReg
 * family). Day-book: invoices + debit notes + payments; the dashboard "Open
 * Invoices" KPI tile deep-links here with ?status=issued (Wave C).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function BillsRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('bills-register')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['bills-register'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/bills-register"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
