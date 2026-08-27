/**
 * /admin/options — Options & Settings (SPEC-M6 §2 row 7, legacy frmOptions /
 * FrmOptionsPrint / frmDeptSettings). MasterTable over AppOption grouped by
 * the `group` column. The app READS print.* keys (report + doc print headers
 * via getPrintHeader) and default.godownCode — SPEC-M6 §5 honest wiring.
 */
import Link from 'next/link'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function OptionsPage() {
  const config = getMasterConfig('app-option')!
  const rows = await listMasters(config)
  const byGroup = new Map<string, typeof rows>()
  for (const r of rows) {
    const g = String((r as Record<string, unknown>).group ?? 'general')
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(r)
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-800 hover:underline">Masters &amp; Admin</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Options &amp; Settings</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Options &amp; Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Key-value app options. The app reads <span className="font-mono text-xs">print.companyName / print.address /
          print.gstin</span> (every report + doc print header) and{' '}
          <span className="font-mono text-xs">default.godownCode</span> (picker seed). Other keys are stored for the
          modules that will consume them.
        </p>
      </div>

      {(['print', 'defaults', 'general'] as const).map((g) => {
        const groupRows = byGroup.get(g) ?? []
        const label = g === 'print' ? 'Print Headers' : g === 'defaults' ? 'Defaults' : 'General'
        return (
          <div key={g} id={g}>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">
              {label} <span className="text-slate-400 font-normal">({groupRows.length})</span>
            </h2>
            <MasterTable config={config} rows={groupRows} />
          </div>
        )
      })}
    </div>
  )
}
