/**
 * Stock Register service — SPEC-M4 §5 row 6 (FrmStockRegister ×4).
 * CurrentStock + Godown grouped by variant: general (item × godown),
 * style (pcs per order), pcs (pcs detail per style × godown).
 * fetchCurrentStock is the VERBATIM get_stock query (same where/include) —
 * the agent tool delegates to it, json shape unchanged (§5 migration rule).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { buildItemCodeMaps } from './resolve'

/** The verbatim get_stock query — shared fetch, register groups on top. */
export async function fetchCurrentStock(opts: { itemType?: string; godown?: string }) {
  const where: any = {}
  if (opts.itemType) where.itemType = opts.itemType
  if (opts.godown) {
    const g = await db.godown.findUnique({ where: { code: opts.godown } })
    if (g) where.godownId = g.id
    else return null // unknown godown — caller degrades to empty
  }
  return db.currentStock.findMany({
    where,
    include: { godown: true, colour: true, size: true, department: true },
  })
}

export async function queryStockRegister(q: RegisterQuery): Promise<RegisterResult> {
  const variant = q.variant ?? 'general'
  const stocks = await fetchCurrentStock({ itemType: q.itemType, godown: q.godown })
  if (stocks === null) return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }

  // item code id-maps per itemType (PITFALLS #21 — pcs → style.styleNo)
  const byType: Record<string, Set<string>> = {}
  for (const s of stocks) (byType[s.itemType] ??= new Set()).add(s.itemId)
  const codeMaps = await buildItemCodeMaps(byType)
  // order id-map (style/pcs variants drill to the hub)
  const orderIds = [...new Set(stocks.map((s) => s.orderId).filter(Boolean) as string[])]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, include: { buyer: true } }) : []
  const orderMap = new Map(orders.map((o) => [o.id, o]))

  const groups = new Map<string, RegisterRow & { _value: number }>()
  for (const s of stocks) {
    const qty = s.kgs + s.mtrs + s.pcs
    const value = qty * s.rate
    let key: string
    let row: RegisterRow & { _value: number }
    if (variant === 'style') {
      if (s.itemType !== 'pcs') continue // style variant = pcs rollup per ORDER
      const o = s.orderId ? orderMap.get(s.orderId) : undefined
      key = `style:${s.orderId ?? s.itemId}`
      row = {
        id: key,
        href: s.orderId ? `/orders/${s.orderId}` : '/inventory/stock',
        itemType: 'pcs',
        itemCode: codeMaps['pcs']?.get(s.itemId) ?? s.itemId,
        orderNo: o?.orderNo ?? null,
        godown: '—',
        bags: 0, kgs: 0, mtrs: 0,
        pcs: s.pcs,
        _value: value,
      }
    } else if (variant === 'pcs') {
      if (s.itemType !== 'pcs') continue
      const o = s.orderId ? orderMap.get(s.orderId) : undefined
      key = `pcs:${s.itemId}:${s.godownId}:${s.orderId ?? ''}`
      row = {
        id: key,
        href: s.orderId ? `/orders/${s.orderId}` : '/inventory/stock',
        itemType: 'pcs',
        itemCode: codeMaps['pcs']?.get(s.itemId) ?? s.itemId,
        orderNo: o?.orderNo ?? null,
        godown: s.godown?.code ?? '—',
        bags: s.bags, kgs: 0, mtrs: 0,
        pcs: s.pcs,
        _value: value,
      }
    } else {
      key = `gen:${s.itemType}:${s.itemId}:${s.godownId}`
      row = {
        id: key,
        href: `/inventory/stock?itemType=${s.itemType}`,
        itemType: s.itemType,
        itemCode: codeMaps[s.itemType]?.get(s.itemId) ?? s.itemId,
        orderNo: null,
        godown: s.godown?.code ?? '—',
        bags: s.bags, kgs: s.kgs, mtrs: s.mtrs,
        pcs: s.pcs,
        _value: value,
      }
    }
    const acc = groups.get(key)
    if (acc) {
      acc.bags = (acc.bags as number) + (row.bags as number)
      acc.kgs = (acc.kgs as number) + (row.kgs as number)
      acc.mtrs = (acc.mtrs as number) + (row.mtrs as number)
      acc.pcs = (acc.pcs as number) + (row.pcs as number)
      acc._value += row._value
    } else {
      groups.set(key, row)
    }
  }

  const all = [...groups.values()].map(({ _value, ...r }) => ({ ...r, value: _value }))
  all.sort((a, b) => (b.value as number) - (a.value as number))
  const count = all.length
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)

  const sum = (k: 'bags' | 'kgs' | 'mtrs' | 'pcs' | 'value') => all.reduce((s, r) => s + (r[k] as number), 0)
  const totals = [
    { label: 'Rows', value: count },
    { label: 'Bags', value: sum('bags') },
    { label: 'Kgs', value: sum('kgs') },
    { label: 'Mtrs', value: sum('mtrs') },
    { label: 'Pcs', value: sum('pcs') },
    { label: 'Value', value: Math.round(sum('value')) },
  ].filter((x) => typeof x.value === 'number' ? x.value !== 0 || x.label === 'Rows' : true)

  return {
    rows,
    totals,
    summary: `${count} stock rows · ${variant} register · value ₹${Math.round(sum('value')).toLocaleString('en-IN')}`,
    count,
  }
}
