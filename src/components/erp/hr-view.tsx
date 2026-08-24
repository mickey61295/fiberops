'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const fmtINR = (n: number) => '₹' + (n || 0).toLocaleString('en-IN')

export function HrView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/erp?resource=hr')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading HR...</div>
  if (!data) return <div className="text-sm text-red-600">Failed</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Post Attendance via Agent
        </Button>
      </div>

      {/* Dept summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.depts.map((d: any) => {
          const count = data.emps.filter((e: any) => e.department?.id === d.id).length
          return (
            <Card key={d.id} className="p-3">
              <div className="text-xs font-semibold truncate">{d.name}</div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-[10px] text-slate-500 uppercase">{d.isProcess ? 'Process' : 'Production'}</div>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Dept</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-right px-3 py-2">Piece Rate</th>
                <th className="text-right px-3 py-2">Daily Wage</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.emps.map((e: any) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{e.code}</td>
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2">{e.department?.name}</td>
                  <td className="px-3 py-2 capitalize text-xs">{e.role}</td>
                  <td className="px-3 py-2 text-right">{e.pieceRate ? fmtINR(e.pieceRate) : '-'}</td>
                  <td className="px-3 py-2 text-right">{e.dailyWage ? fmtINR(e.dailyWage) : '-'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{e.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
