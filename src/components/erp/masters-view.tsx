'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export function MastersView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('parties')

  useEffect(() => {
    fetch('/api/erp?resource=masters')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAgent = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

  if (loading) return <div className="text-sm text-slate-500">Loading masters...</div>
  if (!data) return <div className="text-sm text-red-600">Failed</div>

  const tabs = [
    { key: 'parties', label: 'Parties', count: data.parties.length },
    { key: 'buyers', label: 'Buyers', count: data.buyers.length },
    { key: 'styles', label: 'Styles', count: data.styles.length },
    { key: 'fabrics', label: 'Fabrics', count: data.fabrics.length },
    { key: 'yarns', label: 'Yarns', count: data.yarns.length },
    { key: 'accessories', label: 'Accessories', count: data.accessories.length },
    { key: 'colours', label: 'Colours', count: data.colours.length },
    { key: 'sizes', label: 'Sizes', count: data.sizes.length },
    { key: 'godowns', label: 'Godowns', count: data.godowns.length },
    { key: 'depts', label: 'Departments', count: data.departments.length },
    { key: 'emps', label: 'Employees', count: data.employees.length },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAgent} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Create via Agent
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              tab === t.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label} <span className="ml-1 opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {tab === 'parties' && (
          <Table headers={['Code', 'Name', 'Type', 'GSTIN', 'City', 'State']} rows={data.parties.map((p: any) => [p.code, p.name, p.partyType, p.gstin || '-', p.city || '-', p.state || '-'])} />
        )}
        {tab === 'buyers' && (
          <Table headers={['Code', 'Name', 'Dept']} rows={data.buyers.map((b: any) => [b.code, b.name, b.dept || '-'])} />
        )}
        {tab === 'styles' && (
          <Table headers={['Style No', 'Description', 'Buyer', 'SAM', 'HSN']} rows={data.styles.map((s: any) => [s.styleNo, s.description, s.buyer?.name || '-', s.sam || '-', s.hsn || '-'])} />
        )}
        {tab === 'fabrics' && (
          <Table headers={['Code', 'Construction', 'GSM', 'Width', 'Dia', 'Rate']} rows={data.fabrics.map((f: any) => [f.code, f.construction || '-', f.gsm || '-', f.width || '-', f.dia?.value || '-', '₹' + f.rate])} />
        )}
        {tab === 'yarns' && (
          <Table headers={['Code', 'Count', 'Blend', 'Rate']} rows={data.yarns.map((y: any) => [y.code, y.count, y.blend || '-', '₹' + y.rate])} />
        )}
        {tab === 'accessories' && (
          <Table headers={['Code', 'Name', 'Category', 'Rate']} rows={data.accessories.map((a: any) => [a.code, a.name, a.category || '-', '₹' + a.rate])} />
        )}
        {tab === 'colours' && (
          <Table headers={['Name', 'Code']} rows={data.colours.map((c: any) => [c.name, c.code])} />
        )}
        {tab === 'sizes' && (
          <Table headers={['Name', 'Sort']} rows={data.sizes.map((s: any) => [s.name, s.sort])} />
        )}
        {tab === 'godowns' && (
          <Table headers={['Code', 'Name', 'Location']} rows={data.godowns.map((g: any) => [g.code, g.name, g.location || '-'])} />
        )}
        {tab === 'depts' && (
          <Table headers={['Code', 'Name', 'Order', 'Process?']} rows={data.departments.map((d: any) => [d.code, d.name, d.orderSno, d.isProcess ? 'Yes' : 'No'])} />
        )}
        {tab === 'emps' && (
          <Table headers={['Code', 'Name', 'Dept', 'Role', 'Piece Rate', 'Daily Wage']} rows={data.employees.map((e: any) => [e.code, e.name, e.department?.name || '-', e.role || '-', '₹' + (e.pieceRate || 0), '₹' + (e.dailyWage || 0)])} />
        )}
      </Card>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
          <tr>
            {headers.map((h, i) => <th key={i} className="text-left px-3 py-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
              {row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-slate-500 text-sm">No data</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
