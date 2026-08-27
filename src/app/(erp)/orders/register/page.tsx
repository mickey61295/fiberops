/**
 * /orders/register — Order Register (SPEC-M4 §7 row 2, item 'order-register';
 * legacy FrmOrderReg family). RegisterScreen over queryOrderRegister — the
 * SAME read path list_orders delegates to. Every row drills into the Order
 * Hub (W2). The dashboard "Open Orders" KPI tile deep-links here with
 * ?status=open (Wave C wiring).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function OrderRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('order-register')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['order-register'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/orders/register"
      groupLabel="Orders & Sales"
      groupHref="/orders"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
