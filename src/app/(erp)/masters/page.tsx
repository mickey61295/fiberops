/**
 * /masters — the MasterTable hub (SPEC-M2 §8.3).
 * Replaces the read-only 11-tab MastersView: 24 entity cards grouped by
 * category, each with a live row count, linking to /masters/<slug>.
 */
import Link from 'next/link'
import { ArrowRight, Database } from 'lucide-react'
import { MASTER_CATEGORIES, MASTER_CONFIGS, configsByCategory } from '@/lib/erp/master-configs'
import { countMasters } from '@/lib/erp/posting/master-service'

export const dynamic = 'force-dynamic'

export default async function MastersHubPage() {
  const counts = await Promise.all(
    MASTER_CONFIGS.map(async (c) => ({ slug: c.slug, n: await countMasters(c) })),
  )
  const countOf = (slug: string) => counts.find((c) => c.slug === slug)?.n ?? 0
  const total = counts.reduce((s, c) => s + c.n, 0)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-semibold">Masters</h1>
          <span className="text-xs text-slate-400 font-mono">
            {MASTER_CONFIGS.length} entities · {total} rows · one MasterTable engine
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Every entity is editable two ways — this form, or the agent ({' '}
          <span className="font-mono text-xs">create_* / update_* / list_*</span> tools run the same service).
        </p>
      </div>

      {MASTER_CATEGORIES.map((cat) => {
        const configs = configsByCategory(cat.key)
        if (configs.length === 0) return null
        return (
          <section key={cat.key} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-slate-700">{cat.label}</h2>
              <span className="text-xs text-slate-400">{cat.blurb}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {configs.map((c) => (
                <Link
                  key={c.slug}
                  href={`/masters/${c.slug}`}
                  className="group rounded-lg border border-slate-200 bg-white px-3.5 py-3 hover:border-emerald-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800 group-hover:text-emerald-700">{c.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono">{countOf(c.slug)} rows</span>
                    {c.codePrefix ? <span>· {c.codePrefix}####</span> : null}
                    {c.legacyForms.length > 0 ? (
                      <span title={c.legacyForms.join(', ')}>· {c.legacyForms.length} legacy forms</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}

      <p className="text-xs text-slate-400">
        Company / financial year screen: <Link href="/admin/company" className="underline hover:text-emerald-700">/admin/company</Link>.
        BOM lines are edited per-style (M3 DocScreen); until then the agent&apos;s{' '}
        <span className="font-mono">create_bom</span> tool covers it.
      </p>
    </div>
  )
}
