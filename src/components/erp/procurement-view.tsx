'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function ProcurementView() {
  const [pos, setPos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/erp?resource=purchase_orders')
      .then((r) => r.json())
      .then(setPos)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/set-state-in-effect

  const openDetail = async (id: string) => {
    const r = await fetch(`/api/erp?resource=purchase_orders&id=${id}`)
    setSelected(await r.json())
  }

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading POs...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Create PO via Agent
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">PO No</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Supplier</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Value</th>
                <th className="text-left px-3 py-2">Order Date</th>
                <th className="text-left px-3 py-2">Delivery</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-semibold">{p.poNo}</td>
                  <td className="px-3 py-2 uppercase text-xs">{p.poType}</td>
                  <td className="px-3 py-2">{p.party?.name}</td>
                  <td className="px-3 py-2 text-right">{p.totalQty}</td>
                  <td className="px-3 py-2 text-right">{fmtINR(p.totalValue)}</td>
                  <td className="px-3 py-2">{fmtDate(p.orderDate)}</td>
                  <td className="px-3 py-2">{p.deliveryDate ? fmtDate(p.deliveryDate) : '-'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{p.status}</Badge></td>
                  <td className="px-2 py-2"><Button size="sm" variant="ghost" onClick={() => openDetail(p.id)}>View</Button></td>
                </tr>
              ))}
              {pos.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500 text-sm">No POs</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">PO Detail: {selected.poNo}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
            <div><div className="text-xs text-slate-500">Supplier</div><div>{selected.party?.name}</div></div>
            <div><div className="text-xs text-slate-500">Type</div><div className="uppercase">{selected.poType}</div></div>
            <div><div className="text-xs text-slate-500">Order Date</div><div>{fmtDate(selected.orderDate)}</div></div>
            <div><div className="text-xs text-slate-500">Delivery Date</div><div>{selected.deliveryDate ? fmtDate(selected.deliveryDate) : '-'}</div></div>
          </div>
          <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Lines</div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-2 py-1">Item Type</th>
                <th className="text-left px-2 py-1">Item ID</th>
                <th className="text-right px-2 py-1">Qty</th>
                <th className="text-right px-2 py-1">Received</th>
                <th className="text-right px-2 py-1">Rate</th>
                <th className="text-right px-2 py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {selected.lines?.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-2 py-1 uppercase">{l.itemType}</td>
                  <td className="px-2 py-1 font-mono">{l.itemId}</td>
                  <td className="px-2 py-1 text-right">{l.qty}</td>
                  <td className="px-2 py-1 text-right">{l.receivedQty}</td>
                  <td className="px-2 py-1 text-right">₹{l.rate}</td>
                  <td className="px-2 py-1 text-right">₹{l.amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected.grns?.length > 0 && (
            <div className="mt-4 text-xs">
              <div className="font-semibold uppercase text-slate-500 mb-2">GRNs Received</div>
              {selected.grns.map((g: any) => (
                <div key={g.id} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="font-mono">{g.grnNo}</span>
                  <span>{fmtDate(g.grnDate)} · {g.totalQty} units</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={openAgent}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Receive GRN via Agent
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
