/**
 * /hr/employees — Employees & Contractors (SPEC-M6 §2 row 35, legacy
 * FrmEmpmaster). ALIAS of the /masters/employee MasterTable — the [entity]
 * page is param-driven, so the alias re-renders the SAME config + engine
 * with the entity pinned (no duplicated logic; the order-enquiry precedent
 * re-exports because that page is searchParams-driven).
 */
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const config = getMasterConfig('employee')!
  const rows = await listMasters(config)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/hr" className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700">
          <ChevronLeft className="h-4 w-4" /> HR
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-semibold">{config.label}</h1>
        <span className="text-xs text-slate-400 font-mono">
          {config.createTool} · {config.updateTool} · {config.listTool}
        </span>
      </div>
      <MasterTable config={config} rows={rows} />
    </div>
  )
}
