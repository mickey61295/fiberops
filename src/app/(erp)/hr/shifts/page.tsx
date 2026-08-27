/**
 * /hr/shifts — Shifts & Hours (SPEC-M5 §7-D-32, MT archetype; legacy
 * frmHours / FrmHourlySetting1). The masters engine renders the Shift
 * master (§9: routed here, NOT /masters/shift; the master hub card links
 * it). Both doors hit planMasterCreate/Update (ADR-001) — the same services
 * as create_shift / update_shift.
 */
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { shiftConfig } from '@/lib/erp/master-configs/shift'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function ShiftsPage() {
  const rows = await listMasters(shiftConfig)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/hr" className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700">
          <ChevronLeft className="h-4 w-4" /> HR &amp; Payroll
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-semibold">{shiftConfig.label}</h1>
        <span className="font-mono text-xs text-slate-400">
          {shiftConfig.createTool} · {shiftConfig.updateTool} · {shiftConfig.listTool}
        </span>
      </div>
      <MasterTable config={shiftConfig} rows={rows} />
    </div>
  )
}
