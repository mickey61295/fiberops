'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Scissors } from 'lucide-react'
import { toast } from 'sonner'

const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function CuttingView() {
  const [cuts, setCuts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/erp?resource=cutting')
      .then((r) => r.json())
      .then(setCuts)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading cut orders...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Create Cut Order via Agent
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuts.map((c) => (
          <Card key={c.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(c)}>
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-md bg-amber-100 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-amber-700" />
              </div>
              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
            </div>
            <div className="mt-3">
              <div className="font-mono font-bold text-sm">{c.cutNo}</div>
              <div className="text-xs text-slate-500">{c.order?.orderNo} · {c.order?.buyer?.name}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><div className="text-slate-400">Fabric Issued</div><div className="font-semibold">{c.fabricIssued} kg</div></div>
              <div><div className="text-slate-400">Total Pcs</div><div className="font-semibold">{c.totalPcs}</div></div>
              <div><div className="text-slate-400">Bundles</div><div className="font-semibold">{c.bundles?.length || 0}</div></div>
              <div><div className="text-slate-400">Efficiency</div><div className="font-semibold">{c.efficiency ? `${c.efficiency}%` : '-'}</div></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-3">{fmtDate(c.cutDate)}</div>
          </Card>
        ))}
        {cuts.length === 0 && <div className="col-span-full text-center text-sm text-slate-500 py-12">No cut orders. Use the Agent to create one.</div>}
      </div>

      {selected && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Cut Order: {selected.cutNo}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Cut Bundles (with barcodes)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {selected.bundles?.map((b: any) => (
              <div key={b.id} className="border border-slate-200 rounded p-2 bg-slate-50">
                <div className="font-mono font-bold text-[11px]">{b.bundleNo}</div>
                <div className="font-mono text-[10px] text-slate-600">{b.barcode}</div>
                <div className="text-[10px] mt-1">Qty: {b.qty} · {b.status}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
