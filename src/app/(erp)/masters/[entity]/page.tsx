/**
 * /masters/[entity] — MasterTable screen (SPEC-M2 §8.4).
 * Slug validated against the config registry; unknown → 404.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { MasterTable } from '@/components/archetypes/master-table'

export const dynamic = 'force-dynamic'

export default async function MasterEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { entity } = await params
  const config = getMasterConfig(entity)
  if (!config) notFound()

  const rows = await listMasters(config)
  // SPEC-M29 — ?q= lands the initial search (the palette's party door)
  const sp = searchParams ? await searchParams : {}
  const initialSearch = typeof sp.q === 'string' ? sp.q : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/masters" className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700">
          <ChevronLeft className="h-4 w-4" /> Masters
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-semibold">{config.label}</h1>
        <span className="text-xs text-slate-400 font-mono">
          {config.createTool} · {config.updateTool} · {config.listTool}
        </span>
      </div>
      <MasterTable config={config} rows={rows} initialSearch={initialSearch} />
    </div>
  )
}
