/**
 * /procurement/grn/[id] — GRN view (SPEC-M3 §8 row 5 view mode).
 * Resolves by db id OR grnNo. receivedQty maps from totalQty (the header-only
 * op's stored qty). PO link shown via the poNo field (text — services own
 * the PO resolution).
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { grnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5

export const dynamic = 'force-dynamic'

export default async function GrnViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { po: true, party: true, godown: true }
  let grn = await db.gRN.findUnique({ where: { id }, include }).catch(() => null)
  if (!grn) grn = await db.gRN.findUnique({ where: { grnNo: id }, include })
  if (!grn) notFound()

  // GRN.deptId carries NO relation (reconstructed schema) — resolve separately
  const dept = grn.deptId ? await db.department.findUnique({ where: { id: grn.deptId } }) : null

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    grnNo: grn.grnNo,
    poNo: grn.po?.poNo ?? '',
    godownCode: grn.godown?.code ?? '',
    partyDcRef: grn.partyDcRef ?? '',
    deptCode: dept?.code ?? '',
    receivedQty: grn.totalQty,
    grnDate: d(grn.grnDate),
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/procurement/grn" label="GRNs" title={grn.grnNo} />
        <DocPrintLink docType="grn" id={grn.grnNo} />
      </div>
      <DocScreen config={toScreenConfig(grnConfig)} mode="view" docNo={grn.grnNo} initial={initial} />
      {grn.po && (
        <div className="text-xs text-slate-500">
          Against PO{' '}
          <Link href={`/procurement/po/${grn.po.id}`} className="font-mono text-emerald-700 hover:underline">
            {grn.po.poNo}
          </Link>{' '}
          · party {grn.party?.name ?? '—'} · ₹{(grn.totalValue || 0).toLocaleString('en-IN')}
        </div>
      )}
    </div>
  )
}
