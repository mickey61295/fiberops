/**
 * /admin/statutory — Statutory rates board (SPEC-M47 L-03). The owner
 * surface over the `stat:*` AppOption registry (src/lib/erp/statutory.ts):
 * PF/ESI/PT/LWF enable toggles + rate/threshold inputs, writes through the
 * server action → setStatutory (registry drift-safe, unknown names
 * rejected). Rates are consumed at payroll PLAN time and frozen onto lines.
 *
 * Two-layer guard, same rule as /admin/settings: the (erp) layout checks
 * GROUP rights (masters-admin) first; here the ROLE is checked — non-admins
 * get the notice card, admins get the board.
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { statRegistry, getStatutory } from '@/lib/erp/statutory'
import { getSessionUser } from '@/lib/auth/current-user'
import { StatutoryAdmin } from './statutory-admin'

export const dynamic = 'force-dynamic'

export default async function StatutoryRatesPage() {
  const user = await getSessionUser()
  const isAdmin = user?.role === 'admin'

  let values: Record<string, unknown> = {}
  let unknown: { name: string; value: string }[] = []
  if (isAdmin) {
    const registry = statRegistry()
    values = await getStatutory()
    // Drift rows: stat:* AppOption keys NOT in the registry (visible, honest,
    // immutable here — the engine ignores them on read).
    const rows = await db.appOption.findMany({
      where: { key: { startsWith: 'stat:' } },
      select: { key: true, value: true },
      orderBy: { key: 'asc' },
    })
    const known = new Set(registry.map((d) => d.name))
    unknown = rows.filter((r) => !known.has(r.key.slice('stat:'.length))).map((r) => ({ name: r.key.slice('stat:'.length), value: r.value }))
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-800 hover:underline">Masters &amp; Admin</Link>
          <span>/</span>
          <span>Statutory rates</span>
        </div>
        <h1 className="mt-1 text-lg font-semibold text-slate-800">Statutory payroll rates — PF / ESI / PT / LWF</h1>
        <p className="mt-1 max-w-3xl text-xs text-slate-500">
          Rates apply at payroll-run PLAN time and freeze onto the run&apos;s lines (a save never moves a drafted run). Employee legs post
          at commit (Dr Wage Payable / Cr head Payable — the party ledger still closes to 0 when the net is paid); employer legs are
          register/challan data. Statutory register: <Link href="/hr/statutory" className="font-medium text-blue-600 hover:underline">/hr/statutory</Link>.
        </p>
      </div>

      {isAdmin ? (
        <>
          <StatutoryAdmin registry={statRegistry()} values={values} />
          {unknown.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <div className="font-semibold">Drift rows (stat:* outside the registry — read-only)</div>
              <ul className="mt-1 list-inside list-disc">
                {unknown.map((r) => (<li key={r.name} className="font-mono">{r.name} = {r.value}</li>))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Admin role required — statutory rates are owner configuration. You are signed in as <span className="font-mono">{user?.email ?? 'unknown'}</span>.
        </div>
      )}
    </div>
  )
}
