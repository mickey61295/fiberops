'use client'

/**
 * BOM card with inline line-grid editor (SPEC-M3 §8 BOM note) — hosted on the
 * Order Hub at #bom. Adds go through planBom (the agent's create_bom service —
 * ADR-001); removes are the documented single-door exception (actions.ts).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocPicker } from '@/components/erp/doc-picker'
import { addBomLineAction, removeBomLineAction } from '@/app/(erp)/orders/actions'

export interface BomDisplayLine {
  id: string
  itemType: string
  itemCode: string
  itemName: string
  qty: number
  uom: string
  rate: number
}

const ITEM_TYPES = [
  { value: 'yarn', label: 'Yarn', picker: 'yarn' },
  { value: 'fabric', label: 'Fabric', picker: 'fabric' },
  { value: 'accessory', label: 'Accessory', picker: 'accessory' },
]

export function BomCard({ styleNo, lines }: { styleNo: string; lines: BomDisplayLine[] }) {
  const router = useRouter()
  const [itemType, setItemType] = useState('yarn')
  const [itemCode, setItemCode] = useState('')
  const [qty, setQty] = useState('')
  const [rate, setRate] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const totalCost = lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const pickerSlug = ITEM_TYPES.find((t) => t.value === itemType)?.picker ?? 'yarn'

  async function addLine() {
    if (busy) return
    setBusy(true)
    setErrors([])
    try {
      const res = await addBomLineAction(
        styleNo,
        itemType,
        itemCode,
        Number(qty),
        rate.trim() === '' ? undefined : Number(rate),
      )
      if (res.ok) {
        toast.success(`BOM line added for ${styleNo}`)
        setItemCode('')
        setQty('')
        setRate('')
        router.refresh()
      } else {
        setErrors(res.errors)
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setBusy(false)
    }
  }

  async function removeLine(id: string) {
    setBusy(true)
    setErrors([])
    try {
      const res = await removeBomLineAction(id)
      if (res.ok) {
        toast.success('BOM line removed')
        router.refresh()
      } else {
        setErrors(res.errors)
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="bom" className="rounded-lg border border-slate-200 bg-white overflow-hidden scroll-mt-20">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold">Bill of Materials</h2>
        <span className="text-xs text-slate-400 font-mono">
          style {styleNo} · create_bom
        </span>
        <div className="flex-1" />
        {lines.length > 0 && (
          <span className="text-xs text-slate-500 tabular-nums">
            {lines.length} lines · ₹{totalCost.toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {lines.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Item</th>
              <th className="text-right px-3 py-2 font-medium">Qty</th>
              <th className="text-left px-3 py-2 font-medium">UoM</th>
              <th className="text-right px-3 py-2 font-medium">Rate</th>
              <th className="text-right px-3 py-2 font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2 capitalize">{l.itemType}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.itemCode} <span className="text-slate-400 font-sans">{l.itemName}</span></td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{l.uom || '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">₹{l.rate.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">₹{(l.qty * l.rate).toLocaleString('en-IN')}</td>
                <td className="px-2 py-2 text-center">
                  <button
                    onClick={() => removeLine(l.id)}
                    disabled={busy}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-40"
                    title="Remove line (single-door exception — see orders/actions.ts)"
                    aria-label="Remove BOM line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {lines.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-slate-500">
          No BOM yet — add the first component below (chain stage 2).
        </div>
      )}

      {/* inline add editor */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32 space-y-1">
            <Label className="text-xs font-medium">Type</Label>
            <Select value={itemType} onValueChange={(v) => { setItemType(v); setItemCode('') }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56 space-y-1">
            <Label className="text-xs font-medium">Item <span className="text-red-500">*</span></Label>
            <DocPicker
              inline
              slug={pickerSlug}
              value={itemCode}
              onChange={setItemCode}
              label="Item"
              placeholder="Search item…"
            />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs font-medium">Qty <span className="text-red-500">*</span></Label>
            <Input className="h-9" type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" aria-label="Quantity" />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs font-medium">Rate (₹)</Label>
            <Input className="h-9" type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="item rate" aria-label="Rate" />
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={addLine} disabled={busy || !itemCode || !qty}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />} Add line
          </Button>
        </div>
      </div>
    </section>
  )
}
