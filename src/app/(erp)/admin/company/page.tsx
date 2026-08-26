/**
 * /admin/company — Company / FinYear screen (SPEC-M2 §8.5).
 * Single-company profile card (open decision #1: multi-company stays M6)
 * + the FinYear MasterTable. Marks menu item `company-finyear` LIVE.
 */
import Link from 'next/link'
import { Building2, CalendarRange } from 'lucide-react'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { db } from '@/lib/db'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function CompanyPage() {
  const finYearConfig = getMasterConfig('fin-year')!
  const rows = await listMasters(finYearConfig)
  const active = await db.finYear.findFirst({ where: { active: true } })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Company &amp; Financial Year</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Company profile and posting-year setup.
        </p>
      </div>

      {/* Single-company profile card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-start gap-3">
        <Building2 className="h-5 w-5 text-emerald-600 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium">Baalaji Export</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Single-company mode — multi-company (legacy <span className="font-mono">Coycode</span>) is deferred to M6
            (open decision #1, ADR-013). Exporter entities live at{' '}
            <Link href="/masters/exporter" className="underline hover:text-emerald-700">/masters/exporter</Link>.
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1">
            <CalendarRange className="h-3.5 w-3.5" />
            Current posting year:{' '}
            <span className="font-mono font-medium">{active ? `${active.code} (${active.name})` : 'none set'}</span>
          </div>
        </div>
      </div>

      {/* FinYear MasterTable */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Financial Years</h2>
        <MasterTable config={finYearConfig} rows={rows} />
      </div>
    </div>
  )
}
