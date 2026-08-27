/**
 * Current Stock register service — SPEC-M6 §7-C-3 (the /inventory/stock
 * menu item; legacy live-stock views). Rows = CurrentStock buckets by item ×
 * godown with rate + value; fetchCurrentStock is the shared fetch (the
 * get_stock tool + stock registers use the same read path).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { fetchCurrentStock } from './stock-register'
import { buildItemCodeMaps } from './resolve'

export async function queryCurrentStock(q: RegisterQuery): Promise<RegisterResult> {
  const stocks = await fetchCurrentStock({ itemType: q.itemType, godown: q.godown })
  if (stocks === null) return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }

  const byType: Record<string, Set<string>> = {}
  for (const s of stocks) (byType[s.itemType] ??= new Set()).add(s.itemId)
  const codeMaps = await buildItemCodeMaps(byType)

  const groups = new Map<string, RegisterRow & { _value: number }>()
  for (const s of stocks) {
    const qty = s.itemType === 'pcs' ? s.pcs : s.itemType === 'fabric' ? s.mtrs : s.kgs
    const value = qty * s.rate
    const key = `${s.itemType}:${s.itemId}:${s.godownId}`
    const acc = groups.get(key)
    if (acc) {
      acc.bags = (acc.bags as number) + s.bags
      acc.kgs = (acc.kgs as number) + s.kgs
      acc.mtrs = (acc.mtrs as number) + s.mtrs
      acc.pcs = (acc.pcs as number) + s.pcs
      acc._value += value
    } else {
      groups.set(key, {
        id: key,
        itemType: s.itemType,
        itemCode: codeMaps[s.itemType]?.get(s.itemId) ?? s.itemId,
        godown: s.godown?.code ?? '—',
        bags: s.bags, kgs: s.kgs, mtrs: s.mtrs, pcs: s.pcs,
        rate: s.rate,
        _value: value,
      })
    }
  }
  const all = [...groups.values()].map(({ _value, ...r }) => ({ ...r, value: _value }))
  all.sort((a, b) => (b.value as number) - (a.value as number))
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: string) => all.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Rows', value: all.length },
      { label: 'Kgs', value: Math.round(sum('kgs')) },
      { label: 'Mtrs', value: Math.round(sum('mtrs')) },
      { label: 'Pcs', value: sum('pcs') },
      { label: 'Value', value: Math.round(sum('value')) },
    ],
    summary: `${all.length} stock rows · value ₹${Math.round(sum('value')).toLocaleString('en-IN')}`,
    count: all.length,
  }
}
