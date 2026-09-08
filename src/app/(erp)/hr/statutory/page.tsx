/**
 * /hr/statutory — Statutory register (SPEC-M47 L-03, Module L Batch 3).
 * Per committed payroll line: PF/ESI/PT/LWF legs (employee + employer),
 * deduction, net. `variant` = head filter; from/to window the run period.
 * The CSV twin is the per-head challan data export (UAN/esiNo + wage bases).
 * Rates are configured at /admin/statutory (AppOption `stat:*` registry).
 */
import Link from 'next/link'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function StatutoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('statutory')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['statutory'](query)
  const { page: _p, ...rest } = params
  return (
    <div className="space-y-4">
      <RegisterScreen
        config={config}
        result={result}
        route="/hr/statutory"
        groupLabel="HR & Payroll"
        groupHref="/hr"
        params={rest}
        page={query.page}
        limit={query.limit}
      />
      <div className="rounded-lg border bg-white p-4 text-xs text-slate-500 shadow-sm">
        <span className="font-semibold text-slate-700">Challan export:</span>{' '}
        use the CSV link above (add <span className="font-mono">?variant=pf|esi|pt|lwf</span> for one head — PF rows carry UAN + wage base + EE/ER/EPS/EDLI/admin, ESI rows carry the IP number). Employee deduction legs post at run
        commit (Dr Wage Payable / Cr head Payable); employer contributions are register data, posted manually when remitting.{' '}
        <Link href="/admin/statutory" className="font-medium text-blue-600 hover:underline">Configure rates →</Link>
      </div>
    </div>
  )
}
