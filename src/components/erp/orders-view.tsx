'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function OrdersView() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/erp?resource=orders')
      .then((r) => r.json())
      .then(setOrders)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/set-state-in-effect

  const loadDetail = (id: string) => {
    setSelected(id)
    fetch(`/api/erp?resource=orders&id=${id}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch((e) => toast.error(e.message))
  }

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading orders...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Create via Agent
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Order No</th>
                <th className="text-left px-3 py-2">Buyer</th>
                <th className="text-left px-3 py-2">Style</th>
                <th className="text-right px-3 py-2">Pcs</th>
                <th className="text-right px-3 py-2">Value</th>
                <th className="text-left px-3 py-2">Order Date</th>
                <th className="text-left px-3 py-2">Delivery</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-semibold">{o.orderNo}</td>
                  <td className="px-3 py-2">{o.buyer?.name}</td>
                  <td className="px-3 py-2 font-mono">{o.style?.styleNo}</td>
                  <td className="px-3 py-2 text-right">{o.totalPcs.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right">{fmtINR(o.totalValue)}</td>
                  <td className="px-3 py-2">{fmtDate(o.orderDate)}</td>
                  <td className="px-3 py-2">{o.deliveryDate ? fmtDate(o.deliveryDate) : '-'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                  <td className="px-2 py-2">
                    <Button size="sm" variant="ghost" onClick={() => loadDetail(o.id)}>View</Button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500 text-sm">No orders. Use the Agent to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && detail && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Order Detail: {detail.orderNo}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Buyer</div>
              <div>{detail.buyer?.name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Style</div>
              <div className="font-mono">{detail.style?.styleNo} - {detail.style?.description}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total</div>
              <div>{detail.totalPcs} pcs · {fmtINR(detail.totalValue)}</div>
            </div>
          </div>
          {detail.lines?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Order Matrix (style × colour × size)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-1">Style</th>
                      <th className="text-left px-2 py-1">Colour</th>
                      <th className="text-left px-2 py-1">Size</th>
                      <th className="text-right px-2 py-1">Qty</th>
                      <th className="text-right px-2 py-1">Rate</th>
                      <th className="text-right px-2 py-1">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((l: any) => (
                      <tr key={l.id} className="border-t border-slate-100">
                        <td className="px-2 py-1 font-mono">{l.style?.styleNo}</td>
                        <td className="px-2 py-1">{l.colour?.name || '-'}</td>
                        <td className="px-2 py-1">{l.size?.name || '-'}</td>
                        <td className="px-2 py-1 text-right">{l.qty}</td>
                        <td className="px-2 py-1 text-right">₹{l.rate}</td>
                        <td className="px-2 py-1 text-right">₹{(l.qty * l.rate).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {detail.cutOrders?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Cut Orders</div>
              <div className="text-xs space-y-1">
                {detail.cutOrders.map((c: any) => (
                  <div key={c.id} className="flex justify-between">
                    <span className="font-mono">{c.cutNo}</span>
                    <span>{c.totalPcs} pcs · {c.bundles?.length} bundles · {c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {detail.productionEntries?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Recent Production</div>
              <div className="text-xs space-y-1">
                {detail.productionEntries.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{fmtDate(p.prodDate)} · {p.department?.name} · {p.operator?.name}</span>
                    <span>{p.qty} pcs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {detail.salesInvoices?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Invoices</div>
              <div className="text-xs space-y-1">
                {detail.salesInvoices.map((i: any) => (
                  <div key={i.id} className="flex justify-between">
                    <span className="font-mono">{i.invoiceNo}</span>
                    <span>{fmtINR(i.billAmount)} · {i.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {detail.costSheet?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Cost Sheet</div>
              <div className="text-xs">
                {detail.costSheet.map((c: any) => (
                  <div key={c.id} className="flex justify-between">
                    <span>v{c.version}</span>
                    <span>Cost ₹{c.totalCost.toLocaleString('en-IN')} · Sell ₹{c.sellingPrice.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
