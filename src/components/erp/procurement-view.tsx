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

export function ProcurementView() {
  const [pos, setPos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = () => {
    setLoading(true)
    fetch('/api/erp?resource=purchase_orders')
      .then((r) => r.json())
      .then(setPos)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/set-state-in-effect

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  // View → the PO view page (/procurement/po/[id]) — the SAME detail surface
  // the register and the post-commit 'View document' link land on. (The old
  // inline detail card rendered below the fold behind the full PO table —
  // same looked-dead bug as the orders View.)
  const viewPo = (id: string) => router.push(`/procurement/po/${id}`)

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
                  <td className="px-2 py-2"><Button size="sm" variant="ghost" onClick={() => viewPo(p.id)}><Eye className="h-3.5 w-3.5 mr-1" />View</Button></td>
                </tr>
              ))}
              {pos.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500 text-sm">No POs</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
