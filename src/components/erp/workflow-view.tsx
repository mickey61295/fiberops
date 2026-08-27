'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function WorkflowView() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/erp?resource=approvals')
      .then((r) => r.json())
      .then(setApprovals)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/set-state-in-effect

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading approvals...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Approve via Agent
        </Button>
      </div>

      {approvals.length === 0 ? (
        <Card className="p-12 text-center text-sm text-slate-500">
          No pending approvals
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {approvals.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase">{a.entity === 'po' ? `Purchase Order · ${a.entityData?.poNo ?? ''}` : a.entity}</div>
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
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openAgent}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={openAgent}>
                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
