'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export function InvoicesView() {
  const [invs, setInvs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/erp?resource=invoices')
      .then((r) => r.json())
      .then(setInvs)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading invoices...</div>

  // GST summary
  const totalCgst = invs.reduce((s, i) => s + i.cgstAmt, 0)
  const totalSgst = invs.reduce((s, i) => s + i.sgstAmt, 0)
  const totalIgst = invs.reduce((s, i) => s + i.igstAmt, 0)
  const totalBilled = invs.reduce((s, i) => s + i.billAmount, 0)
  const totalTaxable = invs.reduce((s, i) => s + i.taxableValue, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Card className="p-3">
            <div className="text-slate-500">Taxable</div>
            <div className="font-bold text-sm">{fmtINR(totalTaxable)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-slate-500">CGST</div>
            <div className="font-bold text-sm">{fmtINR(totalCgst)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-slate-500">SGST</div>
            <div className="font-bold text-sm">{fmtINR(totalSgst)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-slate-500">IGST</div>
            <div className="font-bold text-sm">{fmtINR(totalIgst)}</div>
          </Card>
          <Card className="p-3 bg-emerald-50 border-emerald-200">
            <div className="text-emerald-700">Total Billed</div>
            <div className="font-bold text-sm">{fmtINR(totalBilled)}</div>
          </Card>
        </div>
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white ml-2">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Create via Agent
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Invoice No</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Party</th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Taxable</th>
                <th className="text-right px-3 py-2">CGST</th>
                <th className="text-right px-3 py-2">SGST</th>
                <th className="text-right px-3 py-2">IGST</th>
                <th className="text-right px-3 py-2">Bill Amt</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invs.map((i) => (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-semibold">{i.invoiceNo}</td>
                  <td className="px-3 py-2 uppercase text-xs">{i.invoiceType}</td>
                  <td className="px-3 py-2">{i.party?.name}</td>
                  <td className="px-3 py-2 font-mono">{i.order?.orderNo || '-'}</td>
                  <td className="px-3 py-2 text-right">{i.totalQty}</td>
                  <td className="px-3 py-2 text-right">{fmtINR(i.taxableValue)}</td>
                  <td className="px-3 py-2 text-right">{i.cgstAmt ? fmtINR(i.cgstAmt) : '-'}</td>
                  <td className="px-3 py-2 text-right">{i.sgstAmt ? fmtINR(i.sgstAmt) : '-'}</td>
                  <td className="px-3 py-2 text-right">{i.igstAmt ? fmtINR(i.igstAmt) : '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtINR(i.billAmount)}</td>
                  <td className="px-3 py-2">{fmtDate(i.invoiceDate)}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{i.status}</Badge></td>
                </tr>
              ))}
              {invs.length === 0 && <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500 text-sm">No invoices</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
