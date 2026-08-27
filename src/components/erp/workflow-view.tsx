'use client'

/**
 * Approval Inbox view — SPEC-M1 §9; SPEC-M5 §6 (Wave C) adds the kind layer.
 * `kind` filters the queue (=== Approval.entity; the registry lives in
 * src/lib/erp/approval-kinds.ts). Tabs navigate /approvals?kind=… (default:
 * all kinds). Each card shows the kind label + the underlying document summary
 * (entityData — never the raw object) and drills to the doc view via refHref.
 */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Check, X, Clock, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { APPROVAL_KINDS, findApprovalKind } from '@/lib/erp/approval-kinds'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

/** Card title per entity kind — always a STRING (never the entityData object). */
function cardTitle(a: any): string {
  const kind = findApprovalKind(a.entity)
  if (kind) {
    if (a.entity === 'supplier_bill' || a.entity === 'reprocess') return `${kind.label} · ${a.entityData?.grnNo ?? ''}`
    if (a.entity === 'godown_transfer') return `${kind.label} · ${a.entityId}`
    if (a.entity === 'non_return_dc') return `${kind.label} · ${a.entityData?.dcNo ?? a.entityId}`
  }
  if (a.entity === 'po') return `Purchase Order · ${a.entityData?.poNo ?? ''}`
  return a.entity
}

/** Detail rows per kind — every value is a primitive (object rendering is the M1 bug). */
function detailRows(a: any): Array<[string, string]> {
  const d = a.entityData
  if (!d) return []
  if (a.entity === 'supplier_bill' || a.entity === 'reprocess') {
    return [
      ['GRN', d.grnNo ?? '-'],
      ['Party', d.party?.name ?? '-'],
      ['Type', d.grnType ?? '-'],
      ['Qty', String(d.totalQty ?? '-')],
      ['Value', fmtINR(d.totalValue || 0)],
      ['Date', d.grnDate ? fmtDate(d.grnDate) : '-'],
    ]
  }
  if (a.entity === 'godown_transfer' && Array.isArray(d)) {
    const out = d.find((r: any) => r.outKgs > 0 || r.outPcs > 0)
    const inn = d.find((r: any) => r.inKgs > 0 || r.inPcs > 0)
    const qty = (out?.outKgs || inn?.inKgs || out?.outPcs || inn?.inPcs) ?? 0
    return [
      ['Transfer', a.entityId],
      ['Qty moved', String(qty)],
      ['Ledger rows', String(d.length)],
      ['Date', out?.docDate ? fmtDate(out.docDate) : '-'],
    ]
  }
  if (a.entity === 'non_return_dc' && !Array.isArray(d)) {
    return [
      ['DC No', d.dcNo ?? '-'],
      ['Pcs', String(d.totalPcs ?? '-')],
      ['Vehicle', d.vehicleNo || '-'],
      ['Courier', d.courierName || '-'],
      ['Date', d.despatchDate ? fmtDate(d.despatchDate) : '-'],
    ]
  }
  return []
}

export function WorkflowView({ kind }: { kind?: string }) {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch(`/api/erp?resource=approvals${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`)
      .then((r) => r.json())
      .then(setApprovals)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [kind]) // eslint-disable-line react-hooks/set-state-in-effect

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  const activeKind = kind ? findApprovalKind(kind) : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* kind filter tabs — SPEC-M5 §6 (default: all) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/approvals"
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${!kind ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
          >
            All
          </Link>
          {APPROVAL_KINDS.map((k) => (
            <Link
              key={k.entity}
              href={`/approvals?kind=${k.entity}`}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${kind === k.entity ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
            >
              {k.label}
            </Link>
          ))}
        </div>
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Approve via Agent
        </Button>
      </div>

      {activeKind && (
        <p className="text-sm text-slate-500">
          {activeKind.description} — raised by the posting hooks, approved via the <span className="font-mono text-xs">{activeKind.tool}</span> agent tool.
        </p>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading approvals...</div>
      ) : approvals.length === 0 ? (
        <Card className="p-12 text-center text-sm text-slate-500">
          No pending approvals{activeKind ? ` for ${activeKind.label}` : ''}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {approvals.map((a) => {
            const rows = detailRows(a)
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase">{cardTitle(a)}</div>
                      <div className="text-xs text-slate-500">Requested by {a.requestedBy} · {fmtDate(a.createdAt)}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Pending</Badge>
                </div>
                {a.entity === 'po' && a.entityData && (
                  <div className="mt-3 p-3 bg-slate-50 rounded text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">PO No</span><span className="font-mono">{a.entityData.poNo}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span>{a.entityData.party?.name ?? '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="uppercase">{a.entityData.poType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Qty</span><span>{a.entityData.totalQty}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Value</span><span className="font-semibold">{fmtINR(a.entityData.totalValue || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{a.entityData.deliveryDate ? fmtDate(a.entityData.deliveryDate) : '-'}</span></div>
                  </div>
                )}
                {rows.length > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 rounded text-xs space-y-1">
                    {rows.map(([label, value]) => (
                      <div key={label} className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openAgent}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={openAgent}>
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                  {a.refHref && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={a.refHref}><ExternalLink className="h-3.5 w-3.5 mr-1" /> View</Link>
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
