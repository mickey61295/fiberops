'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')

export function CostingView() {
  const [sheets, setSheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/erp?resource=costing')
      .then((r) => r.json())
      .then(setSheets)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading costing sheets...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Budget vs Actual via Agent
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sheets.map((c) => {
          const margin = c.sellingPrice - c.totalCost
          const marginPct = c.sellingPrice ? (margin / c.sellingPrice) * 100 : 0
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-slate-500">{c.order?.orderNo}</div>
                  <div className="text-sm font-bold">{c.order?.buyer?.name} · {c.order?.style?.styleNo}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">v{c.version}</Badge>
              </div>
              <div className="space-y-1.5 text-xs">
                <CostRow label="Fabric" value={c.fabricCost} />
                <CostRow label="Trims" value={c.trimCost} />
                <CostRow label="CMT (Cut-Make-Trim)" value={c.cmCost} />
                <CostRow label="Washing" value={c.washingCost} />
                <CostRow label="Packing" value={c.packingCost} />
                <CostRow label="Overheads" value={c.overheads} />
                <CostRow label={`Commission (${c.commissionPct}%)`} value={(c.sellingPrice * c.commissionPct) / 100} />
                <div className="border-t border-slate-200 my-2"></div>
                <CostRow label="Total Cost" value={c.totalCost} bold />
                <CostRow label="Selling Price" value={c.sellingPrice} bold />
                <CostRow label="Margin" value={margin} bold positive={margin > 0} />
                <div className="text-[10px] text-slate-500 text-right">Margin: {marginPct.toFixed(1)}%</div>
              </div>
            </Card>
          )
        })}
        {sheets.length === 0 && <div className="col-span-full text-center text-sm text-slate-500 py-12">No cost sheets</div>}
      </div>
    </div>
  )
}

function CostRow({ label, value, bold, positive }: { label: string; value: number; bold?: boolean; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className={positive ? 'text-emerald-700' : ''}>{fmtINR(value)}</span>
    </div>
  )
}
