/**
 * /admin/settings — Feature Flags (SPEC-M11 C2, SPEC-M9 §9-P1 item 2).
 * The operations surface over the LLD-07 flag registry (28 flags in
 * src/lib/erp/flags.ts — AppOption rows `flag:<name>`): grouped toggles with
 * per-flag effect notes, resets to registry defaults, and read-only drift
 * rows. Writes ride POST /api/config → setFlag (the sanctioned door; unknown
 * names are rejected server-side — registry drift-safe).
 *
 * Two-layer guard, same rule as /admin/users: the (erp) layout checks GROUP
 * rights (masters-admin) first; here the ROLE is checked — non-admins get
 * the notice card, admins get the board. The API re-checks the role on every
 * POST (the page guard is presentation, the route guard is the door).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { flagRegistry, getFlags } from '@/lib/erp/flags'
import { getSessionUser } from '@/lib/auth/current-user'
import { FlagsAdmin } from './flags-admin'

export const dynamic = 'force-dynamic'

export default async function SettingsFlagsPage() {
  const user = await getSessionUser()
  const isAdmin = user?.role === 'admin'

  let values: Record<string, unknown> = {}
  let unknown: { name: string; value: string }[] = []
  if (isAdmin) {
    const registry = flagRegistry()
    values = await getFlags()
    // Drift rows: flag:* AppOption keys that are NOT in the registry (e.g. an
    // agent update_app_option write). The engine ignores them on read; this
    // screen shows them read-only — visible, honest, immutable here.
    const rows = await db.appOption.findMany({
      where: { key: { startsWith: 'flag:' } },
      select: { key: true, value: true },
      orderBy: { key: 'asc' },
    })
    const known = new Set(registry.map((f) => f.name))
    unknown = rows
      .filter((r) => !known.has(r.key.slice('flag:'.length)))
      .map((r) => ({ name: r.key.slice('flag:'.length), value: r.value }))
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-800 hover:underline">Masters &amp; Admin</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Feature Flags</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          The LLD-07 operating switches (tolerances, commercial rules, company config) — the
          same values <span className="font-mono text-xs">tolerance.ts</span> and the posting
          tools enforce at run time. Changes take effect on the next document; the registry
          in <span className="font-mono text-xs">src/lib/erp/flags.ts</span> is the single
          source of truth — names outside it cannot be set.
        </p>
      </div>

      {isAdmin ? (
        <FlagsAdmin registry={flagRegistry()} values={values} unknown={unknown} />
      ) : (
        <div className="rounded-lg border bg-white p-4 shadow-sm space-y-1">
          <h2 className="text-sm font-semibold text-slate-800">Admin role required</h2>
          <p className="text-xs text-slate-500">
            Feature-flag values are administered by admin-role users only. Raw option rows
            (including <span className="font-mono text-xs">flag:*</span> keys) remain visible
            at <Link href="/admin/options" className="text-emerald-700 hover:underline">Options &amp; Settings</Link>.
          </p>
        </div>
      )}
    </div>
  )
}
