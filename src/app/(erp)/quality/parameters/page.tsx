/**
 * /quality/parameters — Test Parameters / Stages (SPEC-M6 §2 row 36, legacy
 * FrmLabTestParameters family). MasterTable over the ADR-016 TestParameter
 * master (config + factory tools landed with Wave B) — lab test parameters
 * and stage definitions; /quality/lab-tests entries reference these.
 */
import Link from 'next/link'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function TestParametersPage() {
  const config = getMasterConfig('test-parameter')!
  const rows = await listMasters(config)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/quality" className="hover:text-slate-800 hover:underline">Quality</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Test Parameters / Stages</span>
        </div>
        <h1 className="mt-1 text-lg font-semibold">{config.label}</h1>
        <span className="text-xs text-slate-400 font-mono">
          {config.createTool} · {config.updateTool} · {config.listTool}
        </span>
      </div>
      <MasterTable config={config} rows={rows} />
    </div>
  )
}
