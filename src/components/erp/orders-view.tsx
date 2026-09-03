'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Eye } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function OrdersView() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = () => {
    setLoading(true)
    fetch('/api/erp?resource=orders')
      .then((r) => r.json())
      .then(setOrders)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/set-state-in-effect

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  // View → the Order Hub (/orders/[id]) — the SAME detail surface the jump
  // bar, the dashboard recent-docs and the post-commit 'View document' link
  // land on. (The old inline detail card rendered ~11,000px below the fold
  // behind a 195-row table — the button looked dead.)
  const viewOrder = (id: string) => router.push(`/orders/${id}`)

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
                    <Button size="sm" variant="ghost" onClick={() => viewOrder(o.id)}><Eye className="h-3.5 w-3.5 mr-1" />View</Button>
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
    </div>
  )
}
