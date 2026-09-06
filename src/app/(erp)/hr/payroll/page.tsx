/**
 * /hr/payroll — the payroll runs home (SPEC-M46 L-02). Register of runs
 * (PR-####, mode, period, earned/advances/net, draft|committed) + the create
 * door (mode + period — lines freeze at plan time). Same services as the
 * agent's create_payroll_run / commit_payroll_run tools.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'
import { PayrollForm } from './payroll-forms'
import { createPayrollRunAction } from './actions'
import { istTodayDate } from '@/lib/erp/dates'

export const dynamic = 'force-dynamic'

const monthStart = (today: Date) => {
  const d = new Date(today)
  d.setUTCDate(1)
  return d.toISOString().slice(0, 10)
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('payroll')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['payroll'](query)
  const { page: _p, ...rest } = params

  const today = istTodayDate()

  return (
    <div className="space-y-4">
      <RegisterScreen
        config={config}
        result={result}
        route="/hr/payroll"
        groupLabel="HR & Payroll"
        groupHref="/hr"
        params={rest}
        page={query.page}
        limit={query.limit}
      />

      <PayrollForm
        action={createPayrollRunAction}
        submitLabel="Create run"
        className="rounded-lg border bg-white shadow-sm"
        hint="Lines freeze at creation — commit on the run view posts the wage journals."
      >
        <div className="border-b p-4 text-sm font-semibold text-slate-700">Create a payroll run</div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500">Mode</label>
            <select name="mode" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" defaultValue="piece">
              <option value="piece">piece — Σ production-entry earnings</option>
              <option value="daily">daily — attendance × dailyWage</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">From</label>
              <input type="date" name="from" required defaultValue={monthStart(today)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">To</label>
              <input type="date" name="to" required defaultValue={today.toISOString().slice(0, 10)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">Notes (optional)</label>
            <input name="notes" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" placeholder="Aug month salary — cutting dept" />
          </div>
        </div>
      </PayrollForm>
    </div>
  )
}
