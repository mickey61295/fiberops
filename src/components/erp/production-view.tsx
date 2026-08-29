'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Factory } from 'lucide-react'
import { toast } from 'sonner'

const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function ProductionView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/erp?resource=production')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading production...</div>
  if (!data) return <div className="text-sm text-red-600">Failed</div>

  // Build WIP summary by department
  const deptWip: Record<string, number> = {}
  for (const e of data.entries) {
    const key = e.department?.name || 'unknown'
    deptWip[key] = (deptWip[key] || 0) + e.qty
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Post Production via Agent
        </Button>
      </div>

      {/* WIP summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.deptSummary.map((d: any) => (
          <Card key={d.id} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Factory className="h-3.5 w-3.5 text-slate-500" />
              <div className="text-xs font-semibold truncate">{d.name}</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{deptWip[d.name] || 0}</div>
            <div className="text-[10px] text-slate-500 uppercase">pcs produced</div>
          </Card>
        ))}
      </div>

      {/* Production entries */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">Dept</th>
                <th className="text-left px-3 py-2">Operator</th>
                <th className="text-left px-3 py-2">Bundle</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Rate</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Rework</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e: any) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">{fmtDate(e.prodDate)}</td>
                  <td className="px-3 py-2 font-mono">{e.order?.orderNo}</td>
                  <td className="px-3 py-2">{e.department?.name}</td>
                  <td className="px-3 py-2">{e.operator?.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.bundleNo}</td>
                  <td className="px-3 py-2 text-right">{e.qty}</td>
                  <td className="px-3 py-2 text-right">₹{e.rate}</td>
                  <td className="px-3 py-2 text-right">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2">{e.rework ? <Badge variant="outline" className="text-[10px] text-amber-700">Rework</Badge> : '-'}</td>
                </tr>
              ))}
              {data.entries.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500 text-sm">No production entries</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
