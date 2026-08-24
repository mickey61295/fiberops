'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Boxes, History } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function InventoryView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'stock' | 'ledger'>('stock')

  useEffect(() => {
    fetch('/api/erp?resource=inventory')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-slate-500">Loading inventory...</div>
  if (!data) return <div className="text-sm text-red-600">Failed</div>

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

  const txnTypeColors: Record<string, string> = {
    opening: 'bg-slate-100 text-slate-700',
    purchase_grn: 'bg-emerald-100 text-emerald-700',
    process_delivery: 'bg-amber-100 text-amber-700',
    process_receipt: 'bg-emerald-100 text-emerald-700',
    sales_delivery: 'bg-rose-100 text-rose-700',
    sales_return: 'bg-emerald-100 text-emerald-700',
    transfer_in: 'bg-teal-100 text-teal-700',
    transfer_out: 'bg-teal-100 text-teal-700',
    stock_adjustment_add: 'bg-emerald-100 text-emerald-700',
    stock_adjustment_less: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'stock' ? 'default' : 'outline'} onClick={() => setTab('stock')}>
            <Boxes className="h-3.5 w-3.5 mr-1" /> Current Stock
          </Button>
          <Button size="sm" variant={tab === 'ledger' ? 'default' : 'outline'} onClick={() => setTab('ledger')}>
            <History className="h-3.5 w-3.5 mr-1" /> Ledger
          </Button>
        </div>
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Adjust via Agent
        </Button>
      </div>

      {tab === 'stock' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Item ID</th>
                  <th className="text-left px-3 py-2">Godown</th>
                  <th className="text-left px-3 py-2">Dept</th>
                  <th className="text-right px-3 py-2">Kgs</th>
                  <th className="text-right px-3 py-2">Mtrs</th>
                  <th className="text-right px-3 py-2">Pcs</th>
                  <th className="text-right px-3 py-2">Rate</th>
                  <th className="text-right px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.map((s: any, i: number) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 uppercase text-xs">{s.itemType}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.itemId}</td>
                    <td className="px-3 py-2">{s.godown?.code}</td>
                    <td className="px-3 py-2">{s.department?.code || '-'}</td>
                    <td className="px-3 py-2 text-right">{s.kgs || '-'}</td>
                    <td className="px-3 py-2 text-right">{s.mtrs || '-'}</td>
                    <td className="px-3 py-2 text-right">{s.pcs || '-'}</td>
                    <td className="px-3 py-2 text-right">₹{s.rate}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtINR((s.kgs + s.mtrs + s.pcs) * s.rate)}</td>
                  </tr>
                ))}
                {data.stocks.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500 text-sm">No stock</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Doc No</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-left px-3 py-2">Godown</th>
                  <th className="text-right px-3 py-2">In (kgs/pcs)</th>
                  <th className="text-right px-3 py-2">Out (kgs/pcs)</th>
                  <th className="text-left px-3 py-2">Party</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((l: any, i: number) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{fmtDate(l.docDate)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.docNo}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-[10px] ${txnTypeColors[l.txnType] || 'bg-slate-100'}`}>{l.txnType.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2 uppercase text-xs">{l.itemType}</td>
                    <td className="px-3 py-2">{l.godown?.code}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{l.inKgs || l.inPcs || '-'}</td>
                    <td className="px-3 py-2 text-right text-rose-700">{l.outKgs || l.outPcs || '-'}</td>
                    <td className="px-3 py-2">{l.party?.name || '-'}</td>
                  </tr>
                ))}
                {data.ledger.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500 text-sm">No ledger entries</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
