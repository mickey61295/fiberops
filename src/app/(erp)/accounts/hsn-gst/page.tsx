/**
 * /accounts/hsn-gst — HSN / GST Setup (SPEC-M6 §2 row 34, legacy FrmHSN /
 * FrmHSNPce / FrmTally_GSTSetup). MasterTable over the ADR-016 Hsn master
 * (config + factory tools landed with Wave B). HSN codes + GST rates per
 * item — gst-summary and invoice tax lines key off these rates.
 */
import Link from 'next/link'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function HsnGstPage() {
  const config = getMasterConfig('hsn')!
  const rows = await listMasters(config)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/accounts" className="hover:text-slate-800 hover:underline">Accounts</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">HSN / GST Setup</span>
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
