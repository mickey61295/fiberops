/**
 * /accounts/supplier-bills — Supplier Bill Register (SPEC-M4 §7 row 13;
 * FrmSupplierBillReg). GRN day-book; rows drill into the GRN view (W2).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function SupplierBillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('supplier-bills')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['supplier-bills'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/supplier-bills"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
